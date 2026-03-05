'''
Aggregator of Routers for API v1
'''
from fastapi import APIRouter

from app.api.v1.http import events, games
from app.api.v1.websockets import games as ws_games

api_router = APIRouter()

api_router.include_router(games.router, prefix="/games", tags=["games"])
api_router.include_router(events.router, prefix="/events", tags=["events"])
api_router.include_router(ws_games.router, tags=["websockets"])
