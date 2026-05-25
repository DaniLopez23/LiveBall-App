from typing import Literal

from pydantic import BaseModel

from app.schemas.stats import MatchStatsUpdateData


class StatsWebSocketMessage(BaseModel):
	type: Literal["match_stats_update"]
	game_id: str
	data: MatchStatsUpdateData
