import unittest

from app.schemas.events import Event, Qualifier
from app.services.pass_networks.service import PassNetworkService


def make_pass(
    event_id: str,
    from_player_id: str = "p1",
    to_player_id: str = "p2",
    minute: int = 0,
    second: int = 0,
    period_id: int = 1,
    x: float = 10,
    y: float = 20,
    end_x: float = 30,
    end_y: float = 40,
) -> Event:
    return Event(
        id=event_id,
        event_id=event_id,
        type_id="1",
        event_name="Pass",
        event_description="",
        period_id=period_id,
        min=minute,
        sec=second,
        player_id=from_player_id,
        player_receiver_id=to_player_id,
        team_id="1",
        outcome=1,
        x=x,
        y=y,
        qualifiers=[
            Qualifier(qualifier_id="140", qualifier_name="Pass End X", value=str(end_x)),
            Qualifier(qualifier_id="141", qualifier_name="Pass End Y", value=str(end_y)),
        ],
    )


class PassNetworkTemporalTests(unittest.TestCase):
    def test_events_land_in_independent_minute_buckets(self):
        service = PassNetworkService(team_id=1)

        service.add_passes_incremental(
            [
                make_pass("1", minute=0, second=30),
                make_pass("2", minute=1, second=5),
            ]
        )

        payload = service.get_temporal_payload()
        buckets = {bucket["bucketIndex"]: bucket for bucket in payload["buckets"]}

        self.assertEqual(sorted(buckets), [0, 1])
        self.assertEqual(buckets[0]["startSecond"], 0)
        self.assertEqual(buckets[0]["endSecond"], 60)
        self.assertEqual(buckets[0]["edges"][0]["pass_count"], 1)
        self.assertEqual(buckets[1]["startSecond"], 60)
        self.assertEqual(buckets[1]["endSecond"], 120)
        self.assertEqual(buckets[1]["edges"][0]["pass_count"], 1)

    def test_buckets_are_not_accumulated(self):
        service = PassNetworkService(team_id=1)

        service.add_passes_incremental(
            [
                make_pass("1", minute=0, second=30),
                make_pass("2", minute=1, second=5),
            ]
        )

        second_bucket = service.get_temporal_buckets(bucket_indices=[1])[0]

        self.assertEqual(second_bucket["edges"][0]["pass_count"], 1)
        self.assertEqual(second_bucket["nodes"][0]["passes_given"], 1)

    def test_event_correction_moves_pass_to_new_bucket(self):
        service = PassNetworkService(team_id=1)

        service.add_passes_incremental([make_pass("1", minute=0, second=30)])
        _, _, _, changed_temporal = service.add_passes_incremental(
            [make_pass("1", minute=2, second=10)]
        )

        changed_buckets = {
            bucket["bucketIndex"]: bucket
            for bucket in service.get_temporal_buckets(bucket_indices=changed_temporal)
        }
        full_payload = service.get_temporal_payload()

        self.assertEqual(changed_temporal, [0, 2])
        self.assertEqual(changed_buckets[0]["edges"], [])
        self.assertEqual(changed_buckets[2]["edges"][0]["pass_count"], 1)
        self.assertEqual([bucket["bucketIndex"] for bucket in full_payload["buckets"]], [2])

    def test_bucket_metrics_are_additive(self):
        service = PassNetworkService(team_id=1)

        service.add_passes_incremental(
            [
                make_pass("1", from_player_id="p1", to_player_id="p2", x=10, y=20),
                make_pass("2", from_player_id="p1", to_player_id="p3", x=30, y=40),
            ]
        )

        bucket = service.get_temporal_payload()["buckets"][0]
        node = next(node for node in bucket["nodes"] if node["player_id"] == "p1")

        self.assertEqual(node["passes_given"], 2)
        self.assertEqual(node["position_given"]["count"], 2)
        self.assertEqual(node["position_given"]["x_sum"], 40)
        self.assertEqual(node["position_given"]["y_sum"], 60)

    def test_added_time_and_period_offsets_use_absolute_seconds(self):
        self.assertEqual(
            PassNetworkService.event_match_second(
                make_pass("added", minute=46, second=30, period_id=1)
            ),
            2790,
        )
        self.assertEqual(
            PassNetworkService.event_match_second(
                make_pass("second-half-reset", minute=18, second=0, period_id=2)
            ),
            3780,
        )


if __name__ == "__main__":
    unittest.main()
