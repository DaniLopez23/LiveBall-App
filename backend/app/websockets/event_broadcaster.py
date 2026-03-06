import logging
from typing import Any, Dict

from app.websockets.websocket_manager import ConnectionManager

logger = logging.getLogger(__name__)

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
