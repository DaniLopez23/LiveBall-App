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


def _with_processed_match_statuses(
    matches: list[AvailableMatch],
    cache: GameStateCache,
) -> list[AvailableMatch]:
    """Overlay F42 catalogue statuses with the state inferred from F24 events."""
    return [
        match.model_copy(
            update={
                "status": _PROCESSED_MATCH_STATUS_TO_AVAILABLE_STATUS.get(
                    cache.get_match_state(match.game_id),
                    match.status,
                )
            }
        )
        for match in matches
    ]


@router.get(
    "",
    response_model=list[AvailableMatch],
    summary="Selectable matches",
    response_description="Matches from the F42 catalogue with status inferred from processed events.",
)
async def get_available_games(request: Request) -> list[AvailableMatch]:
    """Return selectable matches with their latest processed event state."""
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
