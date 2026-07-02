from fastapi import APIRouter, HTTPException, Request

from app.schemas.games import AvailableMatch
from app.services.events.constants import (
    MATCH_STATE_FIRST_PERIOD_ACTIVE,
    MATCH_STATE_FIRST_PERIOD_FINISHED,
    MATCH_STATE_MATCH_FINISHED,
    MATCH_STATE_PRE_MATCH,
    MATCH_STATE_SECOND_PERIOD_ACTIVE,
)
from app.services.games.catalog_service import MatchCatalogService
from app.state.game_state import GameStateCache

router = APIRouter()


_PROCESSED_MATCH_STATUS_TO_AVAILABLE_STATUS = {
    MATCH_STATE_PRE_MATCH: "scheduled",
    MATCH_STATE_FIRST_PERIOD_ACTIVE: "live",
    MATCH_STATE_FIRST_PERIOD_FINISHED: "paused",
    MATCH_STATE_SECOND_PERIOD_ACTIVE: "live",
    MATCH_STATE_MATCH_FINISHED: "finished",
}

_PERIOD_MINUTE_OFFSETS = {
    1: 0,
    2: 45,
    3: 90,
    4: 105,
    5: 120,
}


def _event_match_second(event: dict[str, object]) -> int | None:
    raw_minute = event.get("min")
    if raw_minute is None or raw_minute == "":
        return None

    try:
        minute = max(0, int(raw_minute))
        second = max(0, min(59, int(event.get("sec") or 0)))
        period_id = int(event.get("period_id") or 0)
    except (TypeError, ValueError):
        return None

    period_offset = _PERIOD_MINUTE_OFFSETS.get(period_id, 0)
    absolute_minute = minute if minute >= period_offset else period_offset + minute
    return absolute_minute * 60 + second


def _with_processed_match_statuses(
    matches: list[AvailableMatch],
    cache: GameStateCache,
) -> list[AvailableMatch]:
    """Overlay catalogue status and score with state inferred from F24 events."""
    enriched_matches: list[AvailableMatch] = []

    for match in matches:
        processed_state = cache.get_match_state(match.game_id)
        processed_events = cache.get_exported_events(match.game_id)
        updates: dict[str, object] = {
            "status": _PROCESSED_MATCH_STATUS_TO_AVAILABLE_STATUS.get(
                processed_state,
                match.status,
            )
        }

        if processed_state is not None or processed_events:
            home_score = 0
            away_score = 0
            latest_event_second: int | None = None

            for event in processed_events:
                event_second = _event_match_second(event)
                if event_second is not None:
                    latest_event_second = max(latest_event_second or 0, event_second)

                if str(event.get("type_id")) != "16":
                    continue

                team_id = str(event.get("team_id") or "")
                own_goal = event.get("own_goal") is True or str(
                    event.get("own_goal", "")
                ).lower() in {"1", "true", "yes"}

                if team_id == match.home_team.team_id:
                    if own_goal:
                        away_score += 1
                    else:
                        home_score += 1
                elif team_id == match.away_team.team_id:
                    if own_goal:
                        home_score += 1
                    else:
                        away_score += 1

            updates["home_team"] = match.home_team.model_copy(
                update={"score": home_score}
            )
            updates["away_team"] = match.away_team.model_copy(
                update={"score": away_score}
            )
            updates["current_minute"] = (
                latest_event_second // 60
                if latest_event_second is not None
                else None
            )

        enriched_matches.append(match.model_copy(update=updates))

    return enriched_matches


@router.get(
    "",
    response_model=list[AvailableMatch],
    summary="Selectable matches",
    response_description="Matches with status and score inferred from processed events.",
)
async def get_available_games(request: Request) -> list[AvailableMatch]:
    """Return selectable matches with their latest processed event state and score."""
    service: MatchCatalogService = request.app.state.match_catalog_service
    cache: GameStateCache = request.app.state.cache
    try:
        matches = service.get_available_matches()
        return _with_processed_match_statuses(matches, cache)
    except (OSError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to load the F42 match catalogue: {exc}",
        ) from exc
