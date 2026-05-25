from typing import Any, Dict, Optional

from app.schemas.events import Event
from app.services.events.constants import EXPORTED_EVENT_TYPES
from app.services.events.qualifier_flattener import flatten_event
from app.services.players.service import PlayersService


class EventExporter:
    """Builds frontend-facing event payloads from internal Event models."""

    def __init__(self, players_service: PlayersService) -> None:
        self._players_service = players_service

    @staticmethod
    def should_export(event: Event) -> bool:
        if event.type_id == "3":
            return not any(qualifier.qualifier_id == "211" for qualifier in event.qualifiers)
        if event.type_id == "4":
            return event.outcome == 0
        if event.type_id == "5":
            return event.outcome == 0
        return event.type_id in EXPORTED_EVENT_TYPES

    def to_payload(
        self,
        event: Event,
        match_state: Optional[str],
    ) -> Dict[str, Any]:
        player_payload = self._players_service.get_player_brief(
            event.team_id,
            event.player_id,
        )
        receiver_payload = (
            self._players_service.get_player_brief(
                event.team_id,
                event.player_receiver_id,
            )
            if event.player_receiver_id
            else None
        )

        if event.type_id in {"30", "32", "34"}:
            payload = flatten_event(event, match_state=match_state or "")
        else:
            payload = flatten_event(event)

        payload["player"] = player_payload
        if receiver_payload is not None:
            payload["player_receiver"] = receiver_payload
        return payload
