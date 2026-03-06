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
from app.services.process_events_service import ProcessEventsService

logger = logging.getLogger(__name__)


async def watch_xml_file(
    poll_interval: int = 3,
    on_new_data: Callable[[List[Dict[str, Any]]], Any] | None = None,
    file_path: str = "data",
    process_service: Optional[ProcessEventsService] = None,
) -> None:
    """
    Watches a directory for XML files and processes them when their content
    changes.

    Args:
        poll_interval:   Seconds between directory scans.
        on_new_data:     Callback invoked with a non-empty list of change
                         messages for each file that produced updates.
                         May be a regular function or a coroutine.
        file_path:       Root directory to watch (searched recursively).
        process_service: Shared ``ProcessEventsService`` instance that owns the
                         ``GameStateCache``.  When *None* a standalone cache is
                         created – useful only for isolated tests.
    """
    if process_service is None:
        from app.state.game_state import GameStateCache
        process_service = ProcessEventsService(cache=GameStateCache())

    reader = XmlReaderService()
    parser = XmlParseService()
    xml_file = Path(file_path)

    logger.info(
        "XML watcher started – monitoring '%s' every %ds", xml_file, poll_interval
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

