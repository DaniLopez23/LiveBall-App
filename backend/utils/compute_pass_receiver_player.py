import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


def _is_pass_event(event: Dict[str, Any]) -> bool:
    """Check if event is a pass event (type_id = 1)."""
    return event.get("type_id") == "1"


def _find_next_team_event(
    events: List[Dict[str, Any]], 
    current_index: int, 
    team_id: str
) -> Dict[str, Any] | None:
    """Find the next event from the same team after current index."""
    for i in range(current_index + 1, len(events)):
        event = events[i]
        if event.get("team_id") == team_id:
            return event
    return None


def add_pass_receiver_info(events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Add player_receiver_id to pass events based on the next event of the same team.
    
    Processes ALL events (accumulative), assigning receiver only to passes that don't have one yet.
    
    Args:
        events: List of ALL event dictionaries (accumulative from XML)
        
    Returns:
        Same list of events with player_receiver_id added to pass events (modifies in-place)
    """
    pass_count = 0
    passes_with_receiver = 0
    passes_updated = 0
    
    for index, event in enumerate(events):
        # Si es un evento de pase
        if _is_pass_event(event):
            pass_count += 1
            
            # Si ya tiene receiver, lo omitimos y seguimos
            if event.get("player_receiver_id"):
                passes_with_receiver += 1
                continue
            
            # Buscar el siguiente evento del mismo equipo
            team_id = event.get("team_id")
            next_team_event = _find_next_team_event(events, index, team_id)
            
            if next_team_event:
                receiver_id = next_team_event.get("player_id")
                event["player_receiver_id"] = receiver_id
                passes_with_receiver += 1
                passes_updated += 1
    
    if passes_updated > 0:
        # logger.debug(f"✓ Updated {passes_updated} pass events with receiver info (total with receiver: {passes_with_receiver}/{pass_count})")
        pass
    return events

