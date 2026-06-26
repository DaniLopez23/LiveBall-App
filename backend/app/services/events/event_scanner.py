import logging
from collections import defaultdict
from typing import Any, DefaultDict, Dict, List, Optional

from app.schemas.events import Event
from app.schemas.games import ParsedGame
from app.services.events.constants import (
    MATCH_STATE_FIRST_PERIOD_ACTIVE,
    MATCH_STATE_FIRST_PERIOD_FINISHED,
    MATCH_STATE_MATCH_FINISHED,
    MATCH_STATE_SECOND_PERIOD_ACTIVE,
)
from app.services.events.event_exporter import EventExporter
from app.services.events.models import EventScanResult
from app.state.game_state import GameStateCache

logger = logging.getLogger(__name__)


class EventScanner:
    """
    Single-pass event scanner.

    Responsibilities:
    - normalize away-team field coordinates for the event campogram
    - update match state
    - register every event by (team_id, event_id)
    - emit frontend payloads for exportable new/updated events
    - collect newly resolved successful passes for pass-network updates
    """

    def __init__(
        self,
        cache: GameStateCache,
        event_exporter: EventExporter,
    ) -> None:
        self._cache = cache
        self._event_exporter = event_exporter

    def scan(self, game: ParsedGame) -> EventScanResult:
        new_events_flat: List[Dict[str, Any]] = []
        updated_events_flat: List[Dict[str, Any]] = []
        deleted_events_flat: List[Dict[str, Any]] = []
        pass_candidates_by_team: DefaultDict[str, Dict[str, Event]] = defaultdict(dict)
        pass_deletions_by_team: DefaultDict[str, List[str]] = defaultdict(list)
        pending_successful_passes: Dict[str, Event] = {}
        has_event_changes = False

        game_id = game.game_id
        away_team_id = game.away_team.team_id
        current_match_state = self._cache.get_match_state(game_id)
        previous_event_keys = self._cache.get_event_keys(game_id)
        current_event_keys: set[tuple[str, str]] = set()

        for event in game.events:
            team_key, event_key = self._event_cache_key(event)
            current_event_keys.add((team_key, event_key))
            previous_type = self._cache.get_event_type(game_id, team_key, event_key)
            event_changed = previous_type is None or previous_type != event.type_id
            self._queue_pass_deletion_if_needed(
                game_id,
                event,
                pass_deletions_by_team,
            )

            if event_changed:
                current_match_state = self._update_match_state(
                    game_id,
                    event,
                    current_match_state,
                )

            self._normalize_away_coordinates(event, away_team_id)
            self._resolve_pending_pass(
                game_id,
                event,
                pending_successful_passes,
                pass_candidates_by_team,
            )

            if previous_type is None:
                self._cache.store_event_type(game_id, team_key, event_key, event.type_id)
                has_event_changes = True
                if self._event_exporter.should_export(event):
                    payload = self._event_exporter.to_payload(event, current_match_state)
                    self._cache.store_exported_event(game_id, team_key, event_key, payload)
                    new_events_flat.append(payload)
            elif previous_type != event.type_id:
                self._cache.store_event_type(game_id, team_key, event_key, event.type_id)
                has_event_changes = True
                if self._event_exporter.should_export(event):
                    payload = self._event_exporter.to_payload(event, current_match_state)
                    self._cache.store_exported_event(game_id, team_key, event_key, payload)
                    updated_events_flat.append(payload)

            if self._is_successful_pass_event(event):
                if event.player_receiver_id:
                    self._queue_pass_candidate(
                        game_id,
                        event,
                        pass_candidates_by_team,
                    )
                else:
                    pending_successful_passes[event.team_id] = event

        deleted_keys = previous_event_keys - current_event_keys
        self._queue_deleted_passes(
            game_id,
            deleted_keys,
            pass_deletions_by_team,
        )
        deleted_events_flat = self._delete_missing_events(
            game_id,
            previous_event_keys,
            current_event_keys,
        )
        if deleted_events_flat:
            has_event_changes = True

        return EventScanResult(
            messages=self._build_event_messages(
                game.game_id,
                new_events_flat,
                updated_events_flat,
                deleted_events_flat,
            ),
            pass_candidates_by_team={
                team_id: list(events_by_id.values())
                for team_id, events_by_id in pass_candidates_by_team.items()
            },
            pass_deletions_by_team=dict(pass_deletions_by_team),
            has_event_changes=has_event_changes,
        )

    @staticmethod
    def _event_cache_key(event: Event) -> tuple[str, str]:
        team_key = event.team_id or "__match__"
        event_key = event.event_id or event.id
        return team_key, event_key

    def _delete_missing_events(
        self,
        game_id: str,
        previous_event_keys: set[tuple[str, str]],
        current_event_keys: set[tuple[str, str]],
    ) -> List[Dict[str, Any]]:
        deleted_events: List[Dict[str, Any]] = []

        for team_key, event_key in sorted(previous_event_keys - current_event_keys):
            payload = self._cache.remove_event(game_id, team_key, event_key)
            deleted_event = {
                "team_id": None if team_key == "__match__" else team_key,
                "event_id": event_key,
            }
            if payload:
                deleted_event["id"] = payload.get("id") or event_key
                deleted_event["type_id"] = payload.get("type_id")
            deleted_events.append(deleted_event)

        return deleted_events

    @staticmethod
    def _is_successful_pass_event(event: Event) -> bool:
        return (
            event.type_id == "1"
            and event.outcome == 1
            and bool(event.team_id)
            and bool(event.player_id)
            and bool(event.event_id)
        )

    def _pass_already_processed(self, game_id: str, event: Event) -> bool:
        if not event.team_id or not event.event_id:
            return True

        service = self._cache.get_pass_network(game_id, event.team_id)
        return bool(service and service.has_processed_event(event.event_id))

    def _queue_pass_candidate(
        self,
        game_id: str,
        event: Event,
        by_team: DefaultDict[str, Dict[str, Event]],
    ) -> None:
        if (
            self._is_successful_pass_event(event)
            and event.player_receiver_id
        ):
            by_team[event.team_id][event.event_id] = event

    def _queue_pass_deletion_if_needed(
        self,
        game_id: str,
        event: Event,
        by_team: DefaultDict[str, List[str]],
    ) -> None:
        if not event.team_id or not event.event_id:
            return

        service = self._cache.get_pass_network(game_id, event.team_id)
        if not service or not service.has_processed_event(event.event_id):
            return

        is_pending_successful_pass = (
            event.type_id == "1"
            and event.outcome == 1
            and not event.player_receiver_id
        )
        if self._is_successful_pass_event(event) or is_pending_successful_pass:
            return

        by_team[event.team_id].append(event.event_id)

    def _queue_deleted_passes(
        self,
        game_id: str,
        deleted_keys: set[tuple[str, str]],
        by_team: DefaultDict[str, List[str]],
    ) -> None:
        for team_key, event_key in sorted(deleted_keys):
            if team_key == "__match__":
                continue

            service = self._cache.get_pass_network(game_id, team_key)
            if service and service.has_processed_event(event_key):
                by_team[team_key].append(event_key)

    def _resolve_pending_pass(
        self,
        game_id: str,
        event: Event,
        pending_successful_passes: Dict[str, Event],
        pass_candidates_by_team: DefaultDict[str, Dict[str, Event]],
    ) -> None:
        if not event.team_id or not event.player_id:
            return

        pending_pass = pending_successful_passes.get(event.team_id)
        if not pending_pass or pending_pass.event_id == event.event_id:
            return

        pending_pass.player_receiver_id = event.player_id
        self._queue_pass_candidate(game_id, pending_pass, pass_candidates_by_team)
        pending_successful_passes.pop(event.team_id, None)

    def _update_match_state(
        self,
        game_id: str,
        event: Event,
        current_state: Optional[str],
    ) -> Optional[str]:
        next_state = self._next_match_state(event, current_state)
        if next_state and next_state != current_state:
            self._cache.store_match_state(game_id, next_state)
            logger.info(
                "MATCH_STATUS game=%s status=%s detail=%s event=%s minute=%s period=%s",
                game_id,
                next_state,
                self._match_state_detail(next_state),
                event.event_id or event.id,
                event.min,
                event.period_id,
            )
            # logger.debug("(MATCH_STATUS) raw_event=%s", event.model_dump())
            return next_state
        return current_state

    @staticmethod
    def _next_match_state(event: Event, current_state: Optional[str]) -> Optional[str]:
        type_id = event.type_id
        period_id = event.period_id

        if type_id == "32" and period_id == 1:
            return MATCH_STATE_FIRST_PERIOD_ACTIVE

        if type_id == "30" and period_id == 1:
            return MATCH_STATE_FIRST_PERIOD_FINISHED

        if type_id == "32" and period_id == 2:
            return MATCH_STATE_SECOND_PERIOD_ACTIVE

        if type_id == "30" and period_id == 2:
            return MATCH_STATE_MATCH_FINISHED

        return None

    @staticmethod
    def _match_state_detail(state: str) -> str:
        return {
            MATCH_STATE_FIRST_PERIOD_ACTIVE: "first_half_started",
            MATCH_STATE_FIRST_PERIOD_FINISHED: "first_half_finished",
            MATCH_STATE_SECOND_PERIOD_ACTIVE: "second_half_started",
            MATCH_STATE_MATCH_FINISHED: "match_finished",
        }.get(state, "unknown")

    @staticmethod
    def _normalize_away_coordinates(event: Event, away_team_id: str) -> None:
        if event.team_id != away_team_id:
            return

        if event.x is not None:
            event.x = abs(event.x - 100)
        if event.y is not None:
            event.y = abs(event.y - 100)

        field_coordinate_qualifiers = {
            "140",  # Pass end x
            "141",  # Pass end y
            "146",  # Blocked shot x
            "147",  # Blocked shot y / sideline out y
            "153",  # Sideline out x when qualifier 276 is present
            "230",  # GK x
            "231",  # GK y
        }
        for qualifier in event.qualifiers:
            if qualifier.qualifier_id not in field_coordinate_qualifiers:
                continue
            try:
                qualifier.value = str(abs(float(qualifier.value) - 100))
            except (ValueError, TypeError):
                continue

    @staticmethod
    def _build_event_messages(
        game_id: str,
        new_events_flat: List[Dict[str, Any]],
        updated_events_flat: List[Dict[str, Any]],
        deleted_events_flat: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        messages: List[Dict[str, Any]] = []

        if new_events_flat:
            logger.info("EVENTS game=%s new=%d", game_id, len(new_events_flat))
            logger.debug("(EVENTS) new_event_ids=%s", [event.get("id") for event in new_events_flat])
            messages.append(
                {
                    "type": "new_events",
                    "game_id": game_id,
                    "events": new_events_flat,
                }
            )

        if updated_events_flat:
            logger.info("EVENTS game=%s updated=%d", game_id, len(updated_events_flat))
            logger.debug("(EVENTS) updated_event_ids=%s", [event.get("id") for event in updated_events_flat])
            messages.append(
                {
                    "type": "updated_events",
                    "game_id": game_id,
                    "events": updated_events_flat,
                }
            )

        if deleted_events_flat:
            logger.info("EVENTS game=%s deleted=%d", game_id, len(deleted_events_flat))
            logger.debug("(EVENTS) deleted_events=%s", deleted_events_flat)
            messages.append(
                {
                    "type": "deleted_events",
                    "game_id": game_id,
                    "events": deleted_events_flat,
                }
            )

        return messages
