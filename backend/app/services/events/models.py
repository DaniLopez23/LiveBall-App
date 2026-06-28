from dataclasses import dataclass
from typing import Any, Dict, List

from app.schemas.events import Event


@dataclass
class EventScanResult:
    messages: List[Dict[str, Any]]
    pass_candidates_by_team: Dict[str, List[Event]]
    pass_deletions_by_team: Dict[str, List[str]]
    has_event_changes: bool
