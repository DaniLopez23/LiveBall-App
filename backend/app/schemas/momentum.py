from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class MomentumTeam(BaseModel):
    id: str
    name: str


class MomentumEvent(BaseModel):
    match_id: str
    event_id: str
    period_id: Optional[int] = None
    minute: Optional[int] = None
    second: Optional[int] = None
    team_id: Optional[str] = None
    player_id: Optional[str] = None
    type_id: str
    type_name: str
    outcome: Optional[int] = None
    start_x: Optional[float] = None
    start_y: Optional[float] = None
    end_x: Optional[float] = None
    end_y: Optional[float] = None
    qualifiers: Dict[int, Any] = Field(default_factory=dict)


class MatchMomentumPoint(BaseModel):
    minute: int
    homeValue: float
    awayValue: float
    homeMomentum: float
    awayMomentum: float
    netMomentum: float


class MatchMomentumPayload(BaseModel):
    matchId: str
    source: str = "socceraction_xT"
    intervalMinutes: int
    triggerIntervalMinutes: int
    windowMinutes: int
    homeTeam: MomentumTeam
    awayTeam: MomentumTeam
    points: List[MatchMomentumPoint] = Field(default_factory=list)
