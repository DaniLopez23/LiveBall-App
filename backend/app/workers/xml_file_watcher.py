"""
Monitors XML files and triggers processing whenever their content changes.
"""

import asyncio
import inspect
import logging
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from app.services.events.processing_service import ProcessEventsService
from app.services.stats.processing_service import ProcessStatsService
from app.services.xml.f24_parser import XmlParseService
from app.services.xml.f9_parser import XmlParseStatsService
from app.services.xml.reader import XmlReaderService

logger = logging.getLogger(__name__)


def _feed_name(watcher_name: str) -> str:
    if watcher_name.startswith("f24"):
        return "f24"
    if watcher_name.startswith("f9"):
        return "f9"
    return watcher_name


def _game_id(parsed_root: Any) -> str:
    game = getattr(parsed_root, "game", None)
    value = getattr(game or parsed_root, "game_id", None)
    return str(value or "unknown")


async def _run_xml_watcher(
    poll_interval: int = 3,
    on_new_data: Callable[[List[Dict[str, Any]]], Any] | None = None,
    file_path: str = "data",
    parser: Optional[XmlParseService | XmlParseStatsService] = None,
    process_service: Optional[ProcessEventsService | ProcessStatsService] = None,
    watcher_name: str = "xml_watcher",
) -> None:
    """
    Generic XML watcher runner used by specialized watchers.
    """
    if parser is None or process_service is None:
        raise ValueError("parser and process_service are required")

    reader = XmlReaderService()
    xml_file = Path(file_path)
    feed_name = _feed_name(watcher_name)

    logger.info(
        "WORKER %s started file=%s interval=%ss",
        feed_name,
        xml_file,
        poll_interval,
    )

    while True:
        try:
            content = reader.read_if_changed(str(xml_file))
            if content is None:
                await asyncio.sleep(poll_interval + 5)
                continue

            parsed_root = parser.parse_xml_string(content)
            if parsed_root is None:
                logger.warning("WORKER %s failed to parse file=%s", feed_name, xml_file)
                await asyncio.sleep(poll_interval + 5)
                continue

            logger.info(
                "WORKER %s received new data game=%s file=%s",
                feed_name,
                _game_id(parsed_root),
                xml_file.name,
            )
            messages = process_service.process_game(parsed_root)
            if messages and on_new_data is not None:
                result = on_new_data(messages)
                if inspect.isawaitable(result):
                    await result

        except Exception:
            logger.exception("WORKER %s unexpected error", feed_name)

        await asyncio.sleep(poll_interval)


async def f24_events_xml_watcher(
    poll_interval: int = 3,
    on_new_data: Callable[[List[Dict[str, Any]]], Any] | None = None,
    file_path: str = "data",
    process_service: Optional[ProcessEventsService] = None,
) -> None:
    """Watches an F24 events XML file and emits parsed event updates."""
    if process_service is None:
        from app.state.game_state import GameStateCache

        process_service = ProcessEventsService(cache=GameStateCache())

    await _run_xml_watcher(
        poll_interval=poll_interval,
        on_new_data=on_new_data,
        file_path=file_path,
        parser=XmlParseService(),
        process_service=process_service,
        watcher_name="f24_events_xml_watcher",
    )


async def f9_stats_xml_watcher(
    poll_interval: int = 3,
    on_new_data: Callable[[List[Dict[str, Any]]], Any] | None = None,
    file_path: str = "data",
    process_service: Optional[ProcessStatsService] = None,
) -> None:
    """Watches an F9 stats XML file and emits parsed stats updates."""
    if process_service is None:
        process_service = ProcessStatsService()

    await _run_xml_watcher(
        poll_interval=poll_interval,
        on_new_data=on_new_data,
        file_path=file_path,
        parser=XmlParseStatsService(),
        process_service=process_service,
        watcher_name="f9_stats_xml_watcher",
    )
