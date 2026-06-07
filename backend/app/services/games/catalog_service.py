"""Cached access to selectable matches from the Opta F42 feed."""

import threading
from pathlib import Path

from app.schemas.games import AvailableMatch
from app.services.xml.f42_parser import XmlParseF42Service


class MatchCatalogService:
    """Reads F42 at startup/on demand and refreshes it when the file changes."""

    def __init__(
        self,
        f42_xml_path: Path | str,
        parser: XmlParseF42Service | None = None,
    ) -> None:
        self.f42_xml_path = Path(f42_xml_path)
        self._parser = parser or XmlParseF42Service()
        self._matches: list[AvailableMatch] = []
        self._file_signature: tuple[int, int] | None = None
        self._load_lock = threading.Lock()

    def get_available_matches(self) -> list[AvailableMatch]:
        signature = self._current_signature()
        if signature == self._file_signature:
            return list(self._matches)

        with self._load_lock:
            signature = self._current_signature()
            if signature == self._file_signature:
                return list(self._matches)

            xml_string = self.f42_xml_path.read_text(encoding="utf-8")
            self._matches = self._parser.parse_xml_string(xml_string)
            self._file_signature = signature
            return list(self._matches)

    def _current_signature(self) -> tuple[int, int]:
        stat = self.f42_xml_path.stat()
        return stat.st_mtime_ns, stat.st_size
