import tempfile
import unittest
from pathlib import Path

from app.workers.xml_file_watcher import discover_feed_files


class XmlFileWatcherTests(unittest.TestCase):
    def test_discovers_all_matching_feeds_in_a_directory(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            directory = Path(tmp_dir)
            expected = [
                directory / "f24-23-2023-2372222-eventdetails.xml",
                directory / "f24-23-2023-2372223-eventdetails.xml",
            ]
            for xml_file in expected:
                xml_file.write_text("<Games />", encoding="utf-8")

            (directory / "f9-23-2023-2372222-matchresults.xml").write_text(
                "<SoccerFeed />",
                encoding="utf-8",
            )
            (directory / "notes.xml").write_text("<root />", encoding="utf-8")

            self.assertEqual(discover_feed_files(directory, "f24"), expected)

    def test_accepts_a_single_feed_file_for_backward_compatibility(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            xml_file = Path(tmp_dir) / "legacy-f24.xml"
            xml_file.write_text("<Games />", encoding="utf-8")

            self.assertEqual(discover_feed_files(xml_file, "f24"), [xml_file])


if __name__ == "__main__":
    unittest.main()
