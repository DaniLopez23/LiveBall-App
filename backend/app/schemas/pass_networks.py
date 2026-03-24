from pydantic import BaseModel, Field
from typing import Dict, Set, Tuple


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
    