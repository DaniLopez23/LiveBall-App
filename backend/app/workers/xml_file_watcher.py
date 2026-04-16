"""
Monitors a directory (recursively) for XML files and triggers processing
whenever a file's content has changed since the last poll.
"""

import asyncio
import inspect
import logging
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from app.services.ingest_service import XmlReaderService
from app.services.parse_service import XmlParseService
from app.services.parse_stats_service import XmlParseStatsService
from app.services.process_events_service import ProcessEventsService
from app.services.process_stats_service import ProcessStatsService

logger = logging.getLogger(__name__)


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

    logger.info(
        "(%s) started – monitoring '%s' every %ds",
        watcher_name,
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
                logger.warning("Failed to parse '%s', skipping.", xml_file)
                await asyncio.sleep(poll_interval + 5)
                continue

            messages = process_service.process_game(parsed_root)
            if messages and on_new_data is not None:
                result = on_new_data(messages)
                if inspect.isawaitable(result):
                    await result

        except Exception:
            logger.exception("Unexpected error in XML file watcher")

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
    """Watches an F9 stats XML file and emits booking/goal updates by team."""
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

