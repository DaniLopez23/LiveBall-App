import logging
from typing import Any, Dict, List, Tuple

from app.schemas.events import Event
from app.schemas.pass_networks import PassEdge, PassNetwork, PlayerNode

logger = logging.getLogger(__name__)


class PassNetworkService:
    """Gestiona el estado de la red de pases de un equipo en un partido."""

    def __init__(self, team_id: int = 0) -> None:
        self.network = PassNetwork(
            players={},
            edges={},
            team_id=team_id,
            changed_players=set(),
            changed_edges=set(),
            processed_event_ids=set(),
        )

    # ------------------------------------------------------------------ #
    # Mutations                                                            #
    # ------------------------------------------------------------------ #

    def add_player(self, player_id: str, player_name: str = "", team_id: int = 0) -> None:
        """Añade un jugador (nodo) a la red y rastrea el cambio."""
        if player_id not in self.network.players:
            self.network.players[player_id] = PlayerNode(
                player_id=player_id,
                player_name=player_name,
                team_id=str(team_id),
            )
            self.network.changed_players.add(player_id)
        elif player_name and self.network.players[player_id].player_name != player_name:
            self.network.players[player_id].player_name = player_name
            self.network.changed_players.add(player_id)

    def add_pass(
        self,
        from_player_id: str,
        to_player_id: str,
        x: float = 0.0,
        y: float = 0.0,
        end_x: float = 0.0,
        end_y: float = 0.0,
    ) -> None:
        """
        Añade una arista dirigida entre dos jugadores y rastrea el cambio.

        Args:
            from_player_id: Jugador que realiza el pase
            to_player_id: Jugador que recibe el pase
            x / y: Posición de origen del pase
            end_x / end_y: Posición de destino del pase
        """
        self.add_player(from_player_id)
        self.add_player(to_player_id)

        fp = self.network.players[from_player_id]
        tp = self.network.players[to_player_id]

        fp.passes_given += 1
        tp.passes_received += 1
        fp.pass_count += 1

        # Posición media del que da el pase (usa x, y)
        fp.avg_x_given = (fp.avg_x_given * (fp.passes_given - 1) + x) / fp.passes_given
        fp.avg_y_given = (fp.avg_y_given * (fp.passes_given - 1) + y) / fp.passes_given

        # Posición media del que recibe el pase (usa end_x, end_y)
        tp.avg_x_received = (tp.avg_x_received * (tp.passes_received - 1) + end_x) / tp.passes_received
        tp.avg_y_received = (tp.avg_y_received * (tp.passes_received - 1) + end_y) / tp.passes_received

        # Posición media total del que da
        total_fp = fp.passes_given + fp.passes_received
        fp.avg_x_total = (fp.avg_x_total * (total_fp - 1) + x) / total_fp
        fp.avg_y_total = (fp.avg_y_total * (total_fp - 1) + y) / total_fp

        # Posición media total del que recibe
        total_tp = tp.passes_given + tp.passes_received
        tp.avg_x_total = (tp.avg_x_total * (total_tp - 1) + end_x) / total_tp
        tp.avg_y_total = (tp.avg_y_total * (total_tp - 1) + end_y) / total_tp

        self.network.changed_players.add(from_player_id)
        self.network.changed_players.add(to_player_id)

        # Arista dirigida
        edge_key: Tuple[str, str] = (from_player_id, to_player_id)
        if edge_key in self.network.edges:
            edge = self.network.edges[edge_key]
            edge.avg_x = (edge.avg_x * edge.pass_count + x) / (edge.pass_count + 1)
            edge.avg_y = (edge.avg_y * edge.pass_count + y) / (edge.pass_count + 1)
            edge.pass_count += 1
        else:
            self.network.edges[edge_key] = PassEdge(
                from_player_id=from_player_id,
                to_player_id=to_player_id,
                pass_count=1,
                avg_x=x,
                avg_y=y,
            )

        self.network.changed_edges.add(edge_key)

    def clear_changes(self) -> None:
        """Limpia el registro de cambios incrementales."""
        self.network.changed_players.clear()
        self.network.changed_edges.clear()

    # ------------------------------------------------------------------ #
    # Read helpers                                                         #
    # ------------------------------------------------------------------ #

    def get_nodes(self) -> List[Dict[str, Any]]:
        """Retorna todos los nodos serializados."""
        return [self._player_to_dict(p) for p in self.network.players.values()]

    def get_edges(self) -> List[Dict[str, Any]]:
        """Retorna todas las aristas serializadas."""
        return [self._edge_to_dict(e) for e in self.network.edges.values()]

    def get_changed_nodes(self) -> List[Dict[str, Any]]:
        """Retorna solo los nodos que cambiaron en la última operación."""
        return [
            self._player_to_dict(self.network.players[pid])
            for pid in self.network.changed_players
            if pid in self.network.players
        ]

    def get_changed_edges(self) -> List[Dict[str, Any]]:
        """Retorna solo las aristas que cambiaron en la última operación."""
        return [
            self._edge_to_dict(self.network.edges[key])
            for key in self.network.changed_edges
            if key in self.network.edges
        ]

    def get_player_info(self, player_id: str) -> Dict[str, Any]:
        """Información detallada de un jugador específico."""
        if player_id not in self.network.players:
            return {}

        player = self.network.players[player_id]

        connections_out = [
            {"to_player_id": e.to_player_id, "pass_count": e.pass_count}
            for (from_id, _), e in self.network.edges.items()
            if from_id == player_id
        ]
        connections_in = [
            {"from_player_id": e.from_player_id, "pass_count": e.pass_count}
            for (_, to_id), e in self.network.edges.items()
            if to_id == player_id
        ]

        return {
            **self._player_to_dict(player),
            "total_passes_involved": player.pass_count + player.passes_received,
            "connections_out": connections_out,
            "connections_in": connections_in,
        }

    def get_statistics(self) -> Dict[str, Any]:
        """Estadísticas generales de la red."""
        total_passes = sum(e.pass_count for e in self.network.edges.values())
        return {
            "total_players": len(self.network.players),
            "total_connections": len(self.network.edges),
            "total_passes": total_passes,
            "team_id": self.network.team_id,
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serializa la red completa."""
        return {
            "nodes": self.get_nodes(),
            "edges": self.get_edges(),
            "statistics": self.get_statistics(),
        }

    # ------------------------------------------------------------------ #
    # Incremental processing                                               #
    # ------------------------------------------------------------------ #

    def add_passes_incremental(
        self,
        events: List[Event],
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Procesa una lista de eventos y devuelve solo los nodos y aristas
        que han cambiado (actualizaciones incrementales).

        Solo se procesan pases exitosos (type_id='1', outcome=1) cuyo
        receptor haya sido previamente asignado en ``event.player_receiver_id``
        por ``ProcessEventsService._assign_receivers``.
        Los eventos ya procesados se omiten para evitar duplicados.

        Returns:
            (changed_nodes, changed_edges)
        """
        self.clear_changes()

        for event in events:
            # Solo pases exitosos con receptor calculado
            if event.type_id != "1" or event.outcome != 1:
                continue
            if not event.player_receiver_id:
                continue

            # Evitar duplicados
            if event.event_id in self.network.processed_event_ids:
                continue

            from_player_id = event.player_id
            if not from_player_id:
                continue

            x = event.x or 0.0
            y = event.y or 0.0

            # Destino del pase: qualifiers 140 (end_x) y 141 (end_y)
            end_x, end_y = 0.0, 0.0
            for q in event.qualifiers:
                if q.qualifier_id == "140":
                    end_x = float(q.value)
                elif q.qualifier_id == "141":
                    end_y = float(q.value)

            self.add_pass(from_player_id, event.player_receiver_id, x, y, end_x, end_y)
            self.network.processed_event_ids.add(event.event_id)

        return self.get_changed_nodes(), self.get_changed_edges()

    # ------------------------------------------------------------------ #
    # Serialization helpers                                                #
    # ------------------------------------------------------------------ #

    @staticmethod
    def _player_to_dict(player: PlayerNode) -> Dict[str, Any]:
        return {
            "player_id": player.player_id,
            "player_name": player.player_name,
            "team_id": player.team_id,
            "pass_count": player.pass_count,
            "passes_given": player.passes_given,
            "passes_received": player.passes_received,
            "avg_position_given": {
                "x": round(player.avg_x_given, 2),
                "y": round(player.avg_y_given, 2),
            },
            "avg_position_received": {
                "x": round(player.avg_x_received, 2),
                "y": round(player.avg_y_received, 2),
            },
            "avg_position_total": {
                "x": round(player.avg_x_total, 2),
                "y": round(player.avg_y_total, 2),
            },
        }

    @staticmethod
    def _edge_to_dict(edge: PassEdge) -> Dict[str, Any]:
        return {
            "from_player_id": edge.from_player_id,
            "to_player_id": edge.to_player_id,
            "pass_count": edge.pass_count,
            "avg_position": {
                "x": round(edge.avg_x, 2),
                "y": round(edge.avg_y, 2),
            },
        }
