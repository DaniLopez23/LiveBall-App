import logging
from typing import Any, Dict, List, Literal, Optional

from app.schemas.stats import ParsedMatchStats
from app.schemas.websocket_messages import StatsWebSocketMessage
from app.services.players.service import PlayersService
from app.services.stats.player_enricher import StatsPlayerEnricher
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
        self._player_enricher = StatsPlayerEnricher(self._players_service)

    def process_game(self, parsed_stats: ParsedMatchStats) -> List[Dict[str, Any]]:
        self._player_enricher.enrich(parsed_stats)
        current = parsed_stats.model_dump()
        game_id = parsed_stats.game_id

        if not self._cache.has_stats(game_id):
            self._cache.store_stats(parsed_stats, current)
            logger.debug("(STATS) New stats detected: %s", game_id)
            return [self._message("new_stats", parsed_stats)]

        previous = self._cache.get_stats_snapshot(game_id)
        if previous != current:
            self._cache.store_stats(parsed_stats, current)
            logger.debug("(STATS) Stats updated: %s", game_id)
            return [self._message("updated_stats", parsed_stats)]

        return []

    @staticmethod
    def _message(
        message_type: Literal["new_stats", "updated_stats"],
        parsed_stats: ParsedMatchStats,
    ) -> Dict[str, Any]:
        return StatsWebSocketMessage(
            type=message_type,
            game_id=parsed_stats.game_id,
            data=parsed_stats,
        ).model_dump()
