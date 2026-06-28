from typing import List, Optional
from pydantic import BaseModel, field_validator

from app.schemas.events import Event
from app.schemas.teams import TeamInGame


class AvailableMatchTeam(BaseModel):
    """Compact team payload used by the F42 match catalogue."""

    team_id: str
    team_name: str
    team_short: Optional[str] = None
    team_official: Optional[str] = None
    side: str
    score: Optional[int] = None
    half_time_score: Optional[int] = None

    @field_validator("score", "half_time_score", mode="before")
    @classmethod
    def coerce_score(cls, v: object) -> Optional[int]:
        if v is None or v == "":
            return None
        return int(v)


class AvailableMatch(BaseModel):
    """One selectable match parsed from an Opta F42 feed."""

    game_id: str
    uid: str
    competition_id: str
    competition_name: str
    season_id: str
    season_name: str
    matchday: Optional[int] = None
    match_type: Optional[str] = None
    period: str
    status: str
    game_date: Optional[str] = None
    timezone: Optional[str] = None
    venue: Optional[str] = None
    attendance: Optional[int] = None
    home_team: AvailableMatchTeam
    away_team: AvailableMatchTeam

    @field_validator("matchday", "attendance", mode="before")
    @classmethod
    def coerce_optional_int(cls, v: object) -> Optional[int]:
        if v is None or v == "":
            return None
        return int(v)


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
