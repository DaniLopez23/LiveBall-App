import unittest

from app.schemas.events import Event, Qualifier
from app.schemas.games import ParsedGame, ParsedGamesRoot
from app.schemas.teams import TeamInGame
from app.services.events.processing_service import ProcessEventsService
from app.state.game_state import GameStateCache


class StubPlayersService:
    def get_player_brief(self, team_id, player_id):
        return {
            "id": player_id,
            "name": f"Player {player_id}",
            "dorsal": None,
        }


def make_event(
    event_id: str,
    type_id: str,
    player_id: str = "p1",
    team_id: str = "1",
    outcome: int | None = 1,
    minute: int = 1,
) -> Event:
    qualifiers = []
    if type_id == "1":
        qualifiers = [
            Qualifier(qualifier_id="140", qualifier_name="Pass End X", value="50"),
            Qualifier(qualifier_id="141", qualifier_name="Pass End Y", value="50"),
        ]

    return Event(
        id=event_id,
        event_id=event_id,
        type_id=type_id,
        event_name=f"type {type_id}",
        event_description="",
        period_id=1,
        min=minute,
        sec=0,
        player_id=player_id,
        team_id=team_id,
        outcome=outcome,
        x=10,
        y=20,
        qualifiers=qualifiers,
    )


def make_root(events: list[Event]) -> ParsedGamesRoot:
    return ParsedGamesRoot(
        timestamp=None,
        game=ParsedGame(
            game_id="game-1",
            competition_id="competition-1",
            competition_name="Competition",
            season_id="season-1",
            season_name="Season",
            home_team=TeamInGame(team_id="1", team_name="Home", score=0),
            away_team=TeamInGame(team_id="2", team_name="Away", score=0),
            events=events,
            total_events=len(events),
        ),
    )


class ProcessEventsServiceTests(unittest.TestCase):
    def setUp(self):
        self.cache = GameStateCache()
        self.service = ProcessEventsService(
            cache=self.cache,
            players_service=StubPlayersService(),
        )

    def test_non_exported_event_resolves_pending_pass(self):
        first_messages = self.service.process_game(
            make_root([make_event("1", "1", player_id="p1")])
        )
        self.assertFalse(
            any(message["type"] == "pass_network_updated" for message in first_messages)
        )

        second_messages = self.service.process_game(
            make_root(
                [
                    make_event("1", "1", player_id="p1"),
                    make_event("2", "3", player_id="p2"),
                ]
            )
        )

        pass_network_message = next(
            message
            for message in second_messages
            if message["type"] == "pass_network_updated"
        )
        self.assertEqual(pass_network_message["team_id"], "1")
        self.assertEqual(len(pass_network_message["statistics"]["buckets"]), 19)
        self.assertEqual(
            pass_network_message["edges"][0]["from_player_id"],
            "p1",
        )
        self.assertEqual(
            pass_network_message["edges"][0]["to_player_id"],
            "p2",
        )
        nodes_by_id = {
            node["player_id"]: node
            for node in pass_network_message["nodes"]
        }
        self.assertEqual(nodes_by_id["p1"]["player_name"], "Player p1")
        self.assertEqual(nodes_by_id["p2"]["player_name"], "Player p2")

        snapshot_nodes = {
            node["player_id"]: node
            for node in self.cache.get_pass_network("game-1", "1").get_nodes()
        }
        self.assertEqual(snapshot_nodes["p1"]["player_name"], "Player p1")
        self.assertEqual(snapshot_nodes["p2"]["player_name"], "Player p2")
        self.assertEqual(
            len(self.cache.get_pass_network_statistics("game-1", "1")["buckets"]),
            19,
        )

    def test_later_pass_update_sends_only_affected_stat_buckets(self):
        self.service.process_game(
            make_root(
                [
                    make_event("1", "1", player_id="p1", minute=1),
                    make_event("2", "3", player_id="p2", minute=1),
                ]
            )
        )

        messages = self.service.process_game(
            make_root(
                [
                    make_event("1", "1", player_id="p1", minute=1),
                    make_event("2", "3", player_id="p2", minute=1),
                    make_event("3", "1", player_id="p2", minute=7),
                    make_event("4", "3", player_id="p3", minute=7),
                ]
            )
        )

        pass_network_message = next(
            message
            for message in messages
            if message["type"] == "pass_network_updated"
        )
        bucket_indices = [
            bucket["bucket_index"]
            for bucket in pass_network_message["statistics"]["buckets"]
        ]

        self.assertEqual(bucket_indices, list(range(1, 19)))
        self.assertEqual(
            len(self.cache.get_pass_network_statistics("game-1", "1")["buckets"]),
            19,
        )

    def test_non_exported_events_are_registered_for_type_updates(self):
        self.service.process_game(make_root([make_event("1", "3", player_id="p1")]))
        self.assertEqual(self.cache.get_event_type("game-1", "1", "1"), "3")

        messages = self.service.process_game(
            make_root([make_event("1", "4", player_id="p1")])
        )

        updated_events_message = next(
            message for message in messages if message["type"] == "updated_events"
        )
        self.assertEqual(updated_events_message["events"][0]["type_id"], "4")


if __name__ == "__main__":
    unittest.main()
