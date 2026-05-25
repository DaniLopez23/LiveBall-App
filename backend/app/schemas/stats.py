from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator


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


class PlayerBrief(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    dorsal: Optional[str] = None


class BookingStat(BaseModel):
    event_id: str
    event_number: Optional[int] = None
    min: Optional[int] = None
    sec: Optional[int] = None
    time: Optional[int] = None
    period: Optional[str] = None
    player_ref: Optional[str] = None
    player: Optional[PlayerBrief] = None
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
    player: Optional[PlayerBrief] = None
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
    team_name: Optional[str] = None
    side: Optional[str] = None
    score: Optional[int] = None
    bookings: List[BookingStat] = Field(default_factory=list)
    goals: List[GoalStat] = Field(default_factory=list)
    stats: List[TeamStat] = Field(default_factory=list)

    @field_validator("score", mode="before")
    @classmethod
    def coerce_score(cls, v: object) -> Optional[int]:
        if v is None or v == "":
            return None
        return int(v)


class ParsedMatchStats(BaseModel):
    game_id: str
    feed_timestamp: Optional[str] = None
    match_minute: Optional[int] = None
    document_type: Optional[str] = None
    detail_id: Optional[str] = None
    teams: List[TeamMatchStats]


TeamSide = Literal["home", "away"]
StatGroupName = Literal["possession", "passing", "shooting", "defensive", "discipline"]


class StatPeriodValues(BaseModel):
    total: Optional[float] = None
    firstHalf: Optional[float] = None
    secondHalf: Optional[float] = None


class DerivedStats(BaseModel):
    passAccuracy: Optional[float] = None
    longBallAccuracy: Optional[float] = None
    crossAccuracy: Optional[float] = None
    finalThirdPassAccuracy: Optional[float] = None
    shotAccuracy: Optional[float] = None
    goalConversion: Optional[float] = None
    tackleSuccess: Optional[float] = None
    duelSuccess: Optional[float] = None
    aerialSuccess: Optional[float] = None


GroupedStats = Dict[StatGroupName, Dict[str, StatPeriodValues]]


class TeamGroupedStats(BaseModel):
    teamId: str
    teamName: str
    side: TeamSide
    groups: GroupedStats
    derived: DerivedStats = Field(default_factory=DerivedStats)


class MatchStatsPayload(BaseModel):
    matchId: str
    minute: Optional[int] = None
    timestamp: str
    home: TeamGroupedStats
    away: TeamGroupedStats


class StatComparisonValues(BaseModel):
    home: Optional[float] = None
    away: Optional[float] = None
    diff: Optional[float] = None


class MatchStatsComparisonPayload(BaseModel):
    matchId: str
    minute: Optional[int] = None
    timestamp: str
    groups: Dict[StatGroupName, Dict[str, StatComparisonValues]]
    derived: Dict[str, StatComparisonValues]


class StatsTimeBucket(BaseModel):
    minute: int
    timestamp: str
    home: TeamGroupedStats
    away: TeamGroupedStats


class MatchStatsTimeline(BaseModel):
    matchId: str
    intervalMinutes: int = 5
    buckets: List[StatsTimeBucket] = Field(default_factory=list)


class MatchStatsUpdateData(BaseModel):
    current: MatchStatsPayload
    comparison: MatchStatsComparisonPayload
    timeline: MatchStatsTimeline
