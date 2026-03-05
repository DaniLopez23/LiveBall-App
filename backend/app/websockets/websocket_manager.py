import asyncio
import json
import logging
from typing import Dict, List, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Gestiona conexiones WebSocket organizadas por rooms (game_id).
    Permite enviar mensajes a todos los clientes de un room específico.
    """
    
    def __init__(self):
        # Estructura: {game_id: {client_id: websocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.client_counter = 0
    
    async def connect(self, websocket: WebSocket, game_id: str) -> str:
        """
        Conecta un nuevo cliente a un room específico.
        
        Args:
            websocket: Conexión WebSocket
            game_id: ID del juego (room)
            
        Returns:
            client_id: ID único del cliente
        """
        await websocket.accept()
        
        # Crear room si no existe
        if game_id not in self.active_connections:
            self.active_connections[game_id] = {}
            logger.info(f"🆕 Nuevo room creado: {game_id}")
        
        # Generar ID único para el cliente
        self.client_counter += 1
        client_id = f"client_{self.client_counter}"
        
        # Añadir cliente al room
        self.active_connections[game_id][client_id] = websocket
        
        logger.info(f"✅ [CONEXIÓN] Cliente {client_id} conectado al room {game_id}")
        # logger.info(f"📊 [STATS] Clientes en room {game_id}: {len(self.active_connections[game_id])}")
        # logger.info(f"📊 [STATS] Total de rooms activos: {len(self.active_connections)}")
        # logger.info(f"📊 [STATS] Total de clientes: {sum(len(clients) for clients in self.active_connections.values())}")
        
        return client_id
    
    def disconnect(self, game_id: str, client_id: str):
        """
        Desconecta un cliente de un room.
        
        Args:
            game_id: ID del juego
            client_id: ID del cliente
        """
        if game_id in self.active_connections:
            if client_id in self.active_connections[game_id]:
                del self.active_connections[game_id][client_id]
                logger.info(f"❌ [DESCONEXIÓN] Cliente {client_id} desconectado del room {game_id}")
                #logger.info(f"📊 [STATS] Clientes restantes en room {game_id}: {len(self.active_connections[game_id])}")
                
                # Eliminar room si está vacío
                if not self.active_connections[game_id]:
                    del self.active_connections[game_id]
                    logger.info(f"🗑️  [CLEANUP] Room {game_id} eliminado (sin clientes)")
                
                #logger.info(f"📊 [STATS] Total de rooms activos: {len(self.active_connections)}")
                #logger.info(f"📊 [STATS] Total de clientes: {sum(len(clients) for clients in self.active_connections.values())}")
    
    async def broadcast_to_room(self, game_id: str, message: dict):
        """
        Envía un mensaje a todos los clientes de un room específico.
        
        Args:
            game_id: ID del juego
            message: Diccionario con los datos a enviar
        """
        if game_id not in self.active_connections:
            logger.warning(f"⚠️  No hay clientes conectados al room {game_id}. Conexiones activas: {self.active_connections if self.active_connections else '0'}")
            return
        
        disconnected_clients = []
        
        for client_id, websocket in self.active_connections[game_id].items():
            try:
                await websocket.send_json(message)
                # logger.debug(f"📤 Mensaje enviado a {client_id} en room {game_id}")
            except Exception as e:
                logger.error(f"❌ Error enviando mensaje a {client_id}: {e}")
                disconnected_clients.append(client_id)
        
        # Limpiar clientes desconectados
        for client_id in disconnected_clients:
            self.disconnect(game_id, client_id)
    
    async def broadcast_to_all_rooms(self, message: dict):
        """
        Envía un mensaje a todos los clientes de todos los rooms.
        
        Args:
            message: Diccionario con los datos a enviar
        """
        logger.info(f"📡 Broadcasting a {len(self.active_connections)} rooms")
        
        for game_id in list(self.active_connections.keys()):
            await self.broadcast_to_room(game_id, message)
    
    def get_room_clients_count(self, game_id: str) -> int:
        """
        Retorna el número de clientes conectados a un room.
        
        Args:
            game_id: ID del juego
            
        Returns:
            Número de clientes conectados
        """
        return len(self.active_connections.get(game_id, {}))
    
    def get_stats(self) -> dict:
        """
        Retorna estadísticas de conexiones.
        
        Returns:
            Diccionario con stats
        """
        total_clients = sum(len(clients) for clients in self.active_connections.values())
        
        rooms_detail = {}
        for game_id, clients in self.active_connections.items():
            rooms_detail[game_id] = {
                "clients_count": len(clients),
                "client_ids": list(clients.keys())
            }
        
        return {
            "total_rooms": len(self.active_connections),
            "total_clients": total_clients,
            "rooms": rooms_detail,
            "active": total_clients > 0
        }
    
    def print_stats(self):
        """
        Imprime estadísticas de conexiones en el log.
        """
        stats = self.get_stats()
        logger.info("\n" + "="*60)
        logger.info("📊 ESTADO DE CONEXIONES WEBSOCKET")
        logger.info("="*60)
        logger.info(f"Total de rooms activos: {stats['total_rooms']}")
        logger.info(f"Total de clientes: {stats['total_clients']}")
        
        if stats['rooms']:
            logger.info("\nDetalle por room:")
            for game_id, room_info in stats['rooms'].items():
                logger.info(f"  • Room '{game_id}': {room_info['clients_count']} cliente(s)")
                for client_id in room_info['client_ids']:
                    logger.info(f"    - {client_id}")
        else:
            logger.info("\n⚠️  No hay conexiones activas")
        
        logger.info("="*60 + "\n")


# Instancia global del manager
connection_manager = ConnectionManager()
