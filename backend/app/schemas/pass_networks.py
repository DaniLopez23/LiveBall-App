from pydantic import BaseModel, field_validator
from typing import Dict, List, Optional, Set, Tuple

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
    
class PassEdge(BaseModel):
    from_player_id: str
    to_player_id: str
    pass_count: int = 0  
    avg_x: float = 0.0  
    avg_y: float = 0.0
    
class PassNetwork(BaseModel):
    players: Dict[str, PlayerNode] 
    edges: Dict[Tuple[str, str], PassEdge] 
    team_id: int = 0
    changed_players: Set[str] 
    changed_edges: Set[Tuple[str, str]] 
    processed_event_ids: Set[str] 
    