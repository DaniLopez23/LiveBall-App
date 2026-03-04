from typing import Optional
from pydantic import BaseModel, field_validator


class TeamInGame(BaseModel):
    """Represents one of the two teams participating in a game,
    as parsed from the <Game> element attributes."""

    team_id: str
    team_name: str
    team_official: Optional[str] = None
    team_short: Optional[str] = None
    score: Optional[int] = None

    @field_validator("score", mode="before")
    @classmethod
    def coerce_score(cls, v: object) -> Optional[int]:
        if v is None or v == "":
            return None
        return int(v)
