import logging
from typing import Any, Dict, List, Optional

from app.schemas.websocket_messages import StatsWebSocketMessage
from app.schemas.stats import ParsedMatchStats, PlayerBrief
from app.services.players_service import PlayersService
from app.state.game_state import GameStateCache

logger = logging.getLogger(__name__)


class ProcessStatsService:
	"""Detects changes in parsed F9 stats payloads and emits update messages."""

	def __init__(
		self,
		cache: Optional[GameStateCache] = None,
		players_service: Optional[PlayersService] = None,
	) -> None:
		self._cache = cache or GameStateCache()
		self._players_service = players_service or PlayersService()

	def _enrich_players(self, parsed_stats: ParsedMatchStats) -> None:
		"""Adds a compact player object to booking/goal entries."""
		for team in parsed_stats.teams:
			for booking in team.bookings:
				player = self._players_service.get_player_brief(team.team_id, booking.player_ref)
				booking.player = PlayerBrief(**player)

			for goal in team.goals:
				player = self._players_service.get_player_brief(team.team_id, goal.player_ref)
				goal.player = PlayerBrief(**player)

	def _stats_snapshot(self, parsed_stats: ParsedMatchStats) -> Dict[str, Any]:
		return parsed_stats.model_dump()

	def process_game(self, parsed_stats: ParsedMatchStats) -> List[Dict[str, Any]]:
		self._enrich_players(parsed_stats)
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
