import logging
from typing import Any, Dict, List, Optional

from app.schemas.games import ParsedGamesRoot
from app.services.events.event_exporter import EventExporter
from app.services.events.event_scanner import EventScanner
from app.services.events.game_change_detector import GameChangeDetector
from app.services.events.pass_network_update_service import PassNetworkUpdateService
from app.services.momentum import MatchMomentumService
from app.services.players.service import PlayersService
from app.state.game_state import GameStateCache

logger = logging.getLogger(__name__)


class ProcessEventsService:
    """
    Orchestrates F24 event processing.

    The pipeline is intentionally thin:
    1. detect game metadata/score changes
    2. scan events once for event deltas and pass candidates
    3. apply pass candidates to pass networks
    4. keep cache snapshots current for reconnecting clients
    """

    def __init__(
        self,
        cache: GameStateCache,
        players_service: Optional[PlayersService] = None,
    ) -> None:
        self._cache = cache
        self._players_service = players_service or PlayersService()
        self._game_change_detector = GameChangeDetector(cache)
        self._event_exporter = EventExporter(self._players_service)
        self._event_scanner = EventScanner(cache, self._event_exporter)
        self._pass_network_updater = PassNetworkUpdateService(
            cache,
            self._players_service,
        )
        self._momentum_service = MatchMomentumService(cache)

    def process_game(self, parsed_root: ParsedGamesRoot) -> List[Dict[str, Any]]:
        messages: List[Dict[str, Any]] = []
        game = parsed_root.game

        game_msg = self._game_change_detector.detect(game)
        if game_msg:
            messages.append(game_msg)

        event_scan = self._event_scanner.scan(game)
        messages.extend(event_scan.messages)

        if event_scan.pass_candidates_by_team:
            messages.extend(
                self._pass_network_updater.update(
                    game,
                    event_scan.pass_candidates_by_team,
                )
            )

        try:
            messages.extend(
                self._momentum_service.update(
                    game,
                    events_changed=event_scan.has_event_changes,
                )
            )
        except Exception:
            logger.exception("(MOMENTUM) Unexpected error while updating xT momentum")

        if messages or event_scan.has_event_changes:
            self._cache.games[game.game_id] = game

        return messages
