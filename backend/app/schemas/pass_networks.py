from pydantic import BaseModel, Field
from typing import Dict, Set, Tuple

# ------------------------------------------------------------------ #
# 5-minute bucket helpers                                              #
# ------------------------------------------------------------------ #

#: Total number of 5-minute buckets covering minutes 0–90.
#: Buckets: [0–4], [5–9], …, [85–89], [90].  Index = minute // 5, clamped to 18.
N_5MIN_BUCKETS: int = 19


def bucket_minute_range(bucket: int) -> range:
    """
    Returns the minute indices (0..90) that belong to *bucket* (0-indexed).

    Examples:
        bucket_minute_range(0)  → range(0, 5)   # minutes 0–4
        bucket_minute_range(1)  → range(5, 10)  # minutes 5–9
        bucket_minute_range(18) → range(90, 91) # minute 90
    """
    bucket = max(0, min(N_5MIN_BUCKETS - 1, bucket))
    start = bucket * 5
    end = start + 5 if bucket < N_5MIN_BUCKETS - 1 else 91
    return range(start, end)


def minute_to_bucket(minute: int | None) -> int:
    """Maps a minute value to its 5-minute bucket index (0–18)."""
    if minute is None:
        return 0
    return min(N_5MIN_BUCKETS - 1, max(0, int(minute)) // 5)


def _minute_buckets() -> list[int]:
    """Creates a fixed 0..90 minute bucket array."""
    return [0] * 91


def _minute_position_stats() -> list[dict[str, float]]:
    """Creates 0..90 per-minute accumulators for count/x/y sums."""
    return [{"count": 0.0, "x_sum": 0.0, "y_sum": 0.0} for _ in range(91)]


class PlayerNode(BaseModel):
    player_id: str
    player_name: str = ""
    team_id: str = ""
    pass_count: int = 0  
    passes_given: int = 0  
    passes_received: int = 0 
    avg_x_given: float = 0.0  
    avg_y_given: float = 0.0  
    avg_x_received: float = 0.0  
    avg_y_received: float = 0.0  
    avg_x_total: float = 0.0  
    avg_y_total: float = 0.0  
    # Eventos de pase por minuto (indice 0..90)
    minute_buckets: list[int] = Field(default_factory=_minute_buckets)
    minute_given_stats: list[dict[str, float]] = Field(default_factory=_minute_position_stats)
    minute_received_stats: list[dict[str, float]] = Field(default_factory=_minute_position_stats)
    
class PassEdge(BaseModel):
    from_player_id: str
    to_player_id: str
    pass_count: int = 0  
    avg_x: float = 0.0  
    avg_y: float = 0.0
    # Pases de esta arista por minuto (indice 0..90)
    minute_buckets: list[int] = Field(default_factory=_minute_buckets)
    minute_position_stats: list[dict[str, float]] = Field(default_factory=_minute_position_stats)
    
class PassNetwork(BaseModel):
    players: Dict[str, PlayerNode] 
    edges: Dict[Tuple[str, str], PassEdge] 
    team_id: int = 0
    changed_players: Set[str] 
    changed_edges: Set[Tuple[str, str]] 
    processed_event_ids: Set[str] 
    