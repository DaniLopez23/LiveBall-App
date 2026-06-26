import unittest

from app.api.v1.http.games import _with_processed_match_statuses
from app.schemas.games import AvailableMatch, AvailableMatchTeam
from app.services.events.constants import (
    MATCH_STATE_FIRST_PERIOD_ACTIVE,
    MATCH_STATE_FIRST_PERIOD_FINISHED,
    MATCH_STATE_MATCH_FINISHED,
    MATCH_STATE_PRE_MATCH,
    MATCH_STATE_SECOND_PERIOD_ACTIVE,
)
from app.state.game_state import GameStateCache


def make_match(game_id: str, status: str = "scheduled") -> AvailableMatch:
    return AvailableMatch(
        game_id=game_id,
        uid=f"g{game_id}",
        competition_id="competition-1",
        competition_name="Competition",
        season_id="season-1",
        season_name="Season",
        period="Pregame",
        status=status,
        home_team=AvailableMatchTeam(
            team_id="1",
            team_name="Home",
            side="Home",
        ),
        away_team=AvailableMatchTeam(
            team_id="2",
            team_name="Away",
            side="Away",
        ),
    )


class AvailableGamesStatusTests(unittest.TestCase):
    def test_processed_event_state_overrides_catalogue_status(self):
        states = {
            MATCH_STATE_PRE_MATCH: "scheduled",
            MATCH_STATE_FIRST_PERIOD_ACTIVE: "live",
            MATCH_STATE_FIRST_PERIOD_FINISHED: "paused",
            MATCH_STATE_SECOND_PERIOD_ACTIVE: "live",
            MATCH_STATE_MATCH_FINISHED: "finished",
        }

        for index, (processed_state, expected_status) in enumerate(states.items()):
            with self.subTest(processed_state=processed_state):
                cache = GameStateCache()
                game_id = str(index)
                cache.store_match_state(game_id, processed_state)

                matches = _with_processed_match_statuses(
                    [make_match(game_id, status="finished")],
                    cache,
                )

                self.assertEqual(matches[0].status, expected_status)

    def test_catalogue_status_is_retained_without_processed_events(self):
        cache = GameStateCache()

        matches = _with_processed_match_statuses(
            [make_match("game-1", status="postponed")],
            cache,
        )

        self.assertEqual(matches[0].status, "postponed")
