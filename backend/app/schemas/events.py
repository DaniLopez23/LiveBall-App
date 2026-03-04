from typing import List, Optional
from pydantic import BaseModel, field_validator


class Qualifier(BaseModel):
    """A single <Q> child element of an <Event>."""

    qualifier_id: str
    qualifier_name: str
    value: str


class Event(BaseModel):
    """Represents a single <Event> element parsed from a Opta F24 XML feed."""

    id: str
    event_id: str
    type_id: str
    event_name: str
    event_description: str

    # Match context
    period_id: Optional[int] = None
    min: Optional[int] = None
    sec: Optional[int] = None

    # Actors
    player_id: Optional[str] = None
    team_id: Optional[str] = None

    # Result & position
    outcome: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None

    # Timestamps & versioning
    timestamp: Optional[str] = None
    timestamp_utc: Optional[str] = None
    last_modified: Optional[str] = None
    version: Optional[str] = None

    qualifiers: List[Qualifier] = []

    # ------------------------------------------------------------------ #
    # Validators – coerce empty strings / strings to the right type       #
    # ------------------------------------------------------------------ #

    @field_validator("period_id", "min", "sec", "outcome", mode="before")
    @classmethod
    def coerce_int(cls, v: object) -> Optional[int]:
        if v is None or v == "":
            return None
        return int(v)

    @field_validator("x", "y", mode="before")
    @classmethod
    def coerce_float(cls, v: object) -> Optional[float]:
        if v is None or v == "":
            return None
        return float(v)
