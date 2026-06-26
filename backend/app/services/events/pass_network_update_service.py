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
        pass_deletions_by_team: Dict[str, List[str]] | None = None,
    ) -> List[Dict[str, Any]]:
        messages: List[Dict[str, Any]] = []
        player_names: Dict[tuple[str, str], str] = {}
        pass_deletions_by_team = pass_deletions_by_team or {}

        def get_player_name(team_id: str, player_id: str) -> str:
            key = (str(team_id), str(player_id))
            if key not in player_names:
                brief = self._players_service.get_player_brief(team_id, player_id)
                player_names[key] = brief.get("name") or ""
            return player_names[key]

        team_ids = sorted(
            set(pass_candidates_by_team.keys()) | set(pass_deletions_by_team.keys())
        )
        match_time_seconds = self._get_match_time_seconds(game)

        for team_id in team_ids:
            team_events = pass_candidates_by_team.get(team_id, [])
            deleted_event_ids = pass_deletions_by_team.get(team_id, [])
            if not team_events and not deleted_event_ids:
                continue

            existing_service = self._cache.get_pass_network(game.game_id, team_id)
            service = self._cache.get_or_create_pass_network(game.game_id, team_id)
            (
                changed_nodes,
                changed_edges,
                changed_bucket_indices,
                changed_temporal_bucket_indices,
            ) = (
                service.add_passes_incremental(
                    team_events,
                    player_name_lookup=get_player_name,
                    deleted_event_ids=deleted_event_ids,
                )
            )

            if not changed_nodes and not changed_edges and not changed_temporal_bucket_indices:
                continue

            action = "created" if existing_service is None else "updated"
            logger.info(
                "PASS_NETWORK game=%s team=%s %s passes=%d deleted=%d nodes=%d edges=%d buckets=%d temporal=%d",
                game.game_id,
                team_id,
                action,
                len(team_events),
                len(deleted_event_ids),
                len(changed_nodes),
                len(changed_edges),
                len(changed_bucket_indices),
                len(changed_temporal_bucket_indices),
            )
            logger.debug(
                "(PASS_NETWORK) game=%s team=%s node_ids=%s edges=%s buckets=%s",
                game.game_id,
                team_id,
                [node.get("player_id") for node in changed_nodes],
                [
                    (edge.get("from_player_id"), edge.get("to_player_id"))
                    for edge in changed_edges
                ],
                changed_bucket_indices,
            )

            statistics = self._get_statistics_delta(
                game.game_id,
                team_id,
                changed_bucket_indices,
            )
            temporal = service.get_temporal_payload(
                match_time_seconds=match_time_seconds,
                bucket_indices=changed_temporal_bucket_indices,
            )
            messages.append(
                {
                    "type": "pass_network_updated",
                    "game_id": game.game_id,
                    "team_id": team_id,
                    "nodes": changed_nodes,
                    "edges": changed_edges,
                    "statistics": statistics,
                    "temporal": temporal,
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

    @staticmethod
    def _get_match_time_seconds(game: ParsedGame) -> int:
        latest_second = 0
        for event in game.events:
            latest_second = max(
                latest_second,
                PassNetworkUpdateService._event_match_second(event),
            )
        return latest_second

    @staticmethod
    def _event_match_second(event: Event) -> int:
        minute = max(0, int(event.min or 0))
        second = max(0, min(59, int(event.sec or 0)))
        period_id = event.period_id
        period_offsets = {1: 0, 2: 45, 3: 90, 4: 105, 5: 120}
        period_offset = period_offsets.get(period_id or 0, 0)
        absolute_minute = minute if minute >= period_offset else period_offset + minute
        return absolute_minute * 60 + second
