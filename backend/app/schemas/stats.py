from typing import List, Optional

from pydantic import BaseModel, field_validator


class TeamStat(BaseModel):
    type: str
    value: Optional[str] = None
    fh: Optional[float] = None
    sh: Optional[float] = None

    @field_validator("fh", "sh", mode="before")
    @classmethod
    def coerce_float(cls, v: object) -> Optional[float]:
        if v is None or v == "":
            return None
        return float(v)


class BookingStat(BaseModel):
    event_id: str
    event_number: Optional[int] = None
    min: Optional[int] = None
    sec: Optional[int] = None
    time: Optional[int] = None
    period: Optional[str] = None
    player_ref: Optional[str] = None
    reason: Optional[str] = None
    card: Optional[str] = None
    card_type: Optional[str] = None
    timestamp: Optional[str] = None
    timestamp_utc: Optional[str] = None
    uid: Optional[str] = None

    @field_validator("event_number", "min", "sec", "time", mode="before")
    @classmethod
    def coerce_int(cls, v: object) -> Optional[int]:
        if v is None or v == "":
            return None
        return int(v)


class GoalStat(BaseModel):
    event_id: str
    event_number: Optional[int] = None
    min: Optional[int] = None
    sec: Optional[int] = None
    time: Optional[int] = None
    period: Optional[str] = None
    player_ref: Optional[str] = None
    goal_type: Optional[str] = None
    timestamp: Optional[str] = None
    timestamp_utc: Optional[str] = None
    uid: Optional[str] = None

    @field_validator("event_number", "min", "sec", "time", mode="before")
    @classmethod
    def coerce_int(cls, v: object) -> Optional[int]:
        if v is None or v == "":
            return None
        return int(v)


class TeamMatchStats(BaseModel):
    team_id: str
    side: Optional[str] = None
    score: Optional[int] = None
    bookings: List[BookingStat] = []
    goals: List[GoalStat] = []
    stats: List[TeamStat] = []

    @field_validator("score", mode="before")
    @classmethod
    def coerce_score(cls, v: object) -> Optional[int]:
        if v is None or v == "":
            return None
        return int(v)


class ParsedMatchStats(BaseModel):
    game_id: str
    feed_timestamp: Optional[str] = None
    document_type: Optional[str] = None
    detail_id: Optional[str] = None
    teams: List[TeamMatchStats]
