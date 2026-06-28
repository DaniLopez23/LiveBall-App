from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from contextlib import asynccontextmanager
from pathlib import Path
import asyncio
import logging
import os
from dotenv import load_dotenv

from app.api.v1.api import api_router
from app.core.logging import get_log_level, setup_logging
from app.websockets.event_broadcaster import broadcast_message
from app.state.game_state import GameStateCache
from app.services.events.processing_service import ProcessEventsService
from app.services.games.catalog_service import MatchCatalogService
from app.services.stats.processing_service import ProcessStatsService
from app.websockets.websocket_manager import ConnectionManager
from app.workers.xml_file_watcher import f24_events_xml_watcher, f9_stats_xml_watcher

BACKEND_DIR = Path(__file__).resolve().parents[1]
BASE_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")
load_dotenv(BACKEND_DIR / ".env.dev")
setup_logging()

logger = logging.getLogger(__name__)

BASE_DIR_SIMULATED_DATA = BASE_DIR / "simulated-real-time-data"

DEFAULT_F24_EVENTS_XML_PATH = BASE_DIR_SIMULATED_DATA / "events"
DEFAULT_F9_STATS_XML_PATH = BASE_DIR_SIMULATED_DATA / "stats"
DEFAULT_F40_PLAYERS_XML_PATH = (
    BASE_DIR_SIMULATED_DATA / "players" / "F40-squad-23.xml"
)
DEFAULT_F42_MATCHES_XML_PATH = (
    BASE_DIR_SIMULATED_DATA / "schedule" / "f42-23-2023-results.xml"
)


def _path_from_env(*names: str, default: Path) -> str:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return str(default)


def _int_from_env(name: str, default: int) -> int:
    value = os.getenv(name)
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning("Invalid integer env %s=%r. Using default=%s", name, value, default)
        return default


def _cors_origins() -> list[str]:
    configured = os.getenv("CORS_ORIGINS") or os.getenv("FRONTEND_URL", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    environment = os.getenv("ENVIRONMENT", "development").lower()
    if environment not in {"development", "dev", "local"}:
        return list(dict.fromkeys(origins))

    local_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]
    return list(dict.fromkeys([*origins, *local_origins]))


def _xml_source_available(path_value: str, pattern: str) -> bool:
    path = Path(path_value)
    try:
        if path.is_file():
            return path.stat().st_size > 0
        if not path.is_dir():
            return False
        return any(file.stat().st_size > 0 for file in path.glob(pattern) if file.is_file())
    except OSError:
        return False


F24_EVENTS_XML_PATH = _path_from_env(
    "F24_XML_DIR",
    "F24_XML_PATH",
    "LIVE_XML_PATH",
    default=DEFAULT_F24_EVENTS_XML_PATH,
)
F9_STATS_XML_PATH = _path_from_env(
    "F9_XML_DIR",
    "F9_XML_PATH",
    "STATS_XML_PATH",
    default=DEFAULT_F9_STATS_XML_PATH,
)
F40_PLAYERS_XML_PATH = _path_from_env(
    "F40_XML_PATH",
    default=DEFAULT_F40_PLAYERS_XML_PATH,
)
F42_MATCHES_XML_PATH = _path_from_env(
    "F42_XML_PATH",
    default=DEFAULT_F42_MATCHES_XML_PATH,
)
F24_POLL_INTERVAL_SECONDS = _int_from_env(
    "F24_POLL_INTERVAL_SECONDS",
    _int_from_env("XML_POLL_INTERVAL_SECONDS", 3),
)
F9_POLL_INTERVAL_SECONDS = _int_from_env(
    "F9_POLL_INTERVAL_SECONDS",
    _int_from_env("STATS_XML_POLL_INTERVAL_SECONDS", 60),
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("APP starting log_level=%s", get_log_level())

    cache = GameStateCache()
    process_events_service = ProcessEventsService(cache=cache)
    process_stats_service = ProcessStatsService(cache=cache)
    match_catalog_service = MatchCatalogService(F42_MATCHES_XML_PATH)
    ws_manager = ConnectionManager()

    # Expose via app.state for use in HTTP/WebSocket endpoints
    app.state.cache = cache
    app.state.process_service = process_events_service
    app.state.process_stats_service = process_stats_service
    app.state.match_catalog_service = match_catalog_service
    app.state.ws_manager = ws_manager

    try:
        available_matches = match_catalog_service.get_available_matches()
        logger.info(
            "APP F42 match catalogue loaded file=%s matches=%d",
            F42_MATCHES_XML_PATH,
            len(available_matches),
        )
    except (OSError, ValueError):
        logger.exception(
            "APP could not load F42 match catalogue file=%s",
            F42_MATCHES_XML_PATH,
        )

    async def on_new_data(messages):
        for msg in messages:
            logger.debug("(BROADCAST) message=%s game=%s", msg.get("type"), msg.get("game_id"))
            await broadcast_message(msg, ws_manager)

    events_task = asyncio.create_task(
        f24_events_xml_watcher(
            poll_interval=F24_POLL_INTERVAL_SECONDS,
            on_new_data=on_new_data,
            file_path=F24_EVENTS_XML_PATH,
            process_service=process_events_service,
        )
    )
    stats_task = asyncio.create_task(
        f9_stats_xml_watcher(
            poll_interval=F9_POLL_INTERVAL_SECONDS,
            on_new_data=on_new_data,
            file_path=F9_STATS_XML_PATH,
            process_service=process_stats_service,
        )
    )
    logger.info(
        "APP xml watchers scheduled f24=%s f9=%s f42=%s",
        F24_EVENTS_XML_PATH,
        F9_STATS_XML_PATH,
        F42_MATCHES_XML_PATH,
    )

    yield

    # Shutdown
    logger.info("APP shutting down")
    tasks = [events_task, stats_task]
    for task in tasks:
        task.cancel()

    for task in tasks:
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
origins = _cors_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health_check():
    return {"status": "ok"}


@app.get("/ready", tags=["health"])
async def readiness_check():
    checks = {
        "f24": _xml_source_available(F24_EVENTS_XML_PATH, "f24-*.xml"),
        "f9": _xml_source_available(F9_STATS_XML_PATH, "f9-*.xml"),
        "f40": _xml_source_available(F40_PLAYERS_XML_PATH, "*.xml"),
        "f42": _xml_source_available(F42_MATCHES_XML_PATH, "*.xml"),
    }
    if not all(checks.values()):
        raise HTTPException(
            status_code=503,
            detail={"status": "not_ready", "checks": checks},
        )
    return {"status": "ready", "checks": checks}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level=get_log_level().lower())
