import logging
from typing import Dict

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections grouped by game_id rooms.
    """

    def __init__(self):
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.client_counter = 0

    async def connect(self, websocket: WebSocket, game_id: str) -> str:
        """
        Connects a client to a game room and returns its generated client_id.
        """
        await websocket.accept()

        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}
            logger.debug("WEBSOCKET room created game=%s", game_id)

        self.client_counter += 1
        client_id = f"client_{self.client_counter}"
        self.active_connections[game_id][client_id] = websocket

        logger.info(
            "WEBSOCKET connected game=%s client=%s room_clients=%d total_clients=%d",
            game_id,
            client_id,
            len(self.active_connections[game_id]),
            self._total_clients(),
        )
        return client_id

    def disconnect(self, game_id: str, client_id: str):
        """
        Disconnects one client from a game room.
        """
        if game_id not in self.active_connections:
            return

        if client_id not in self.active_connections[game_id]:
            return

        del self.active_connections[game_id][client_id]
        remaining_room_clients = len(self.active_connections[game_id])

        if not self.active_connections[game_id]:
            del self.active_connections[game_id]
            logger.debug("WEBSOCKET room removed game=%s", game_id)

        logger.info(
            "WEBSOCKET disconnected game=%s client=%s room_clients=%d total_clients=%d",
            game_id,
            client_id,
            remaining_room_clients,
            self._total_clients(),
        )

    async def broadcast_to_room(self, game_id: str, message: dict):
        """
        Sends a message to every client in a game room.
        """
        if game_id not in self.active_connections:
            logger.debug("WEBSOCKET no clients for game=%s message=%s", game_id, message.get("type"))
            return

        disconnected_clients = []

        for client_id, websocket in self.active_connections[game_id].items():
            try:
                await websocket.send_json(message)
                logger.debug("WEBSOCKET sent message=%s game=%s client=%s", message.get("type"), game_id, client_id)
            except Exception as exc:
                logger.error(
                    "WEBSOCKET send error game=%s client=%s error=%s",
                    game_id,
                    client_id,
                    exc,
                )
                disconnected_clients.append(client_id)

        for client_id in disconnected_clients:
            self.disconnect(game_id, client_id)

    async def broadcast_to_all_rooms(self, message: dict):
        """
        Sends a message to every active room.
        """
        logger.debug("WEBSOCKET broadcasting message=%s rooms=%d", message.get("type"), len(self.active_connections))
        for game_id in list(self.active_connections.keys()):
            await self.broadcast_to_room(game_id, message)

    def get_room_clients_count(self, game_id: str) -> int:
        """
        Returns the number of connected clients in a room.
        """
        return len(self.active_connections.get(game_id, {}))

    def get_stats(self) -> dict:
        """
        Returns current connection statistics.
        """
        total_clients = self._total_clients()
        rooms_detail = {}

        for game_id, clients in self.active_connections.items():
            rooms_detail[game_id] = {
                "clients_count": len(clients),
                "client_ids": list(clients.keys()),
            }

        return {
            "total_rooms": len(self.active_connections),
            "total_clients": total_clients,
            "rooms": rooms_detail,
            "active": total_clients > 0,
        }

    def print_stats(self):
        """
        Debug helper for connection statistics.
        """
        logger.debug("WEBSOCKET stats=%s", self.get_stats())

    def _total_clients(self) -> int:
        return sum(len(clients) for clients in self.active_connections.values())


connection_manager = ConnectionManager()
