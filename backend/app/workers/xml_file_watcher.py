'''
This module defines the XMLFileWatcher class, which is responsible for monitoring a specified directory for new XML files. When a new XML file is detected, it triggers the processing of the file. The watcher runs in an asynchronous loop, allowing it to efficiently monitor the directory without blocking other operations.
'''

import asyncio
import logging
from typing import Callable, List, Dict, Any
from pathlib import Path

logger = logging.getLogger(__name__)


async def watch_xml_file(
    poll_interval: int=3, 
    on_new_data: Callable[[List[Dict[str, Any]]], Any] | None = None, 
    file_path: str = 'data'
) -> None:
    '''
    Watches a specified directory for new XML files and processes them when detected.

    Args:
        poll_interval (int): The interval in seconds between each check for new files. Default is 3 seconds.
        on_new_data (Callable[[List[Dict[str, Any]]], Any] | None): A callback function that is called with the new data when a new XML file is processed. Default is None.
        file_path (str): The path to the directory to watch for new XML files. Default is 'data'.
    '''
    pass

