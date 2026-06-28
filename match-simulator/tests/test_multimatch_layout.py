import importlib.util
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "src" / "main.py"
SPEC = importlib.util.spec_from_file_location("match_simulator_main", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
simulator = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(simulator)


class MultiMatchLayoutTests(unittest.TestCase):
    def test_simulated_f24_and_f9_feeds_are_paired_by_match_id(self):
        pairs = simulator._matching_simulation_feeds(
            simulator.DATA_EVENTS_SIMULATE_PATH,
            simulator.DATA_STATS_SIMULATE_PATH,
        )

        self.assertEqual(
            [match_id for match_id, _, _ in pairs],
            ["2372222", "2372223", "2372224"],
        )

    def test_static_feeds_keep_their_original_names_when_published(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            output_directory = Path(tmp_dir) / "events"
            count = simulator._copy_static_feeds(
                simulator.DATA_EVENTS_STATIC_PATH,
                output_directory,
                simulator.F24_FILE_PATTERN,
            )

            source_names = sorted(
                source.name
                for source in simulator.DATA_EVENTS_STATIC_PATH.glob(
                    simulator.F24_FILE_PATTERN
                )
            )
            self.assertEqual(count, len(source_names))
            self.assertEqual(
                sorted(path.name for path in output_directory.glob("*.xml")),
                source_names,
            )


if __name__ == "__main__":
    unittest.main()
