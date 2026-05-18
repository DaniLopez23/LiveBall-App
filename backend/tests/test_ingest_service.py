import tempfile
import time
import unittest
from pathlib import Path

from app.services.xml.reader import XmlReaderService


class XmlReaderServiceTests(unittest.TestCase):
    def test_read_if_changed_skips_unchanged_file_metadata(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            xml_path = Path(tmp_dir) / "feed.xml"
            xml_path.write_text("<root>1</root>", encoding="utf-8")

            reader = XmlReaderService()

            self.assertEqual(reader.read_if_changed(str(xml_path)), "<root>1</root>")
            self.assertIsNone(reader.read_if_changed(str(xml_path)))

            time.sleep(0.05)
            xml_path.write_text("<root>2</root>", encoding="utf-8")

            self.assertEqual(reader.read_if_changed(str(xml_path)), "<root>2</root>")


if __name__ == "__main__":
    unittest.main()
