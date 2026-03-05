import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.websockets.websocket_manager import ConnectionManager

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/games/{game_id}")
async def game_websocket(websocket: WebSocket, game_id: str) -> None:
    manager: ConnectionManager = websocket.app.state.ws_manager
    cache = websocket.app.state.cache

    client_id = await manager.connect(websocket, game_id)

    # Mensaje de bienvenida
    await websocket.send_json({
        "type": "connection",
        "status": "connected",
        "client_id": client_id,
        "game_id": game_id,
        "message": f"Conectado al room {game_id}",
    })
    logger.info(f"💬 Mensaje de bienvenida enviado a {client_id}")

    # Enviar snapshot del estado actual si ya existe el partido en caché
    game = cache.games.get(game_id)
    if game:
        pass_networks_data = {}
        for (g_id, team_id), network_svc in cache.pass_networks.items():
            if g_id == game_id:
                pass_networks_data[str(team_id)] = {
                    "nodes": network_svc.get_nodes(),
                    "edges": network_svc.get_edges(),
                    "statistics": network_svc.get_statistics(),
                }

        await websocket.send_json({
            "type": "match_state_snapshot",
            "game_id": game_id,
            "game": game.model_dump(exclude={"events"}),
            "total_events": game.total_events,
            "last_event_id": game.events[-1].event_id if game.events else None,
            "events": [e.model_dump() for e in game.events],
            "pass_networks": pass_networks_data,
        })
        logger.info(
            f"📊 Estado del partido enviado a {client_id}: {game.total_events} eventos, "
            f"{len(pass_networks_data)} redes de pases"
        )

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong", "message": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(game_id, client_id)
        logger.info(f"🔌 WebSocket cerrado para {client_id}")

    except Exception as e:
        logger.error(f"❌ Error en WebSocket {client_id}: {e}")
        manager.disconnect(game_id, client_id)


    except Exception as e:
        logger.error(f"❌ Error en WebSocket {client_id}: {e}")
        manager.disconnect(game_id, client_id)
