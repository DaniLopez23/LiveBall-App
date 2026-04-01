import logging
from typing import Any, Dict, List, Optional

from app.schemas.websocket_messages import StatsWebSocketMessage
from app.schemas.stats import ParsedMatchStats
from app.state.game_state import GameStateCache

logger = logging.getLogger(__name__)


class ProcessStatsService:
	"""Detects changes in parsed F9 stats payloads and emits update messages."""

	def __init__(self, cache: Optional[GameStateCache] = None) -> None:
		self._cache = cache or GameStateCache()

	def _stats_snapshot(self, parsed_stats: ParsedMatchStats) -> Dict[str, Any]:
		return parsed_stats.model_dump()

	def process_game(self, parsed_stats: ParsedMatchStats) -> List[Dict[str, Any]]:
		current = self._stats_snapshot(parsed_stats)
		game_id = parsed_stats.game_id

		if not self._cache.has_stats(game_id):
			self._cache.store_stats(parsed_stats, current)
			logger.debug("(STATS) New stats detected: %s", game_id)
			message = StatsWebSocketMessage(
				type="new_stats",
				game_id=game_id,
				data=parsed_stats,
			)
			return [message.model_dump()]

		previous = self._cache.get_stats_snapshot(game_id)
		if previous != current:
			self._cache.store_stats(parsed_stats, current)
			logger.debug("(STATS) Stats updated: %s", game_id)
			message = StatsWebSocketMessage(
				type="updated_stats",
				game_id=game_id,
				data=parsed_stats,
			)
			return [message.model_dump()]

		return []
