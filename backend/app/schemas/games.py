from typing import List, Optional
from pydantic import BaseModel, field_validator

from app.schemas.events import Event
from app.schemas.teams import TeamInGame


class ParsedGame(BaseModel):
    """Represents a <Game> element parsed from a Opta F24 XML feed."""

    game_id: str
    competition_id: str
    competition_name: str
    season_id: str
    season_name: str
    matchday: Optional[int] = None

    game_date: Optional[str] = None
    period_1_start: Optional[str] = None
    period_2_start: Optional[str] = None

    home_team: TeamInGame
    away_team: TeamInGame

    events: List[Event] = []
    total_events: int = 0

    @field_validator("matchday", mode="before")
    @classmethod
    def coerce_matchday(cls, v: object) -> Optional[int]:
        if v is None or v == "":
            return None
        return int(v)


class ParsedGamesRoot(BaseModel):
    """Root wrapper returned by XmlParseService – mirrors the <Games> element."""

    timestamp: Optional[str] = None
    game: ParsedGame
