import logging
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Protocol

from app.schemas.events import Event
from app.schemas.games import ParsedGame
from app.schemas.momentum import (
    MatchMomentumPayload,
    MatchMomentumPoint,
    MomentumEvent,
    MomentumTeam,
)
from app.state.game_state import GameStateCache

logger = logging.getLogger(__name__)

DEFAULT_XT_MODEL_PATH = (
    Path(__file__).resolve().parents[2] / "data" / "models" / "xthreat_model.json"
)
MOMENTUM_SOURCE = "socceraction_xT"


class XTValueProvider(Protocol):
    def score_bucket(
        self,
        events: list[MomentumEvent],
        home_team_id: str,
        away_team_id: str,
    ) -> tuple[float, float] | None:
        """Returns (home xT, away xT), or None when xT is unavailable."""


def _qualifiers_dict(event: Event) -> Dict[int, Any]:
    qualifiers: Dict[int, Any] = {}
    for qualifier in event.qualifiers:
        try:
            key = int(qualifier.qualifier_id)
        except (TypeError, ValueError):
            continue
        qualifiers[key] = qualifier.value
    return qualifiers


def _qualifier_float(qualifiers: Dict[int, Any], qualifier_id: int) -> Optional[float]:
    raw_value = qualifiers.get(qualifier_id)
    if raw_value is None or raw_value == "":
        return None
    try:
        return float(raw_value)
    except (TypeError, ValueError):
        return None


def normalize_event_for_momentum(match_id: str, event: Event) -> MomentumEvent:
    """
    Converts a parsed Opta event into the compact shape used by xT momentum.
    """
    qualifiers = _qualifiers_dict(event)
    stable_event_id = event.event_id or event.id
    return MomentumEvent(
        match_id=match_id,
        event_id=f"{event.team_id or '__match__'}:{stable_event_id}",
        period_id=event.period_id,
        minute=event.min,
        second=event.sec,
        team_id=event.team_id,
        player_id=event.player_id,
        type_id=event.type_id,
        type_name=(event.event_name or "").strip().lower(),
        outcome=event.outcome,
        start_x=event.x,
        start_y=event.y,
        end_x=_qualifier_float(qualifiers, 140),
        end_y=_qualifier_float(qualifiers, 141),
        qualifiers=qualifiers,
    )


class SoccerActionXTProvider:
    """
    Calculates xT with socceraction when the package and model are available.
    """

    def __init__(self, model_path: str | Path | None = None) -> None:
        configured_path = model_path or os.getenv("XTHREAT_MODEL_PATH")
        self.model_path = Path(configured_path) if configured_path else DEFAULT_XT_MODEL_PATH
        self._model = None
        self._warned_unavailable = False

    def score_bucket(
        self,
        events: list[MomentumEvent],
        home_team_id: str,
        away_team_id: str,
    ) -> tuple[float, float] | None:
        if not events:
            return 0.0, 0.0

        model = self._load_model()
        if model is None:
            return None

        try:
            import pandas as pd
            from socceraction.spadl import opta as opta_spadl
        except ImportError as exc:
            self._warn_once("socceraction is not available for xT momentum: %s", exc)
            return None

        rows = [self._to_opta_row(event) for event in events if self._can_value(event)]
        if not rows:
            return 0.0, 0.0

        try:
            opta_events = pd.DataFrame(rows)
            actions = opta_spadl.convert_to_actions(
                opta_events,
                home_team_id=int(home_team_id),
            )
            if actions.empty:
                return 0.0, 0.0

            values = model.rate(actions)
            valued_actions = actions.copy()
            valued_actions["xT_value"] = values
            valued_actions["xT_value"] = valued_actions["xT_value"].clip(lower=0).fillna(0)

            by_team = valued_actions.groupby("team_id")["xT_value"].sum()
            home_value = float(by_team.get(int(home_team_id), 0.0))
            away_value = float(by_team.get(int(away_team_id), 0.0))
            return round(home_value, 4), round(away_value, 4)
        except Exception as exc:
            logger.warning("Could not calculate socceraction xT momentum: %s", exc)
            return None

    def _load_model(self):
        if self._model is not None:
            return self._model

        if not self.model_path.exists():
            self._warn_once("xT model not found at %s; skipping momentum", self.model_path)
            return None

        try:
            from socceraction import xthreat

            self._model = xthreat.load_model(str(self.model_path))
            return self._model
        except ImportError as exc:
            self._warn_once("socceraction is not available for xT momentum: %s", exc)
            return None
        except Exception as exc:
            logger.warning("Could not load xT model from %s: %s", self.model_path, exc)
            return None

    def _warn_once(self, message: str, *args: object) -> None:
        if self._warned_unavailable:
            return
        logger.warning(message, *args)
        self._warned_unavailable = True

    @staticmethod
    def _can_value(event: MomentumEvent) -> bool:
        return all(
            value is not None
            for value in (
                event.minute,
                event.second,
                event.period_id,
                event.team_id,
                event.player_id,
                event.start_x,
                event.start_y,
                event.end_x,
                event.end_y,
            )
        )

    @staticmethod
    def _to_opta_row(event: MomentumEvent) -> Dict[str, Any]:
        return {
            "game_id": int(event.match_id),
            "event_id": event.event_id,
            "period_id": event.period_id,
            "minute": event.minute,
            "second": event.second or 0,
            "team_id": int(event.team_id) if event.team_id is not None else None,
            "player_id": int(event.player_id) if event.player_id is not None else None,
            "type_name": event.type_name,
            "outcome": bool(event.outcome),
            "start_x": event.start_x,
            "start_y": event.start_y,
            "end_x": event.end_x,
            "end_y": event.end_y,
            "qualifiers": event.qualifiers,
        }


class MatchMomentumService:
    """
    Maintains xT momentum points per match.

    Calculation buckets are 3 minutes wide. The trigger bucket is 2 minutes wide:
    new trigger buckets recalculate the current open 3-minute bucket and add any
    missing closed buckets. Later events in the current 3-minute bucket replace
    that bucket's point; previous buckets stay closed once the match advances.
    """

    def __init__(
        self,
        cache: GameStateCache,
        value_provider: Optional[XTValueProvider] = None,
        interval_minutes: int = 3,
        trigger_interval_minutes: int = 2,
    ) -> None:
        self._cache = cache
        self._value_provider = value_provider or SoccerActionXTProvider()
        self.interval_minutes = interval_minutes
        self.trigger_interval_minutes = trigger_interval_minutes

    def update(self, game: ParsedGame, events_changed: bool) -> List[Dict[str, Any]]:
        normalized_events = [
            normalize_event_for_momentum(game.game_id, event)
            for event in game.events
        ]
        cache_changed = self._cache.upsert_momentum_events(game.game_id, normalized_events)
        if not cache_changed and not events_changed:
            return []

        current_minute = self._latest_minute(
            self._cache.get_momentum_events(game.game_id)
        )
        if current_minute is None:
            return []

        trigger_bucket = self._bucket_minute(current_minute, self.trigger_interval_minutes)
        last_trigger_bucket = self._cache.get_momentum_trigger_bucket(game.game_id)
        current_bucket = self._bucket_minute(current_minute, self.interval_minutes)
        existing_payload = self._cache.get_momentum_payload(game.game_id)
        existing_current_point = self._find_point(existing_payload, current_bucket)

        should_recalculate = (
            last_trigger_bucket is None
            or trigger_bucket > last_trigger_bucket
            or ((cache_changed or events_changed) and existing_current_point is not None)
        )
        if not should_recalculate:
            return []

        payload = self._build_payload(game, current_bucket, existing_payload)
        if payload is None:
            return []

        self._cache.store_momentum_payload(game.game_id, payload)
        self._cache.store_momentum_trigger_bucket(game.game_id, trigger_bucket)
        return [
            {
                "type": "match_momentum_update",
                "game_id": game.game_id,
                "data": payload.model_dump(),
            }
        ]

    def _build_payload(
        self,
        game: ParsedGame,
        current_bucket: int,
        existing_payload: Optional[MatchMomentumPayload],
    ) -> Optional[MatchMomentumPayload]:
        cached_events = self._cache.get_momentum_events(game.game_id)
        points_by_minute = {
            point.minute: point
            for point in (existing_payload.points if existing_payload else [])
        }

        for bucket_start in range(0, current_bucket + 1, self.interval_minutes):
            is_current_bucket = bucket_start == current_bucket
            if bucket_start in points_by_minute and not is_current_bucket:
                continue

            point = self._calculate_bucket_point(
                cached_events,
                bucket_start,
                game.home_team.team_id,
                game.away_team.team_id,
            )
            if point is None:
                return existing_payload
            points_by_minute[bucket_start] = point

        return MatchMomentumPayload(
            matchId=game.game_id,
            source=MOMENTUM_SOURCE,
            intervalMinutes=self.interval_minutes,
            triggerIntervalMinutes=self.trigger_interval_minutes,
            homeTeam=MomentumTeam(
                id=game.home_team.team_id,
                name=game.home_team.team_name,
            ),
            awayTeam=MomentumTeam(
                id=game.away_team.team_id,
                name=game.away_team.team_name,
            ),
            points=[
                points_by_minute[minute]
                for minute in sorted(points_by_minute)
            ],
        )

    def _calculate_bucket_point(
        self,
        events: Iterable[MomentumEvent],
        bucket_start: int,
        home_team_id: str,
        away_team_id: str,
    ) -> Optional[MatchMomentumPoint]:
        bucket_events = [
            event
            for event in events
            if self._event_in_bucket(event, bucket_start)
        ]
        values = self._value_provider.score_bucket(
            bucket_events,
            home_team_id,
            away_team_id,
        )
        if values is None:
            return None

        home_value, away_value = values
        away_momentum = -away_value
        return MatchMomentumPoint(
            minute=bucket_start,
            homeValue=home_value,
            awayValue=away_value,
            homeMomentum=home_value,
            awayMomentum=away_momentum,
            netMomentum=round(home_value + away_momentum, 4),
        )

    def _event_in_bucket(self, event: MomentumEvent, bucket_start: int) -> bool:
        if event.minute is None:
            return False
        return bucket_start <= event.minute < bucket_start + self.interval_minutes

    @staticmethod
    def _latest_minute(events: Iterable[MomentumEvent]) -> Optional[int]:
        minutes = [event.minute for event in events if event.minute is not None]
        return max(minutes) if minutes else None

    @staticmethod
    def _find_point(
        payload: Optional[MatchMomentumPayload],
        minute: int,
    ) -> Optional[MatchMomentumPoint]:
        if payload is None:
            return None
        return next((point for point in payload.points if point.minute == minute), None)

    @staticmethod
    def _bucket_minute(minute: int, interval_minutes: int) -> int:
        bounded_minute = max(0, minute)
        return (bounded_minute // interval_minutes) * interval_minutes
