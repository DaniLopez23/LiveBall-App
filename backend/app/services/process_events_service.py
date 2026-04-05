import logging
from collections import defaultdict
from typing import Any, DefaultDict, Dict, List, Optional

from app.schemas.events import Event
from app.schemas.games import ParsedGame, ParsedGamesRoot
from app.services.qualifier_flattener import flatten_event
from app.state.game_state import GameStateCache

logger = logging.getLogger(__name__)


MATCH_STATE_PRE_MATCH = "pre_match"
MATCH_STATE_FIRST_PERIOD_ACTIVE = "first_period_active"
MATCH_STATE_FIRST_PERIOD_FINISHED = "first_period_finished"
MATCH_STATE_SECOND_PERIOD_ACTIVE = "second_period_active"
MATCH_STATE_MATCH_FINISHED = "match_finished"

_EXPORTED_EVENT_TYPES = {"1", "2", "5", "13", "14", "15", "16", "30", "32", "34", "4", "7", "8", "12", "44", "49", "67"}


class ProcessEventsService:
    """
    Receives already-parsed game data (ParsedGamesRoot) and determines
    what is new or changed since the last call.

    All state is stored in the injected ``GameStateCache`` so that the
    same game/event history is shared across every caller (e.g. the XML
    watcher and the HTTP/WebSocket layer).
    """

    def __init__(self, cache: GameStateCache) -> None:
        self._cache = cache

    # ------------------------------------------------------------------ #
    # Public API                                                           #
    # ------------------------------------------------------------------ #

    def process_game(self, parsed_root: ParsedGamesRoot) -> List[Dict[str, Any]]:
        """
        Processes a parsed game root and returns a list of change messages.

        Possible message types in the returned list:
          - new_game            – game info seen for the first time
          - updated_game        – game info has changed (e.g. score update)
          - new_events          – events not seen before
          - updated_events      – events whose type_id changed
          - pass_network_updated – pass network changed for a team

        Returns an empty list when nothing has changed.
        """
        messages: List[Dict[str, Any]] = []

        game_msg = self._check_game(parsed_root.game)
        if game_msg:
            messages.append(game_msg)

        event_msgs, changed_events = self._check_events(parsed_root.game)
        messages.extend(event_msgs)

        # Only reprocess pass networks when events changed
        if changed_events:
            pn_msgs = self._update_pass_networks(parsed_root.game, changed_events)
            messages.extend(pn_msgs)

        # CRITICAL: Always update the full ParsedGame in cache to ensure
        # the latest events list is available for WebSocket snapshots
        if messages:
            self._cache.games[parsed_root.game.game_id] = parsed_root.game
            logger.debug(
                "(CACHE) Updated full game in cache: %s (%d events)",
                parsed_root.game.game_id,
                len(parsed_root.game.events),
            )

        return messages

    # ------------------------------------------------------------------ #
    # Internal helpers                                                     #
    # ------------------------------------------------------------------ #

    def _game_snapshot(self, game: ParsedGame) -> Dict[str, Any]:
        """
        Extracts the comparable game attributes (metadata + score).
        Events are intentionally excluded from the snapshot.
        """
        return {
            "game_id": game.game_id,
            "competition_id": game.competition_id,
            "competition_name": game.competition_name,
            "season_id": game.season_id,
            "season_name": game.season_name,
            "matchday": game.matchday,
            "game_date": game.game_date,
            "period_1_start": game.period_1_start,
            "period_2_start": game.period_2_start,
            "home_team": {
                "team_id": game.home_team.team_id,
                "team_name": game.home_team.team_name,
                "team_official": game.home_team.team_official,
                "team_short": game.home_team.team_short,
                "score": game.home_team.score,
            },
            "away_team": {
                "team_id": game.away_team.team_id,
                "team_name": game.away_team.team_name,
                "team_official": game.away_team.team_official,
                "team_short": game.away_team.team_short,
                "score": game.away_team.score,
            },
        }

    def _check_game(self, game: ParsedGame) -> Optional[Dict[str, Any]]:
        """Returns a new_game or updated_game message, or None if unchanged."""
        game_id = game.game_id
        current = self._game_snapshot(game)

        if not self._cache.has_game(game_id):
            self._cache.store_game(game, current)
            logger.debug("(GAME) New game detected: %s", game_id)
            return {"type": "new_game", "game_id": game_id, "data": current}

        previous = self._cache.get_game_snapshot(game_id)
        if current != previous:
            self._cache.store_game(game, current)
            logger.debug("(GAME) Game updated: %s", game_id)
            return {"type": "updated_game", "game_id": game_id, "data": current}

        return None

    @staticmethod
    def _is_exported_event(event: Event) -> bool:
        return event.type_id in _EXPORTED_EVENT_TYPES

    @staticmethod
    def _event_cache_key(event: Event) -> tuple[str, str]:
        team_key = event.team_id or "__match__"
        event_key = event.event_id or event.id
        return team_key, event_key

    def _next_match_state(self, event: Event, current_state: Optional[str]) -> Optional[str]:
        """
        Infers a match-state transition from control events.

        Rules requested:
        - type_id=34, period_id=16 -> pre_match (first occurrence),
          first_period_finished (when first period was active)
        - type_id=32, period_id=1  -> first_period_active
        - type_id=32, period_id=2  -> second_period_active
        - type_id=30, period_id=2  -> match_finished
        """
        type_id = event.type_id
        period_id = event.period_id

        if type_id == "34" and period_id == 16:
            if current_state in (None, MATCH_STATE_PRE_MATCH):
                return MATCH_STATE_PRE_MATCH
            if current_state == MATCH_STATE_FIRST_PERIOD_ACTIVE:
                return MATCH_STATE_FIRST_PERIOD_FINISHED
            return None

        if type_id == "32" and period_id == 1:
            return MATCH_STATE_FIRST_PERIOD_ACTIVE

        if type_id == "32" and period_id == 2:
            return MATCH_STATE_SECOND_PERIOD_ACTIVE

        if type_id == "30" and period_id == 2:
            return MATCH_STATE_MATCH_FINISHED

        return None

    @staticmethod
    def _flatten_for_export(event: Event, match_state: Optional[str]) -> Dict[str, Any]:
        if event.type_id in {"30", "32", "34"}:
            return flatten_event(event, match_state=match_state or "")
        return flatten_event(event)

    def _check_events(self, game: ParsedGame) -> tuple[List[Dict[str, Any]], List[Event]]:
        """
        Classifies each event as new or updated.

        An event is *new* when its (team_id, event_id) pair has not been seen.
        An event is *updated* when its type_id differs from the previously recorded one.
        """
        new_events_flat: List[Dict[str, Any]] = []
        updated_events_flat: List[Dict[str, Any]] = []
        changed_events: List[Event] = []

        game_id = game.game_id
        away_team_id = game.away_team.team_id
        current_match_state = self._cache.get_match_state(game_id)

        for event in game.events:
            next_state = self._next_match_state(event, current_match_state)
            if next_state and next_state != current_match_state:
                self._cache.store_match_state(game_id, next_state)
                current_match_state = next_state
                logger.debug("(MATCH_STATE) Game %s -> %s", game_id, next_state)

            # Invert away-team coordinates so both teams attack left → right.
            # Done here to avoid a separate pass over all events.
            if event.team_id == away_team_id:
                if event.x is not None:
                    event.x = abs(event.x - 100)
                if event.y is not None:
                    event.y = abs(event.y - 100)
                for qualifier in event.qualifiers:
                    if qualifier.qualifier_id in ("140", "141"):
                        try:
                            qualifier.value = str(abs(float(qualifier.value) - 100))
                        except (ValueError, TypeError):
                            pass

            if not self._is_exported_event(event):
                continue

            team_key, event_key = self._event_cache_key(event)
            previous_type = self._cache.get_event_type(game_id, team_key, event_key)

            if previous_type is None:
                self._cache.store_event_type(game_id, team_key, event_key, event.type_id)
                changed_events.append(event)
                if self._is_exported_event(event):
                    new_events_flat.append(self._flatten_for_export(event, current_match_state))
            elif previous_type != event.type_id:
                self._cache.store_event_type(game_id, team_key, event_key, event.type_id)
                changed_events.append(event)
                if self._is_exported_event(event):
                    updated_events_flat.append(self._flatten_for_export(event, current_match_state))

        messages: List[Dict[str, Any]] = []

        if new_events_flat:
            logger.debug(
                "(EVENTS) Game %s – %d new event(s)", game.game_id, len(new_events_flat)
            )
            messages.append(
                {
                    "type": "new_events",
                    "game_id": game.game_id,
                    "events": new_events_flat,
                }
            )

        if updated_events_flat:
            logger.debug(
                "(EVENTS) Game %s – %d updated event(s)", game.game_id, len(updated_events_flat)
            )
            messages.append(
                {
                    "type": "updated_events",
                    "game_id": game.game_id,
                    "events": updated_events_flat,
                }
            )

        return messages, changed_events

    @staticmethod
    def _find_next_teammate_player_id(events: List[Event], start_idx: int, team_id: str) -> Optional[str]:
        for idx in range(start_idx, len(events)):
            candidate = events[idx]
            if candidate.team_id == team_id and candidate.player_id:
                return candidate.player_id
        return None

    def _collect_incremental_pass_candidates(
        self,
        game: ParsedGame,
        changed_events: List[Event],
    ) -> Dict[str, List[Event]]:
        """
        Resolves pass receivers incrementally and returns pass candidates per team
        that may update pass networks.

        To avoid rescanning the full match each poll, processing starts near the
        previously scanned index (with a one-event overlap so a pending pass can
        be completed by a new following event).
        """
        game_id = game.game_id
        events = game.events
        start_idx = max(0, self._cache.get_receiver_scan_index(game_id) - 1)

        by_team: DefaultDict[str, Dict[str, Event]] = defaultdict(dict)

        for idx in range(start_idx, len(events)):
            event = events[idx]
            if event.type_id not in ("1", "2") or not event.team_id:
                continue

            if not event.player_receiver_id:
                receiver = self._find_next_teammate_player_id(
                    events, idx + 1, event.team_id
                )
                if receiver:
                    event.player_receiver_id = receiver

            if (
                event.type_id == "1"
                and event.outcome == 1
                and event.player_receiver_id
                and event.event_id
            ):
                by_team[event.team_id][event.event_id] = event

        for event in changed_events:
            if (
                event.type_id == "1"
                and event.outcome == 1
                and event.team_id
                and event.player_receiver_id
                and event.event_id
            ):
                by_team[event.team_id][event.event_id] = event

        self._cache.store_receiver_scan_index(game_id, len(events))

        return {team_id: list(events_by_id.values()) for team_id, events_by_id in by_team.items()}

    def _update_pass_networks(
        self,
        game: ParsedGame,
        changed_events: List[Event],
    ) -> List[Dict[str, Any]]:
        """
        Updates per-team pass networks using only incremental pass candidates.

        This avoids filtering and rescanning every event for every team on each
        poll cycle.
        """
        incremental_by_team = self._collect_incremental_pass_candidates(game, changed_events)

        messages: List[Dict[str, Any]] = []

        for team_id, team_events in incremental_by_team.items():
            if not team_events:
                continue
            service = self._cache.get_or_create_pass_network(game.game_id, team_id)
            changed_nodes, changed_edges = service.add_passes_incremental(team_events)

            if changed_nodes or changed_edges:
                logger.debug(
                    "(PASS_NETWORK) Game %s team %s – pass network updated (%d nodes, %d edges)",
                    game.game_id,
                    team_id,
                    len(changed_nodes),
                    len(changed_edges),
                )
                statistics = service.get_bucket_statistics()
                self._cache.store_pass_network_statistics(game.game_id, team_id, statistics)

                messages.append(
                    {
                        "type": "pass_network_updated",
                        "game_id": game.game_id,
                        "team_id": team_id,
                        "nodes": changed_nodes,
                        "edges": changed_edges,
                        "statistics": statistics,
                    }
                )

        return messages
