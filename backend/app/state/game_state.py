"""
Centralized in-memory cache for all game state.

Stores the current known state of each game, its events, and its pass
networks so that services can detect new/updated information and avoid
re-sending unchanged data.
"""

from typing import Any, Dict, Optional, Tuple

from app.schemas.games import ParsedGame
from app.schemas.stats import ParsedMatchStats
from app.services.pass_network_service import PassNetworkService


class GameStateCache:
    """
    Single source of truth for what the application already knows.

    Three kinds of state are tracked:

    - **Games**: full ``ParsedGame`` objects + comparable snapshots for
      change detection.
    - **Events**: per-game mapping of ``(team_id, event_id) → type_id``
      so that new/updated events can be distinguished.
        - **Stats**: parsed F9 stats payload + comparable snapshot per game.
    - **Pass networks**: one ``PassNetworkService`` instance per
      ``(game_id, team_id)`` pair.
    """

    def __init__(self) -> None:
        # game_id → full ParsedGame (latest ingested version)
        self.games: Dict[str, ParsedGame] = {}
        # game_id → comparable snapshot dict used for change detection
        self._game_snapshots: Dict[str, Dict[str, Any]] = {}
        # game_id → { (team_id, event_id) → type_id }
        self._event_states: Dict[str, Dict[Tuple[str, str], str]] = {}
        # game_id → full ParsedMatchStats (latest ingested version)
        self.stats: Dict[str, ParsedMatchStats] = {}
        # game_id → comparable snapshot dict used for stats change detection
        self._stats_snapshots: Dict[str, Dict[str, Any]] = {}
        # (game_id, team_id) → PassNetworkService
        self.pass_networks: Dict[Tuple[str, str], PassNetworkService] = {}
        # (game_id, team_id) → latest bucket statistics dict
        self._pass_network_statistics: Dict[Tuple[str, str], Dict[str, Any]] = {}

    # ------------------------------------------------------------------ #
    # Game helpers                                                         #
    # ------------------------------------------------------------------ #

    def has_game(self, game_id: str) -> bool:
        """Returns True if the game has been seen before."""
        return game_id in self._game_snapshots

    def get_game_snapshot(self, game_id: str) -> Optional[Dict[str, Any]]:
        """Returns the stored snapshot for *game_id*, or None."""
        return self._game_snapshots.get(game_id)

    def store_game(self, game: ParsedGame, snapshot: Dict[str, Any]) -> None:
        """Persists the full game and its comparable snapshot."""
        self.games[game.game_id] = game
        self._game_snapshots[game.game_id] = snapshot

    # ------------------------------------------------------------------ #
    # Event helpers                                                        #
    # ------------------------------------------------------------------ #

    def has_event(self, game_id: str, team_id: str, event_id: str) -> bool:
        """Returns True if the event has been seen before inside *game_id*."""
        return (team_id, event_id) in self._event_states.get(game_id, {})

    def get_event_type(
        self, game_id: str, team_id: str, event_id: str
    ) -> Optional[str]:
        """Returns the last seen type_id for the event, or None."""
        return self._event_states.get(game_id, {}).get((team_id, event_id))

    def store_event_type(
        self, game_id: str, team_id: str, event_id: str, type_id: str
    ) -> None:
        """Stores or updates the type_id for an event inside *game_id*."""
        if game_id not in self._event_states:
            self._event_states[game_id] = {}
        self._event_states[game_id][(team_id, event_id)] = type_id

    # ------------------------------------------------------------------ #
    # Stats helpers                                                       #
    # ------------------------------------------------------------------ #

    def has_stats(self, game_id: str) -> bool:
        """Returns True if stats have been seen before for the game."""
        return game_id in self._stats_snapshots

    def get_stats(self, game_id: str) -> Optional[ParsedMatchStats]:
        """Returns the stored parsed stats payload for *game_id*, or None."""
        return self.stats.get(game_id)

    def get_stats_snapshot(self, game_id: str) -> Optional[Dict[str, Any]]:
        """Returns the stored stats snapshot for *game_id*, or None."""
        return self._stats_snapshots.get(game_id)

    def store_stats(self, parsed_stats: ParsedMatchStats, snapshot: Dict[str, Any]) -> None:
        """Persists the full stats payload and its comparable snapshot."""
        self.stats[parsed_stats.game_id] = parsed_stats
        self._stats_snapshots[parsed_stats.game_id] = snapshot

    # ------------------------------------------------------------------ #
    # Pass network helpers                                                 #
    # ------------------------------------------------------------------ #

    def get_or_create_pass_network(
        self, game_id: str, team_id: str
    ) -> PassNetworkService:
        """Returns the existing ``PassNetworkService`` for ``(game_id, team_id)``,
        creating one if it does not yet exist."""
        key = (game_id, team_id)
        if key not in self.pass_networks:
            self.pass_networks[key] = PassNetworkService(team_id=int(team_id))
        return self.pass_networks[key]

    def store_pass_network_statistics(
        self, game_id: str, team_id: str, statistics: Dict[str, Any]
    ) -> None:
        """Persists the latest computed bucket statistics for ``(game_id, team_id)``."""
        self._pass_network_statistics[(game_id, team_id)] = statistics

    def get_pass_network_statistics(
        self, game_id: str, team_id: str
    ) -> Dict[str, Any]:
        """Returns the last stored bucket statistics, or an empty dict if not yet computed."""
        return self._pass_network_statistics.get((game_id, team_id), {})
