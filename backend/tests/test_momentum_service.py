import unittest

from app.schemas.events import Event, Qualifier
from app.schemas.games import ParsedGame
from app.schemas.teams import TeamInGame
from app.services.momentum.service import (
    DefaultXTValueProvider,
    HeuristicXTProvider,
    MatchMomentumService,
    SoccerActionXTProvider,
    normalize_event_for_momentum,
)
from app.state.game_state import GameStateCache


class FakeXTProvider:
    def __init__(self):
        self.calls = []

    def score_bucket(self, events, home_team_id, away_team_id):
        self.calls.append([event.event_id for event in events])
        home_value = sum(0.1 for event in events if event.team_id == home_team_id)
        away_value = sum(0.2 for event in events if event.team_id == away_team_id)
        return round(home_value, 4), round(away_value, 4)


class UnavailableXTProvider:
    def score_bucket(self, events, home_team_id, away_team_id):
        return None


class RecoveringXTProvider:
    source = "socceraction_xT"

    def __init__(self):
        self.available = False

    def score_bucket(self, events, home_team_id, away_team_id):
        if not self.available:
            return None
        return 0.4, 0.0


class FakeXTModel:
    xT = [
        [0.01, 0.02],
        [0.03, 0.5],
    ]


def make_event(
    event_id: str,
    minute: int,
    team_id: str = "1",
    player_id: str = "10",
    with_end: bool = True,
    type_id: str = "1",
    event_name: str = "Pass",
    outcome: int = 1,
    x: float = 50,
    y: float = 50,
) -> Event:
    qualifiers = []
    if with_end:
        qualifiers = [
            Qualifier(qualifier_id="140", qualifier_name="Pass End X", value="60"),
            Qualifier(qualifier_id="141", qualifier_name="Pass End Y", value="40"),
        ]

    return Event(
        id=event_id,
        event_id=event_id,
        type_id=type_id,
        event_name=event_name,
        event_description="",
        period_id=1,
        min=minute,
        sec=0,
        player_id=player_id,
        team_id=team_id,
        outcome=outcome,
        x=x,
        y=y,
        qualifiers=qualifiers,
    )


def make_game(events: list[Event], match_id: str = "game-1") -> ParsedGame:
    return ParsedGame(
        game_id=match_id,
        competition_id="competition-1",
        competition_name="Competition",
        season_id="season-1",
        season_name="Season",
        home_team=TeamInGame(team_id="1", team_name="Home", score=0),
        away_team=TeamInGame(team_id="2", team_name="Away", score=0),
        events=events,
        total_events=len(events),
    )


class MatchMomentumServiceTests(unittest.TestCase):
    def test_normalizes_event_for_momentum_with_end_coordinates(self):
        normalized = normalize_event_for_momentum("game-1", make_event("e1", 2))

        self.assertEqual(normalized.match_id, "game-1")
        self.assertEqual(normalized.event_id, "1:e1")
        self.assertEqual(normalized.type_name, "pass")
        self.assertEqual(normalized.start_x, 50)
        self.assertEqual(normalized.end_x, 60)
        self.assertEqual(normalized.qualifiers[140], "60")

    def test_updates_current_minute_bucket_without_duplicate_points(self):
        cache = GameStateCache()
        provider = FakeXTProvider()
        service = MatchMomentumService(cache=cache, value_provider=provider)

        first_messages = service.update(make_game([make_event("e1", 0)]), events_changed=True)
        first_payload = cache.get_momentum_payload("game-1")

        self.assertEqual(first_messages, [])
        self.assertIsNotNone(first_payload)
        self.assertEqual(first_payload.intervalMinutes, 1)
        self.assertEqual(first_payload.triggerIntervalMinutes, 1)
        self.assertEqual(first_payload.windowMinutes, 3)
        self.assertEqual(first_payload.points[0].minute, 0)
        self.assertEqual(first_payload.points[0].homeValue, 0.1)

        updated_messages = service.update(
            make_game([make_event("e1", 0), make_event("e2", 1, team_id="2")]),
            events_changed=True,
        )
        updated_payload = cache.get_momentum_payload("game-1")
        points = updated_payload.model_dump()["points"]

        self.assertEqual(updated_messages, [])
        self.assertEqual(len(points), 2)
        self.assertEqual(points[0]["minute"], 0)
        self.assertEqual(points[0]["homeValue"], 0.1)
        self.assertEqual(points[0]["awayValue"], 0.0)
        self.assertEqual(points[1]["minute"], 1)
        self.assertEqual(points[1]["awayValue"], 0.2)
        self.assertEqual(points[1]["awayMomentum"], -0.2)
        self.assertEqual(points[1]["netMomentum"], -0.1)

    def test_adds_new_minute_bucket_when_match_minute_advances(self):
        cache = GameStateCache()
        service = MatchMomentumService(cache=cache, value_provider=FakeXTProvider())

        service.update(make_game([make_event("e1", 1)]), events_changed=True)
        messages = service.update(
            make_game([make_event("e1", 1), make_event("e2", 3, team_id="2")]),
            events_changed=True,
        )

        points = cache.get_momentum_payload("game-1").model_dump()["points"]
        self.assertEqual(messages, [])
        self.assertEqual([point["minute"] for point in points], [0, 1, 2, 3])
        self.assertEqual(points[3]["awayValue"], 0.2)

    def test_keeps_momentum_event_cache_deduplicated(self):
        cache = GameStateCache()
        service = MatchMomentumService(cache=cache, value_provider=FakeXTProvider())
        game = make_game([make_event("e1", 0), make_event("e1", 0)])

        service.update(game, events_changed=True)

        self.assertEqual(len(cache.get_momentum_events("game-1")), 1)

    def test_keeps_momentum_payloads_independent_by_match(self):
        cache = GameStateCache()
        service = MatchMomentumService(cache=cache, value_provider=FakeXTProvider())

        service.update(make_game([make_event("e1", 3)], match_id="game-1"), True)
        service.update(make_game([make_event("e2", 6)], match_id="game-2"), True)

        self.assertEqual(
            [point.minute for point in cache.get_momentum_payload("game-1").points],
            [0, 1, 2, 3],
        )
        self.assertEqual(
            [point.minute for point in cache.get_momentum_payload("game-2").points],
            [0, 1, 2, 3, 4, 5, 6],
        )

    def test_default_provider_falls_back_when_socceraction_is_unavailable(self):
        cache = GameStateCache()
        service = MatchMomentumService(
            cache=cache,
            value_provider=DefaultXTValueProvider(primary=UnavailableXTProvider()),
        )

        service.update(make_game([make_event("e1", 0)]), events_changed=True)

        payload = cache.get_momentum_payload("game-1")
        self.assertIsNotNone(payload)
        self.assertEqual(payload.source, "heuristic_xT")
        self.assertGreater(payload.points[0].homeValue, 0)

    def test_socceraction_provider_scores_shots_without_end_coordinates(self):
        provider = SoccerActionXTProvider()
        provider._model = FakeXTModel()
        shot = normalize_event_for_momentum(
            "1",
            make_event(
                "shot-1",
                12,
                with_end=False,
                type_id="16",
                event_name="Goal",
                x=80,
                y=40,
            ),
        )

        home_value, away_value = provider.score_bucket([shot], "1", "2")

        self.assertGreater(home_value, 0)
        self.assertEqual(away_value, 0)

    def test_heuristic_provider_scores_missed_shots(self):
        provider = HeuristicXTProvider()
        shot = normalize_event_for_momentum(
            "1",
            make_event(
                "shot-1",
                12,
                with_end=False,
                type_id="13",
                event_name="Miss",
                outcome=0,
                x=88,
                y=48,
            ),
        )

        home_value, away_value = provider.score_bucket([shot], "1", "2")

        self.assertGreater(home_value, 0)
        self.assertEqual(away_value, 0)

    def test_uses_rolling_window_for_minute_points(self):
        cache = GameStateCache()
        service = MatchMomentumService(cache=cache, value_provider=FakeXTProvider())

        service.update(
            make_game(
                [
                    make_event("e1", 0),
                    make_event("e2", 1, team_id="2"),
                    make_event("e3", 3, team_id="2"),
                ]
            ),
            events_changed=True,
        )

        points = cache.get_momentum_payload("game-1").model_dump()["points"]
        self.assertEqual(points[1]["homeValue"], 0.1)
        self.assertEqual(points[1]["awayValue"], 0.2)
        self.assertEqual(points[3]["homeValue"], 0.0)
        self.assertEqual(points[3]["awayValue"], 0.4)

    def test_default_provider_retries_primary_after_fallback(self):
        cache = GameStateCache()
        primary = RecoveringXTProvider()
        service = MatchMomentumService(
            cache=cache,
            value_provider=DefaultXTValueProvider(primary=primary),
        )

        service.update(make_game([make_event("e1", 0)]), events_changed=True)
        self.assertEqual(cache.get_momentum_payload("game-1").source, "heuristic_xT")

        primary.available = True
        service.refresh_payload(
            make_game([make_event("e1", 0)]),
            force=True,
            refresh_all_buckets=True,
        )

        payload = cache.get_momentum_payload("game-1")
        self.assertEqual(payload.source, "socceraction_xT")
        self.assertEqual(payload.points[0].homeValue, 0.4)

    def test_returns_no_message_when_xt_provider_is_unavailable(self):
        cache = GameStateCache()
        service = MatchMomentumService(
            cache=cache,
            value_provider=UnavailableXTProvider(),
        )

        messages = service.update(make_game([make_event("e1", 0)]), events_changed=True)

        self.assertEqual(messages, [])
        self.assertIsNone(cache.get_momentum_payload("game-1"))


if __name__ == "__main__":
    unittest.main()
