import logging
from typing import Any, Dict, List

from app.schemas.events import Event
from app.schemas.games import ParsedGame
from app.services.players.service import PlayersService
from app.state.game_state import GameStateCache

logger = logging.getLogger(__name__)


class PassNetworkUpdateService:
    """Applies resolved pass candidates to team pass networks and builds deltas."""

    def __init__(self, cache: GameStateCache, players_service: PlayersService) -> None:
        self._cache = cache
        self._players_service = players_service

    def update(
        self,
        game: ParsedGame,
        pass_candidates_by_team: Dict[str, List[Event]],
    ) -> List[Dict[str, Any]]:
        messages: List[Dict[str, Any]] = []
        player_names: Dict[tuple[str, str], str] = {}

        def get_player_name(team_id: str, player_id: str) -> str:
            key = (str(team_id), str(player_id))
            if key not in player_names:
                brief = self._players_service.get_player_brief(team_id, player_id)
                player_names[key] = brief.get("name") or ""
            return player_names[key]

        for team_id, team_events in pass_candidates_by_team.items():
            if not team_events:
                continue

            service = self._cache.get_or_create_pass_network(game.game_id, team_id)
            changed_nodes, changed_edges, changed_bucket_indices = (
                service.add_passes_incremental(
                    team_events,
                    player_name_lookup=get_player_name,
                )
            )

            if not changed_nodes and not changed_edges:
                continue

            logger.debug(
                "(PASS_NETWORK) Game %s team %s - pass network updated (%d nodes, %d edges)",
                game.game_id,
                team_id,
                len(changed_nodes),
                len(changed_edges),
            )

            statistics = self._get_statistics_delta(
                game.game_id,
                team_id,
                changed_bucket_indices,
            )
            messages.append(
                {
                    "type": "pass_network_updated",
                    "game_id": game.game_id,
                    "team_id": team_id,
                    "nodes": changed_nodes,
                    "edges": changed_edges,
                    "statistics": statistics,
                }
            )

        return messages

    def _get_statistics_delta(
        self,
        game_id: str,
        team_id: str,
        changed_bucket_indices: List[int],
    ) -> Dict[str, Any]:
        service = self._cache.get_or_create_pass_network(game_id, team_id)
        cached_statistics = self._cache.get_pass_network_statistics(game_id, team_id)

        if cached_statistics:
            statistics = service.get_bucket_statistics(bucket_indices=changed_bucket_indices)
            self._cache.merge_pass_network_statistics(game_id, team_id, statistics)
            return statistics

        statistics = service.get_bucket_statistics()
        self._cache.store_pass_network_statistics(game_id, team_id, statistics)
        return statistics
