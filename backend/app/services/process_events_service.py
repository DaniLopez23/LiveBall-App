import logging
from typing import Any, Dict, List, Optional

from app.schemas.events import Event
from app.schemas.games import ParsedGame, ParsedGamesRoot
from app.state.game_state import GameStateCache

logger = logging.getLogger(__name__)


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

        event_msgs = self._check_events(parsed_root.game)
        messages.extend(event_msgs)

        # Only reprocess pass networks when events changed
        has_event_changes = any(
            m["type"] in ("new_events", "updated_events") for m in event_msgs
        )
        if has_event_changes:
            pn_msgs = self._update_pass_networks(parsed_root.game)
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

    def _check_events(self, game: ParsedGame) -> List[Dict[str, Any]]:
        """
        Classifies each event as new or updated.

        An event is *new* when its (team_id, event_id) pair has not been seen.
        An event is *updated* when its type_id differs from the previously recorded one.
        """
        new_events: List[Event] = []
        updated_events: List[Event] = []

        game_id = game.game_id

        for event in game.events:
            if not event.team_id or not event.event_id:
                continue

            if not self._cache.has_event(game_id, event.team_id, event.event_id):
                self._cache.store_event_type(
                    game_id, event.team_id, event.event_id, event.type_id
                )
                new_events.append(event)
            elif (
                self._cache.get_event_type(game_id, event.team_id, event.event_id)
                != event.type_id
            ):
                self._cache.store_event_type(
                    game_id, event.team_id, event.event_id, event.type_id
                )
                updated_events.append(event)

        messages: List[Dict[str, Any]] = []

        if new_events:
            logger.debug(
                "(EVENTS) Game %s – %d new event(s)", game.game_id, len(new_events)
            )
            messages.append(
                {
                    "type": "new_events",
                    "game_id": game.game_id,
                    "events": [e.model_dump() for e in new_events],
                }
            )

        if updated_events:
            logger.debug(
                "(EVENTS) Game %s – %d updated event(s)", game.game_id, len(updated_events)
            )
            messages.append(
                {
                    "type": "updated_events",
                    "game_id": game.game_id,
                    "events": [e.model_dump() for e in updated_events],
                }
            )

        return messages

    def _assign_receivers(self, events: List[Event]) -> None:
        """
        Sets ``player_receiver_id`` on every pass event that does not yet have
        one, using the "next event from the same team" heuristic.

        Iterates the full ordered event list once.  For each pass (type_id='1')
        without a receiver it scans forward for the first subsequent event of
        the same team and assigns that event's player_id.  Already-assigned
        events are skipped immediately, keeping the loop efficient across
        successive calls with a growing list.
        """
        for i, event in enumerate(events):
            if event.type_id != "1" or not event.team_id:
                continue
            if event.player_receiver_id:
                continue

            for j in range(i + 1, len(events)):
                candidate = events[j]
                if candidate.team_id == event.team_id and candidate.player_id:
                    event.player_receiver_id = candidate.player_id
                    break

    def _update_pass_networks(self, game: ParsedGame) -> List[Dict[str, Any]]:
        """
        Assigns receivers to all pass events, then updates the per-team pass
        network and returns ``pass_network_updated`` messages for every team
        whose network changed.
        """
        self._assign_receivers(game.events)

        messages: List[Dict[str, Any]] = []

        team_ids = {e.team_id for e in game.events if e.team_id}
        for team_id in team_ids:
            service = self._cache.get_or_create_pass_network(game.game_id, team_id)
            team_events = [e for e in game.events if e.team_id == team_id]
            changed_nodes, changed_edges = service.add_passes_incremental(team_events)

            if changed_nodes or changed_edges:
                logger.debug(
                    "(PASS_NETWORK) Game %s team %s – pass network updated (%d nodes, %d edges)",
                    game.game_id,
                    team_id,
                    len(changed_nodes),
                    len(changed_edges),
                )
                messages.append(
                    {
                        "type": "pass_network_updated",
                        "game_id": game.game_id,
                        "team_id": team_id,
                        "nodes": changed_nodes,
                        "edges": changed_edges,
                        "statistics": service.get_statistics(),
                    }
                )

        return messages
