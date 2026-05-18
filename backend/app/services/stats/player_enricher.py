from app.schemas.stats import ParsedMatchStats, PlayerBrief
from app.services.players.service import PlayersService


class StatsPlayerEnricher:
    """Adds compact player payloads to booking and goal stats."""

    def __init__(self, players_service: PlayersService) -> None:
        self._players_service = players_service

    def enrich(self, parsed_stats: ParsedMatchStats) -> None:
        for team in parsed_stats.teams:
            for booking in team.bookings:
                player = self._players_service.get_player_brief(
                    team.team_id,
                    booking.player_ref,
                )
                booking.player = PlayerBrief(**player)

            for goal in team.goals:
                player = self._players_service.get_player_brief(
                    team.team_id,
                    goal.player_ref,
                )
                goal.player = PlayerBrief(**player)
