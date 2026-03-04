import json
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any, Dict, Optional
import logging

from app.schemas.events import Event, Qualifier
from app.schemas.games import ParsedGame, ParsedGamesRoot
from app.schemas.teams import TeamInGame

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.parent.parent   # → backend/

EVENT_MAPPER_PATH     = BASE_DIR / "utils" / "event_mapper.json"
QUALIFIER_MAPPER_PATH = BASE_DIR / "utils" / "qualifier_mapper.json"

class XmlParseService:
    """Converts raw XML (string or file) into validated Pydantic models.

    Responsibilities:
    - Load mapping JSONs (event/qualifier)
    - Parse XML from string/file
    - Return ParsedGamesRoot (or None on error)
    """
    
    def __init__(self):
        self.event_mapper = self._load_json(EVENT_MAPPER_PATH)
        self.qualifier_mapper = self._load_json(QUALIFIER_MAPPER_PATH)
        
    def _load_json(self, path: Path) -> Dict[str, Any]:
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data
        except (OSError, json.JSONDecodeError) as e:
            logger.error("Failed to load JSON mapping from '%s': %s", path, e)
            return {}
        
    def _get_event_info(self, type_id: str) -> Dict[str, str]:
        event_data = self.event_mapper.get(str(type_id), {})
        return {
            "event_name": event_data.get("event_name", "Unknown Event"),
            "description": event_data.get("description", ""),
        }

    def _get_qualifier_info(self, qualifier_id: str, value: str) -> Qualifier:
        qualifier_data = self.qualifier_mapper.get(str(qualifier_id))
        qualifier_name = qualifier_data.get("qualifier_name", "") if qualifier_data else "Unknown Qualifier"
        return Qualifier(
            qualifier_id=qualifier_id,
            qualifier_name=qualifier_name,
            value=value,
        )
    
    def _parse_event(self, event_element: ET.Element) -> Event:
        event_attrs = event_element.attrib
        type_id = event_attrs.get("type_id", "")
        event_info = self._get_event_info(type_id)

        qualifiers = [
            self._get_qualifier_info(
                q.attrib.get("qualifier_id", ""),
                q.attrib.get("value", ""),
            )
            for q in event_element.findall("Q")
        ]

        return Event(
            id=event_attrs.get("id", ""),
            event_id=event_attrs.get("event_id", ""),
            type_id=type_id,
            event_name=event_info["event_name"],
            event_description=event_info["description"],
            period_id=event_attrs.get("period_id"),
            min=event_attrs.get("min"),
            sec=event_attrs.get("sec"),
            player_id=event_attrs.get("player_id"),
            team_id=event_attrs.get("team_id"),
            outcome=event_attrs.get("outcome"),
            x=event_attrs.get("x"),
            y=event_attrs.get("y"),
            timestamp=event_attrs.get("timestamp"),
            timestamp_utc=event_attrs.get("timestamp_utc"),
            last_modified=event_attrs.get("last_modified"),
            version=event_attrs.get("version"),
            qualifiers=qualifiers,
        )

    def _parse_game(self, game_element: ET.Element) -> ParsedGame:
        game_attrs = game_element.attrib
        events = [self._parse_event(e) for e in game_element.findall("Event")]

        return ParsedGame(
            game_id=game_attrs.get("id", ""),
            competition_id=game_attrs.get("competition_id", ""),
            competition_name=game_attrs.get("competition_name", ""),
            season_id=game_attrs.get("season_id", ""),
            season_name=game_attrs.get("season_name", ""),
            matchday=game_attrs.get("matchday"),
            game_date=game_attrs.get("game_date"),
            home_team=TeamInGame(
                team_id=game_attrs.get("home_team_id", ""),
                team_name=game_attrs.get("home_team_name", ""),
                team_official=game_attrs.get("home_team_official"),
                team_short=game_attrs.get("home_team_short"),
                score=game_attrs.get("home_score"),
            ),
            away_team=TeamInGame(
                team_id=game_attrs.get("away_team_id", ""),
                team_name=game_attrs.get("away_team_name", ""),
                team_official=game_attrs.get("away_team_official"),
                team_short=game_attrs.get("away_team_short"),
                score=game_attrs.get("away_score"),
            ),
            period_1_start=game_attrs.get("period_1_start"),
            period_2_start=game_attrs.get("period_2_start"),
            events=events,
            total_events=len(events),
        )

    def parse_xml_string(self, xml_string: str) -> Optional[ParsedGamesRoot]:
        try:
            root = ET.fromstring(xml_string)
            game_element = root.find("Game")
            if game_element is not None:
                return ParsedGamesRoot(
                    timestamp=root.attrib.get("timestamp"),
                    game=self._parse_game(game_element),
                )
            else:
                logger.error("No <Game> element found in XML.")
                return None
        except ET.ParseError as e:
            logger.error("Failed to parse XML string: %s", e)
            return None