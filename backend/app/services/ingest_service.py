'''
Service for ingesting data.
'''

import hashlib
import logging
from typing import Optional


logger = logging.getLogger(__name__)


class XmlReaderService:
    '''
    Service for reading XML files and detecting content changes.
    '''

    def __init__(self):
        self._last_hashes: dict[str, str] = {}

    def _compute_hash(self, content: str) -> str:
        return hashlib.md5(content.encode("utf-8")).hexdigest()

    def read_raw_xml(self, file_path: str) -> Optional[str]:
        '''
        Reads raw XML content from the given file path.
        Returns the content as a string, or None if the file cannot be read.
        '''
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
            # logger.debug("XML file read successfully: %s", file_path)
            return content
        except OSError as e:
            logger.error("Failed to read XML file '%s': %s", file_path, e)
            return None

    def has_changed(self, file_path: str, content: str) -> bool:
        '''
        Returns True if the content of the file has changed since the last check.
        Updates the internal hash record when a change is detected.
        '''
        current_hash = self._compute_hash(content)
        previous_hash = self._last_hashes.get(file_path)

        if current_hash != previous_hash:
            self._last_hashes[file_path] = current_hash
            # logger.debug("Content change detected for: %s", file_path)
            return True
        else:
            # logger.debug("No content change detected for: %s", file_path)
            pass
        
        return False

    def read_if_changed(self, file_path: str) -> Optional[str]:
        '''
        Reads the XML file only if its content has changed since the last call.
        Returns the raw XML string if changed, or None if unchanged or unreadable.
        '''
        content = self.read_raw_xml(file_path)
        if content is None:
            logger.warning("No content read from file: %s", file_path)
            return None

        if self.has_changed(file_path, content):
            logger.info("Change detected in XML file: %s", file_path)
            return content

        # logger.debug("No changes detected for: %s", file_path)
        return None
