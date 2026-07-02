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

    def test_processed_goal_events_override_catalogue_score(self):
        cache = GameStateCache()
        cache.store_match_state("game-1", MATCH_STATE_SECOND_PERIOD_ACTIVE)
        cache.store_exported_event(
            "game-1",
            "1",
            "goal-home",
            {"type_id": "16", "team_id": "1"},
        )
        cache.store_exported_event(
            "game-1",
            "2",
            "goal-away",
            {"type_id": "16", "team_id": "2"},
        )
        cache.store_exported_event(
            "game-1",
            "2",
            "own-goal-away",
            {"type_id": "16", "team_id": "2", "own_goal": True},
        )
        cache.store_exported_event(
            "game-1",
            "1",
            "shot-not-goal",
            {
                "type_id": "15",
                "team_id": "1",
                "period_id": 2,
                "min": 12,
                "sec": 10,
            },
        )
        catalogue_match = make_match("game-1")
        catalogue_match = catalogue_match.model_copy(
            update={
                "home_team": catalogue_match.home_team.model_copy(
                    update={"score": 7}
                ),
                "away_team": catalogue_match.away_team.model_copy(
                    update={"score": 6}
                ),
            }
        )

        [match] = _with_processed_match_statuses([catalogue_match], cache)

        self.assertEqual(match.home_team.score, 2)
        self.assertEqual(match.away_team.score, 1)
        self.assertEqual(match.current_minute, 57)
