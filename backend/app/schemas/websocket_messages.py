from typing import Literal

from pydantic import BaseModel

from app.schemas.stats import ParsedMatchStats


class StatsWebSocketMessage(BaseModel):
	type: Literal["new_stats", "updated_stats"]
	game_id: str
	data: ParsedMatchStats
