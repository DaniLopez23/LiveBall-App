from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from contextlib import asynccontextmanager
from pathlib import Path
import asyncio
import logging
from dotenv import load_dotenv

from app.api.v1.api import api_router
from app.core.logging import setup_logging
from app.websockets.event_broadcaster import broadcast_message
from app.state.game_state import GameStateCache
from app.services.process_events_service import ProcessEventsService
from app.websockets.websocket_manager import ConnectionManager
from app.workers.xml_file_watcher import watch_xml_file

load_dotenv()
setup_logging()

logger = logging.getLogger(__name__)

BASE_DIR_SIMULATED_DATA = Path(__file__).parent.parent.parent / "simulated-real-time-data" # → root/ (para acceder a simulated-data)

SIMULATED_FILE_NAME = "simulated-data.xml"  # Nombre del archivo XML simulado dentro de simulated-data/

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("⚙️ Iniciando servidor...")

    cache = GameStateCache()
    process_service = ProcessEventsService(cache=cache)
    ws_manager = ConnectionManager()

    # Expose via app.state for use in HTTP/WebSocket endpoints
    app.state.cache = cache
    app.state.process_service = process_service
    app.state.ws_manager = ws_manager

    async def on_new_data(messages):
        for msg in messages:
            logger.info("📦 %s – game %s", msg.get("type"), msg.get("game_id"))
            await broadcast_message(msg, ws_manager)

    task = asyncio.create_task(
        watch_xml_file(
            poll_interval=3,
            on_new_data=on_new_data,
            file_path=str(BASE_DIR_SIMULATED_DATA / SIMULATED_FILE_NAME),
            process_service=process_service,
        )
    )
    logger.info("✅ Monitoreo de archivos XML iniciado")

    yield

    # Shutdown
    logger.info("🛑 Servidor apagándose...")
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass

app = FastAPI(
    title="Real-Time Football Dashboard API",
    description="API para el dashboard de fútbol en tiempo real",
    version="1.0.0",
    lifespan=lifespan
)

# Configurar CORS
origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Alternativa
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)