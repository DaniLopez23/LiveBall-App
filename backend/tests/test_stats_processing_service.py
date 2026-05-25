import unittest
import xml.etree.ElementTree as ET

from app.schemas.stats import ParsedMatchStats, TeamMatchStats, TeamStat
from app.services.stats.processing_service import (
    MatchStatsTimelineStore,
    ProcessStatsService,
    build_match_stats_payload,
    group_stats_by_team,
    parse_stat_xml,
)
from app.services.xml.f9_parser import XmlParseStatsService, get_match_minute
from app.state.game_state import GameStateCache


def make_team(
    team_id: str,
    side: str,
    stats: dict[str, str],
    team_name: str | None = None,
) -> TeamMatchStats:
    return TeamMatchStats(
        team_id=team_id,
        team_name=team_name or f"Team {team_id}",
        side=side,
        stats=[
            TeamStat(type=stat_type, value=value)
            for stat_type, value in stats.items()
        ],
    )


def make_payload(
    match_id: str,
    minute: int | None,
    timestamp: str,
    home_passes: str = "10",
) :
    parsed = ParsedMatchStats(
        game_id=match_id,
        feed_timestamp=timestamp,
        match_minute=minute,
        teams=[
            make_team(
                "1",
                "Home",
                {
                    "total_pass": home_passes,
                    "accurate_pass": "8",
                    "unexpected_raw_stat": "999",
                },
                "Home",
            ),
            make_team(
                "2",
                "Away",
                {
                    "total_pass": "5",
                    "accurate_pass": "3",
                },
                "Away",
            ),
        ],
    )
    return build_match_stats_payload(parsed)


class StatsProcessingServiceTests(unittest.TestCase):
    def test_ignores_stats_not_in_configured_groups(self):
        grouped = group_stats_by_team(
            make_team(
                "1",
                "Home",
                {
                    "total_pass": "12",
                    "unexpected_raw_stat": "999",
                },
            )
        )

        flattened_stat_names = {
            stat_name
            for group in grouped.groups.values()
            for stat_name in group
        }

        self.assertIn("total_pass", flattened_stat_names)
        self.assertNotIn("unexpected_raw_stat", flattened_stat_names)
        self.assertEqual(grouped.groups["passing"]["total_pass"].total, 12)

    def test_parse_stat_xml_total_first_half_and_second_half(self):
        stat_type, values = parse_stat_xml(
            ET.fromstring('<Stat Type="total_pass" FH="2" SH="3">5</Stat>')
        )

        self.assertEqual(stat_type, "total_pass")
        self.assertEqual(values.total, 5)
        self.assertEqual(values.firstHalf, 2)
        self.assertEqual(values.secondHalf, 3)

    def test_f9_parser_extracts_match_minute_and_team_names(self):
        xml = """
        <SoccerFeed TimeStamp="t1">
          <SoccerDocument uID="f123">
            <MatchData>
              <Stat Type="match_time">23</Stat>
              <TeamData TeamRef="t1" Side="Home" />
              <TeamData TeamRef="t2" Side="Away" />
            </MatchData>
            <Team uID="t1"><Name>Home Name</Name></Team>
            <Team uID="t2"><Name>Away Name</Name></Team>
          </SoccerDocument>
        </SoccerFeed>
        """
        root = ET.fromstring(xml)
        parsed = XmlParseStatsService().parse_xml_string(xml)

        self.assertEqual(get_match_minute(root), 23)
        self.assertEqual(parsed.match_minute, 23)
        self.assertEqual(parsed.teams[0].team_name, "Home Name")
        self.assertEqual(parsed.teams[1].team_name, "Away Name")

    def test_calculates_derived_stats_and_avoids_zero_division(self):
        grouped = group_stats_by_team(
            make_team(
                "1",
                "Home",
                {
                    "total_pass": "0",
                    "accurate_pass": "8",
                    "total_long_balls": "4",
                    "accurate_long_balls": "3",
                    "duel_won": "6",
                    "duel_lost": "4",
                    "aerial_won": "0",
                    "aerial_lost": "0",
                },
            )
        )

        self.assertIsNone(grouped.derived.passAccuracy)
        self.assertEqual(grouped.derived.longBallAccuracy, 75.0)
        self.assertEqual(grouped.derived.duelSuccess, 60.0)
        self.assertIsNone(grouped.derived.aerialSuccess)

    def test_creates_floor_buckets_and_replaces_same_bucket_snapshot(self):
        store = MatchStatsTimelineStore(interval_minutes=5)

        first_timeline = store.update(make_payload("match-1", 23, "t1", home_passes="10"))
        self.assertEqual(len(first_timeline.buckets), 1)
        self.assertEqual(first_timeline.buckets[0].minute, 20)
        self.assertEqual(
            first_timeline.buckets[0].home.groups["passing"]["total_pass"].total,
            10,
        )

        replaced_timeline = store.update(
            make_payload("match-1", 24, "t2", home_passes="14")
        )
        self.assertEqual(len(replaced_timeline.buckets), 1)
        self.assertEqual(replaced_timeline.buckets[0].minute, 20)
        self.assertEqual(replaced_timeline.buckets[0].timestamp, "t2")
        self.assertEqual(
            replaced_timeline.buckets[0].home.groups["passing"]["total_pass"].total,
            14,
        )

        new_bucket_timeline = store.update(
            make_payload("match-1", 25, "t3", home_passes="20")
        )
        self.assertEqual(
            [bucket.minute for bucket in new_bucket_timeline.buckets],
            [20, 25],
        )

    def test_does_not_update_timeline_without_valid_minute(self):
        store = MatchStatsTimelineStore(interval_minutes=5)

        timeline = store.update(make_payload("match-1", None, "t1"))

        self.assertEqual(timeline.buckets, [])

    def test_keeps_timelines_independent_by_match_id(self):
        store = MatchStatsTimelineStore(interval_minutes=5)

        store.update(make_payload("match-1", 6, "m1"))
        store.update(make_payload("match-2", 12, "m2"))

        self.assertEqual([bucket.minute for bucket in store.get("match-1").buckets], [5])
        self.assertEqual([bucket.minute for bucket in store.get("match-2").buckets], [10])

    def test_process_game_persists_bucket_timeline_in_state_for_snapshots(self):
        cache = GameStateCache()
        service = ProcessStatsService(cache=cache)

        service.process_game(
            ParsedMatchStats(
                game_id="match-1",
                feed_timestamp="t1",
                match_minute=6,
                teams=[
                    make_team("1", "Home", {"total_pass": "12"}, "Home"),
                    make_team("2", "Away", {"total_pass": "7"}, "Away"),
                ],
            )
        )

        recreated_service = ProcessStatsService(cache=cache)
        recreated_service.process_game(
            ParsedMatchStats(
                game_id="match-1",
                feed_timestamp="t2",
                match_minute=11,
                teams=[
                    make_team("1", "Home", {"total_pass": "18"}, "Home"),
                    make_team("2", "Away", {"total_pass": "9"}, "Away"),
                ],
            )
        )

        state_timeline = cache.get_match_stats_timeline("match-1")
        snapshot_payload = cache.get_match_stats_update("match-1")

        self.assertIsNotNone(state_timeline)
        self.assertIsNotNone(snapshot_payload)
        self.assertEqual([bucket.minute for bucket in state_timeline.buckets], [5, 10])
        self.assertEqual(
            [bucket.minute for bucket in snapshot_payload.timeline.buckets],
            [5, 10],
        )
        self.assertEqual(
            [bucket["minute"] for bucket in snapshot_payload.model_dump()["timeline"]["buckets"]],
            [5, 10],
        )

    def test_process_game_emits_grouped_stats_update_without_raw_team_stats(self):
        service = ProcessStatsService(cache=GameStateCache())

        messages = service.process_game(
            ParsedMatchStats(
                game_id="match-1",
                feed_timestamp="t1",
                match_minute=5,
                teams=[
                    make_team("1", "Home", {"total_pass": "12"}, "Home"),
                    make_team("2", "Away", {"total_pass": "7"}, "Away"),
                ],
            )
        )

        self.assertEqual(messages[0]["type"], "match_stats_update")
        self.assertIn("current", messages[0]["data"])
        self.assertIn("timeline", messages[0]["data"])
        self.assertNotIn("teams", messages[0]["data"]["current"])


if __name__ == "__main__":
    unittest.main()
