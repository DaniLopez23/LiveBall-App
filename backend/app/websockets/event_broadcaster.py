import logging
from typing import Any, Dict

from app.websockets.websocket_manager import ConnectionManager

logger = logging.getLogger(__name__)


async def broadcast_game_events(result: Dict[str, Any], manager: ConnectionManager):
    """
    Envía eventos nuevos a través de WebSocket a los clientes del room correspondiente.

    Args:
        result: Resultado parseado del XML con los eventos
        manager: Instancia del ConnectionManager
    """
    try:
        game_data = result.get("data", {}).get("game", {})
        game_id = game_data.get("game_id", "unknown")
        events = game_data.get("events", [])
        total_events = result.get("total_events", 0)
        last_event_id = result.get("last_event_id", None)

        if not events:
            logger.warning("⚠️  No hay eventos para enviar")
            return

        message = {
            "type": "game_update",
            "game_id": game_id,
            "total_events": total_events,
            "last_event_id": last_event_id,
            "timestamp": game_data.get("period_1_start", ""),
            "home_team": game_data.get("home_team", {}),
            "away_team": game_data.get("away_team", {}),
            "events": events,
        }

        await manager.broadcast_to_room(game_id, message)
        logger.info(f"📡 {total_events} eventos enviados al room {game_id}")

    except Exception as e:
        logger.error(f"❌ Error broadcasting eventos: {e}")


async def broadcast_message(message: Dict[str, Any], manager: ConnectionManager):
    """
    Envía un mensaje ya formado a los clientes del room correspondiente.

    Args:
        message: Mensaje a enviar (debe incluir game_id)
        manager: Instancia del ConnectionManager
    """
    try:
        game_id = message.get("game_id")
        if not game_id:
            logger.warning("⚠️  Mensaje sin game_id, no se envía")
            return

        await manager.broadcast_to_room(str(game_id), message)
    except Exception as e:
        logger.error(f"❌ Error broadcasting mensaje: {e}")
