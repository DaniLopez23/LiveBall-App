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
    Path(__file__).resolve().parents[3] / "data" / "models" / "xthreat_model.json"
)
MOMENTUM_SOURCE = "socceraction_xT"
FALLBACK_MOMENTUM_SOURCE = "heuristic_xT"
MOMENTUM_DECIMALS = 6
SHOT_TYPE_IDS = {"13", "14", "15", "16"}


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

    source = MOMENTUM_SOURCE

    def __init__(self, model_path: str | Path | None = None) -> None:
        configured_path = model_path or os.getenv("XTHREAT_MODEL_PATH")
        self.model_path = Path(configured_path) if configured_path else DEFAULT_XT_MODEL_PATH
        self._model = None
        self._warned_unavailable = False
        self.last_failure_reason: Optional[str] = None

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

        rows = [self._to_opta_row(event) for event in events if self._can_value(event)]
        home_shot_value, away_shot_value = self._score_shots(
            model,
            events,
            home_team_id,
            away_team_id,
        )
        if not rows:
            return (
                round(home_shot_value, MOMENTUM_DECIMALS),
                round(away_shot_value, MOMENTUM_DECIMALS),
            )

        try:
            import pandas as pd
            from socceraction.spadl import opta as opta_spadl
        except ImportError as exc:
            self.last_failure_reason = f"socceraction import failed: {exc}"
            self._warn_once("%s", self.last_failure_reason)
            return None

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
            home_value = float(by_team.get(int(home_team_id), 0.0)) + home_shot_value
            away_value = float(by_team.get(int(away_team_id), 0.0)) + away_shot_value
            return (
                round(home_value, MOMENTUM_DECIMALS),
                round(away_value, MOMENTUM_DECIMALS),
            )
        except Exception as exc:
            self.last_failure_reason = f"socceraction xT calculation failed: {exc}"
            logger.warning(self.last_failure_reason)
            return None

    def _load_model(self):
        if self._model is not None:
            return self._model

        if not self.model_path.exists():
            self.last_failure_reason = f"xT model not found at {self.model_path}"
            self._warn_once("%s", self.last_failure_reason)
            return None

        try:
            from socceraction import xthreat

            self._model = xthreat.load_model(str(self.model_path))
            self.last_failure_reason = None
            return self._model
        except ImportError as exc:
            self.last_failure_reason = f"socceraction import failed: {exc}"
            self._warn_once("%s", self.last_failure_reason)
            return None
        except Exception as exc:
            self.last_failure_reason = (
                f"could not load xT model from {self.model_path}: {exc}"
            )
            logger.warning(self.last_failure_reason)
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

    def _score_shots(
        self,
        model: Any,
        events: list[MomentumEvent],
        home_team_id: str,
        away_team_id: str,
    ) -> tuple[float, float]:
        home_value = 0.0
        away_value = 0.0

        for event in events:
            if event.type_id not in SHOT_TYPE_IDS:
                continue

            value = self._shot_threat(model, event, home_team_id)
            if value <= 0:
                continue

            if event.team_id == home_team_id:
                home_value += value
            elif event.team_id == away_team_id:
                away_value += value

        return home_value, away_value

    @staticmethod
    def _shot_threat(
        model: Any,
        event: MomentumEvent,
        home_team_id: str,
    ) -> float:
        if event.start_x is None or event.start_y is None or event.team_id is None:
            return 0.0

        grid = getattr(model, "xT", None)
        if grid is None:
            return 0.0

        try:
            height = len(grid)
            width = len(grid[0]) if height else 0
        except TypeError:
            return 0.0

        if height == 0 or width == 0:
            return 0.0

        x = min(max(event.start_x, 0.0), 99.999)
        y = min(max(event.start_y, 0.0), 99.999)
        if event.team_id != home_team_id:
            x = 100.0 - x
            y = 100.0 - y

        column = min(width - 1, max(0, int((x / 100.0) * width)))
        y_index = min(height - 1, max(0, int((y / 100.0) * height)))
        row = height - 1 - y_index
        return float(grid[row][column])


class HeuristicXTProvider:
    """
    Deterministic xT-like fallback used when socceraction or its model is absent.
    """

    source = FALLBACK_MOMENTUM_SOURCE

    def score_bucket(
        self,
        events: list[MomentumEvent],
        home_team_id: str,
        away_team_id: str,
    ) -> tuple[float, float]:
        home_value = 0.0
        away_value = 0.0

        for event in events:
            value = self._event_value(event)
            if value <= 0:
                continue

            if event.team_id == home_team_id:
                home_value += value
            elif event.team_id == away_team_id:
                away_value += value

        return (
            round(home_value, MOMENTUM_DECIMALS),
            round(away_value, MOMENTUM_DECIMALS),
        )

    def _event_value(self, event: MomentumEvent) -> float:
        if (
            event.type_id in SHOT_TYPE_IDS
            and event.start_x is not None
            and event.start_y is not None
        ):
            return self._threat(event.start_x, event.start_y)

        if event.outcome not in (None, 1, True):
            return 0.0

        if None in (event.start_x, event.start_y, event.end_x, event.end_y):
            return 0.0

        start_threat = self._threat(event.start_x, event.start_y)
        end_threat = self._threat(event.end_x, event.end_y)
        return max(0.0, end_threat - start_threat)

    @staticmethod
    def _threat(x: float, y: float) -> float:
        bounded_x = min(max(x, 0.0), 100.0) / 100.0
        bounded_y = min(max(y, 0.0), 100.0)
        centrality = 1 - abs(bounded_y - 50.0) / 50.0
        return (bounded_x ** 2.2) * (0.04 + 0.16 * centrality)


class DefaultXTValueProvider:
    """
    Uses socceraction when available and falls back to a local xT heuristic.
    """

    def __init__(
        self,
        primary: Optional[XTValueProvider] = None,
        fallback: Optional[XTValueProvider] = None,
    ) -> None:
        self.primary = primary or SoccerActionXTProvider()
        self.fallback = fallback or HeuristicXTProvider()
        self.source = getattr(self.primary, "source", MOMENTUM_SOURCE)
        self._warned_fallback = False

    def score_bucket(
        self,
        events: list[MomentumEvent],
        home_team_id: str,
        away_team_id: str,
    ) -> tuple[float, float] | None:
        primary_values = self.primary.score_bucket(events, home_team_id, away_team_id)
        if primary_values is not None:
            self.source = getattr(self.primary, "source", MOMENTUM_SOURCE)
            return primary_values

        if not self._warned_fallback:
            reason = getattr(self.primary, "last_failure_reason", None)
            detail = f": {reason}" if reason else ""
            logger.warning(
                "Falling back to heuristic xT momentum because socceraction xT is unavailable%s",
                detail,
            )
            self._warned_fallback = True

        fallback_values = self.fallback.score_bucket(events, home_team_id, away_team_id)
        self.source = getattr(self.fallback, "source", FALLBACK_MOMENTUM_SOURCE)
        return fallback_values


class MatchMomentumService:
    """
    Maintains xT momentum points per match.

    F24 events keep the cache warm, but websocket delivery is done through the
    stats payload so clients receive momentum with every ``match_stats_update``.
    """

    def __init__(
        self,
        cache: GameStateCache,
        value_provider: Optional[XTValueProvider] = None,
        interval_minutes: int = 1,
        trigger_interval_minutes: int = 1,
        window_minutes: int = 3,
    ) -> None:
        self._cache = cache
        self._value_provider = value_provider or DefaultXTValueProvider()
        self.interval_minutes = interval_minutes
        self.trigger_interval_minutes = trigger_interval_minutes
        self.window_minutes = max(1, window_minutes)

    def update(self, game: ParsedGame, events_changed: bool) -> List[Dict[str, Any]]:
        self.refresh_payload(game, force=events_changed)
        return []

    def refresh_payload(
        self,
        game: ParsedGame,
        force: bool = False,
        refresh_all_buckets: bool = False,
        until_minute: Optional[int] = None,
    ) -> Optional[MatchMomentumPayload]:
        normalized_events = [
            normalize_event_for_momentum(game.game_id, event)
            for event in game.events
        ]
        cache_changed = self._cache.upsert_momentum_events(game.game_id, normalized_events)
        existing_payload = self._cache.get_momentum_payload(game.game_id)
        if not cache_changed and not force:
            return existing_payload

        latest_event_minute = self._latest_minute(
            self._cache.get_momentum_events(game.game_id)
        )
        current_minute = self._target_minute(latest_event_minute, until_minute)
        if current_minute is None:
            return existing_payload

        current_bucket = self._bucket_minute(current_minute, self.interval_minutes)
        payload = self._build_payload(
            game,
            current_bucket,
            existing_payload,
            refresh_all_buckets=refresh_all_buckets,
        )
        if payload is None:
            return existing_payload

        self._cache.store_momentum_payload(game.game_id, payload)
        return payload

    def _build_payload(
        self,
        game: ParsedGame,
        current_bucket: int,
        existing_payload: Optional[MatchMomentumPayload],
        refresh_all_buckets: bool = False,
    ) -> Optional[MatchMomentumPayload]:
        cached_events = self._cache.get_momentum_events(game.game_id)
        points_by_minute = {
            point.minute: point
            for point in (existing_payload.points if existing_payload else [])
        }

        for bucket_start in range(0, current_bucket + 1, self.interval_minutes):
            is_current_bucket = bucket_start == current_bucket
            if (
                bucket_start in points_by_minute
                and not is_current_bucket
                and not refresh_all_buckets
            ):
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
            source=getattr(self._value_provider, "source", MOMENTUM_SOURCE),
            intervalMinutes=self.interval_minutes,
            triggerIntervalMinutes=self.trigger_interval_minutes,
            windowMinutes=self.window_minutes,
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
            netMomentum=round(home_value + away_momentum, MOMENTUM_DECIMALS),
        )

    def _event_in_bucket(self, event: MomentumEvent, bucket_start: int) -> bool:
        if event.minute is None:
            return False
        window_start = max(0, bucket_start - self.window_minutes + 1)
        return window_start <= event.minute <= bucket_start

    @staticmethod
    def _latest_minute(events: Iterable[MomentumEvent]) -> Optional[int]:
        minutes = [event.minute for event in events if event.minute is not None]
        return max(minutes) if minutes else None

    @staticmethod
    def _target_minute(
        latest_event_minute: Optional[int],
        until_minute: Optional[int],
    ) -> Optional[int]:
        minutes = [
            minute
            for minute in (latest_event_minute, until_minute)
            if minute is not None
        ]
        return max(minutes) if minutes else None

    @staticmethod
    def _bucket_minute(minute: int, interval_minutes: int) -> int:
        bounded_minute = max(0, minute)
        return (bounded_minute // interval_minutes) * interval_minutes
