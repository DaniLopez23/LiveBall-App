import logging
from typing import Any, Dict, Optional

from app.schemas.games import ParsedGame
from app.state.game_state import GameStateCache

logger = logging.getLogger(__name__)


class GameChangeDetector:
    """Detects metadata and score changes for a parsed game."""

    def __init__(self, cache: GameStateCache) -> None:
        self._cache = cache

    def detect(self, game: ParsedGame) -> Optional[Dict[str, Any]]:
        """Returns a new_game/updated_game message, or None if unchanged."""
        game_id = game.game_id
        current = self._snapshot(game)

        if not self._cache.has_game(game_id):
            self._cache.store_game(game, current)
            logger.debug("(GAME) New game detected: %s", game_id)
            return {"type": "new_game", "game_id": game_id, "data": current}

        previous = self._cache.get_game_snapshot(game_id)
        if current != previous:
            self._cache.store_game(game, current)
            logger.debug("(GAME) Game updated: %s", game_id)
            return {"type": "updated_game", "game_id": game_id, "data": current}

        return None

    @staticmethod
    def _snapshot(game: ParsedGame) -> Dict[str, Any]:
        """Comparable game snapshot. Events are intentionally excluded."""
        return {
            "game_id": game.game_id,
            "competition_id": game.competition_id,
            "competition_name": game.competition_name,
            "season_id": game.season_id,
            "season_name": game.season_name,
            "matchday": game.matchday,
            "game_date": game.game_date,
            "period_1_start": game.period_1_start,
            "period_2_start": game.period_2_start,
            "home_team": {
                "team_id": game.home_team.team_id,
                "team_name": game.home_team.team_name,
                "team_official": game.home_team.team_official,
                "team_short": game.home_team.team_short,
                "score": game.home_team.score,
            },
            "away_team": {
                "team_id": game.away_team.team_id,
                "team_name": game.away_team.team_name,
                "team_official": game.away_team.team_official,
                "team_short": game.away_team.team_short,
                "score": game.away_team.score,
            },
        }
