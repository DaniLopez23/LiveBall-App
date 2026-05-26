import unittest

from app.schemas.events import Event, Qualifier
from app.schemas.games import ParsedGame
from app.schemas.teams import TeamInGame
from app.services.momentum.service import MatchMomentumService, normalize_event_for_momentum
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


def make_event(
    event_id: str,
    minute: int,
    team_id: str = "1",
    player_id: str = "10",
    with_end: bool = True,
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
        type_id="1",
        event_name="Pass",
        event_description="",
        period_id=1,
        min=minute,
        sec=0,
        player_id=player_id,
        team_id=team_id,
        outcome=1,
        x=50,
        y=50,
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

    def test_updates_current_three_minute_bucket_without_duplicate_points(self):
        cache = GameStateCache()
        provider = FakeXTProvider()
        service = MatchMomentumService(cache=cache, value_provider=provider)

        first_messages = service.update(make_game([make_event("e1", 0)]), events_changed=True)
        self.assertEqual(first_messages[0]["type"], "match_momentum_update")
        self.assertEqual(first_messages[0]["data"]["intervalMinutes"], 3)
        self.assertEqual(first_messages[0]["data"]["triggerIntervalMinutes"], 2)
        self.assertEqual(first_messages[0]["data"]["points"][0]["minute"], 0)
        self.assertEqual(first_messages[0]["data"]["points"][0]["homeValue"], 0.1)

        updated_messages = service.update(
            make_game([make_event("e1", 0), make_event("e2", 1, team_id="2")]),
            events_changed=True,
        )
        points = updated_messages[0]["data"]["points"]

        self.assertEqual(len(points), 1)
        self.assertEqual(points[0]["minute"], 0)
        self.assertEqual(points[0]["homeValue"], 0.1)
        self.assertEqual(points[0]["awayValue"], 0.2)
        self.assertEqual(points[0]["awayMomentum"], -0.2)
        self.assertEqual(points[0]["netMomentum"], -0.1)

    def test_adds_new_three_minute_bucket_when_trigger_advances(self):
        cache = GameStateCache()
        service = MatchMomentumService(cache=cache, value_provider=FakeXTProvider())

        service.update(make_game([make_event("e1", 1)]), events_changed=True)
        messages = service.update(
            make_game([make_event("e1", 1), make_event("e2", 3, team_id="2")]),
            events_changed=True,
        )

        points = messages[0]["data"]["points"]
        self.assertEqual([point["minute"] for point in points], [0, 3])
        self.assertEqual(points[1]["awayValue"], 0.2)

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
            [0, 3],
        )
        self.assertEqual(
            [point.minute for point in cache.get_momentum_payload("game-2").points],
            [0, 3, 6],
        )

    def test_returns_no_message_when_xt_provider_is_unavailable(self):
        service = MatchMomentumService(
            cache=GameStateCache(),
            value_provider=UnavailableXTProvider(),
        )

        messages = service.update(make_game([make_event("e1", 0)]), events_changed=True)

        self.assertEqual(messages, [])


if __name__ == "__main__":
    unittest.main()
