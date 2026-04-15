"""
In-memory cache for squads/players loaded from the Opta F40 feed.

The cache is intentionally simple and process-local. It stores the parsed
payload once so services can avoid re-reading the XML file.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


class PlayersStateCache:
    """Holds parsed players grouped by team.

    Data shape:
        {
            "t173": {
                "team_id": "t173",
                "team_name": "Alavés",
                "players": [
                    {
                        "player_id": "p176245",
                        "name": "Antonio Sivera",
                        "position": "Goalkeeper",
                        "stats": {"jersey_num": "1", ...},
                    }
                ],
            },
        }
    """

    def __init__(self) -> None:
        self._teams: Dict[str, Dict[str, Any]] = {}
        self._loaded: bool = False

    @property
    def loaded(self) -> bool:
        """Returns whether the squads payload has already been loaded."""
        return self._loaded

    def store_teams(self, teams: Dict[str, Dict[str, Any]]) -> None:
        """Stores the parsed team/player payload and marks cache as loaded."""
        self._teams = teams
        self._loaded = True

    def get_all_teams(self) -> Dict[str, Dict[str, Any]]:
        """Returns all cached teams keyed by team_id."""
        return self._teams

    def get_team(self, team_id: str) -> Optional[Dict[str, Any]]:
        """Returns one cached team payload by team_id."""
        return self._teams.get(team_id)

    def clear(self) -> None:
        """Clears the cache (useful for tests)."""
        self._teams = {}
        self._loaded = False


# Shared process-level cache used by default by PlayersService.
players_state_cache = PlayersStateCache()
