import logging
from typing import Any, Dict

from app.websockets.websocket_manager import ConnectionManager

logger = logging.getLogger(__name__)


async def broadcast_message(message: Dict[str, Any], manager: ConnectionManager):
    """
    Sends a formed message to the corresponding game room.
    """
    try:
        game_id = message.get("game_id")
        if not game_id:
            logger.warning("BROADCAST skipped message without game_id type=%s", message.get("type"))
            return

        await manager.broadcast_to_room(str(game_id), message)
    except Exception:
        logger.exception("BROADCAST error message_type=%s", message.get("type"))
