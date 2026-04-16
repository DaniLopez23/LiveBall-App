"""Players service for Opta F40 squads feed.

Reads the XML feed once, parses team/player information, and stores the result
in ``PlayersStateCache`` for subsequent requests.
"""

from __future__ import annotations

import logging
import threading
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.state.players_state import PlayersStateCache, players_state_cache

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parents[3]
DEFAULT_F40_FILE = BASE_DIR / "simulated-real-time-data" / "F40-squad-23.xml"


class PlayersService:
    """Provides cached access to players grouped by team."""

    def __init__(
        self,
        cache: Optional[PlayersStateCache] = None,
        f40_xml_path: Optional[Path] = None,
    ) -> None:
        self.cache = cache or players_state_cache
        self.f40_xml_path = Path(f40_xml_path) if f40_xml_path else DEFAULT_F40_FILE
        self._load_lock = threading.Lock()
        self._player_lookup: Dict[tuple[str, str], Dict[str, Any]] = {}

    # ------------------------------------------------------------------ #
    # Public API                                                         #
    # ------------------------------------------------------------------ #

    def get_all_teams_players(self) -> Dict[str, Dict[str, Any]]:
        """Returns all teams and their players from cache (loads once if needed)."""
        self._ensure_loaded()
        return self.cache.get_all_teams()

    def get_team_players(self, team_id: str) -> List[Dict[str, Any]]:
        """Returns the list of players for one team."""
        self._ensure_loaded()
        normalized_team_id = self._normalize_team_id(team_id)
        team_payload = (
            self.cache.get_team(team_id)
            or self.cache.get_team(normalized_team_id)
        )
        if not team_payload:
            return []
        return team_payload.get("players", [])

    def get_player(self, team_id: str, player_id: str) -> Optional[Dict[str, Any]]:
        """Returns one player payload from a team, if present."""
        normalized_player_id = self._normalize_player_id(player_id)
        players = self.get_team_players(team_id)
        for player in players:
            player_value = str(player.get("player_id", ""))
            if (
                player_value == player_id
                or player_value == normalized_player_id
                or self._normalize_player_id(player_value) == normalized_player_id
            ):
                return player
        return None

    def get_player_brief(self, team_id: Optional[str], player_id: Optional[str]) -> Dict[str, Optional[str]]:
        """Returns a compact player object with id, name and dorsal.

        The returned ``id`` preserves the incoming ``player_id`` value, while the
        lookup against F40 is performed with normalized IDs.
        """
        normalized_player_id = self._normalize_player_id(player_id or "")
        if not team_id or not player_id:
            return {
                "id": normalized_player_id or None,
                "name": None,
                "dorsal": None,
            }

        self._ensure_loaded()
        key = (self._normalize_team_id(team_id), self._normalize_player_id(player_id))
        payload = self._player_lookup.get(key)

        if payload is None:
            return {
                "id": normalized_player_id,
                "name": None,
                "dorsal": None,
            }

        return {
            "id": normalized_player_id,
            "name": payload.get("name"),
            "dorsal": payload.get("stats", {}).get("jersey_num"),
        }

    # ------------------------------------------------------------------ #
    # Loading/parsing                                                    #
    # ------------------------------------------------------------------ #

    def _ensure_loaded(self) -> None:
        """Loads F40 data into cache once (thread-safe)."""
        if self.cache.loaded:
            if not self._player_lookup:
                self._build_player_lookup(self.cache.get_all_teams())
            return

        with self._load_lock:
            if self.cache.loaded:
                if not self._player_lookup:
                    self._build_player_lookup(self.cache.get_all_teams())
                return

            teams = self._read_and_parse_f40()
            self.cache.store_teams(teams)
            self._build_player_lookup(teams)
            logger.info(
                "PlayersService loaded %d teams from F40 (%s)",
                len(teams),
                self.f40_xml_path,
            )

    def _read_and_parse_f40(self) -> Dict[str, Dict[str, Any]]:
        """Parses F40 XML and returns teams keyed by team_id."""
        if not self.f40_xml_path.exists():
            raise FileNotFoundError(f"F40 XML file not found: {self.f40_xml_path}")

        tree = ET.parse(self.f40_xml_path)
        root = tree.getroot()

        teams_payload: Dict[str, Dict[str, Any]] = {}
        # Expected hierarchy: SoccerFeed -> SoccerDocument -> Team
        team_elements = root.findall("./SoccerDocument/Team")
        for team_el in team_elements:
            team_id = self._normalize_team_id(team_el.attrib.get("uID", ""))
            if not team_id:
                continue

            teams_payload[team_id] = self._parse_team(team_el, team_id)

        return teams_payload

    def _build_player_lookup(self, teams_payload: Dict[str, Dict[str, Any]]) -> None:
        """Builds a normalized in-memory lookup: (team_id, player_id) -> player."""
        lookup: Dict[tuple[str, str], Dict[str, Any]] = {}
        for team_id, team_payload in teams_payload.items():
            team_key = self._normalize_team_id(team_id)
            for player in team_payload.get("players", []):
                player_key = self._normalize_player_id(str(player.get("player_id", "")))
                if not player_key:
                    continue
                lookup[(team_key, player_key)] = player
        self._player_lookup = lookup

    def _parse_team(self, team_el: ET.Element, team_id: str) -> Dict[str, Any]:
        """Builds one team payload including all players."""
        team_name = self._text(team_el.find("Name"))
        team_short_name = team_el.attrib.get("short_club_name", "")
        team_official_name = team_el.attrib.get("official_club_name", "")

        players: List[Dict[str, Any]] = []
        # Players must be direct children of Team.
        for player_el in team_el.findall("./Player"):
            players.append(self._parse_player(player_el))

        
        return {
            "team_id": team_id,
            "team_name": team_name,
            "team_short_name": team_short_name,
            "team_official_name": team_official_name,
            "players": players,
        }

    def _parse_player(self, player_el: ET.Element) -> Dict[str, Any]:
        """Builds one player payload from Team/Player with jersey number."""
        jersey_num = ""
        for stat_el in player_el.findall("./Stat"):
            if stat_el.attrib.get("Type") == "jersey_num":
                jersey_num = self._text(stat_el)
                break

        return {
            "player_id": self._normalize_player_id(player_el.attrib.get("uID", "")),
            "name": self._text(player_el.find("./Name")),
            "position": self._text(player_el.find("Position")),
            "stats": {"jersey_num": jersey_num},
        }

    @staticmethod
    def _text(element: Optional[ET.Element]) -> str:
        """Returns stripped text for an XML element (or empty string)."""
        if element is None or element.text is None:
            return ""
        return element.text.strip()

    @staticmethod
    def _normalize_team_id(team_id: str) -> str:
        value = team_id.strip()
        return value[1:] if value[:1].lower() == "t" else value

    @staticmethod
    def _normalize_player_id(player_id: str) -> str:
        value = player_id.strip()
        return value[1:] if value[:1].lower() == "p" else value
