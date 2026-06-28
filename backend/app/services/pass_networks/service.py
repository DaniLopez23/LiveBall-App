import logging
from dataclasses import dataclass
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

import numpy as np

from app.schemas.events import Event
from app.schemas.pass_networks import (
    N_5MIN_BUCKETS,
    PASS_NETWORK_BUCKET_SIZE_SECONDS,
    PassEdge,
    PassNetwork,
    PlayerNode,
    bucket_minute_range,
    minute_to_bucket,
)
from app.services.pass_networks.metrics import compute_network_metrics

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PassContribution:
    event_id: str
    team_id: str
    from_player_id: str
    to_player_id: str
    from_player_name: str
    to_player_name: str
    minute: int
    second: int
    match_second: int
    bucket_index: int
    x: float
    y: float
    end_x: float
    end_y: float
    has_origin_position: bool
    has_end_position: bool


class PassNetworkService:
    """Keeps the pass-network state for one team in one match.

    The source of truth is a per-event contribution map. Legacy cumulative
    nodes/edges are rebuilt from that map for compatibility, while the new
    temporal payload exposes independent 60-second buckets that the frontend can
    aggregate into cumulative or sliding-window views.
    """

    def __init__(self, team_id: int = 0) -> None:
        self.network = PassNetwork(
            players={},
            edges={},
            team_id=team_id,
            changed_players=set(),
            changed_edges=set(),
            processed_event_ids=set(),
        )
        self._applied_passes: Dict[str, PassContribution] = {}
        self._temporal_buckets: Dict[int, Dict[str, Any]] = {}

    # ------------------------------------------------------------------ #
    # Mutations                                                           #
    # ------------------------------------------------------------------ #

    def clear_changes(self) -> None:
        """Clears the compatibility incremental change markers."""
        self.network.changed_players.clear()
        self.network.changed_edges.clear()

    def has_processed_event(self, event_id: str) -> bool:
        """Returns True when a pass event has already been applied."""
        return event_id in self._applied_passes

    def remove_pass_events(self, event_ids: Iterable[str]) -> List[int]:
        """Removes applied pass events and returns changed 60-second buckets."""
        changed_bucket_indices: set[int] = set()
        changed = False

        for event_id in event_ids:
            previous = self._applied_passes.pop(event_id, None)
            if previous is None:
                continue
            changed_bucket_indices.add(previous.bucket_index)
            changed = True

        if changed:
            self._rebuild_network_from_contributions()

        return sorted(changed_bucket_indices)

    def add_passes_incremental(
        self,
        events: List[Event],
        player_name_lookup: Optional[Callable[[str, str], Optional[str]]] = None,
        deleted_event_ids: Optional[Iterable[str]] = None,
    ) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[int], List[int]]:
        """
        Upserts successful pass events and returns compatibility deltas.

        Events are compared by their additive contribution. Re-sending the same
        accumulated feed is a no-op, while corrections replace the old event
        contribution and mark both the old and new temporal buckets as changed.

        Returns:
            (changed_nodes, changed_edges, legacy_changed_bucket_indices,
             temporal_changed_bucket_indices)
        """
        self.clear_changes()
        changed_temporal_bucket_indices: set[int] = set()
        min_changed_legacy_bucket: Optional[int] = None
        changed = False

        for event_id in deleted_event_ids or []:
            previous = self._applied_passes.pop(event_id, None)
            if previous is None:
                continue
            changed = True
            changed_temporal_bucket_indices.add(previous.bucket_index)
            previous_legacy_bucket = minute_to_bucket(previous.minute)
            min_changed_legacy_bucket = (
                previous_legacy_bucket
                if min_changed_legacy_bucket is None
                else min(min_changed_legacy_bucket, previous_legacy_bucket)
            )

        for event in events:
            contribution = self._event_to_contribution(
                event,
                player_name_lookup=player_name_lookup,
            )
            if contribution is None:
                continue

            previous = self._applied_passes.get(contribution.event_id)
            if previous == contribution:
                continue

            changed = True
            if previous is not None:
                changed_temporal_bucket_indices.add(previous.bucket_index)
                previous_legacy_bucket = minute_to_bucket(previous.minute)
                min_changed_legacy_bucket = (
                    previous_legacy_bucket
                    if min_changed_legacy_bucket is None
                    else min(min_changed_legacy_bucket, previous_legacy_bucket)
                )

            self._applied_passes[contribution.event_id] = contribution
            changed_temporal_bucket_indices.add(contribution.bucket_index)
            event_legacy_bucket = minute_to_bucket(contribution.minute)
            min_changed_legacy_bucket = (
                event_legacy_bucket
                if min_changed_legacy_bucket is None
                else min(min_changed_legacy_bucket, event_legacy_bucket)
            )

        if changed:
            self._rebuild_network_from_contributions()

        legacy_changed_bucket_indices = (
            list(range(min_changed_legacy_bucket, N_5MIN_BUCKETS))
            if min_changed_legacy_bucket is not None
            else []
        )

        return (
            self.get_changed_nodes(),
            self.get_changed_edges(),
            legacy_changed_bucket_indices,
            sorted(changed_temporal_bucket_indices),
        )

    # ------------------------------------------------------------------ #
    # Read helpers                                                        #
    # ------------------------------------------------------------------ #

    def get_nodes(self) -> List[Dict[str, Any]]:
        """Returns all compatibility nodes."""
        return [self._player_to_dict(p) for p in self.network.players.values()]

    def get_edges(self) -> List[Dict[str, Any]]:
        """Returns all compatibility edges."""
        return [self._edge_to_dict(e) for e in self.network.edges.values()]

    def get_changed_nodes(self) -> List[Dict[str, Any]]:
        """Returns compatibility nodes changed by the last upsert."""
        return [
            self._player_to_dict(self.network.players[pid])
            for pid in self.network.changed_players
            if pid in self.network.players
        ]

    def get_changed_edges(self) -> List[Dict[str, Any]]:
        """Returns compatibility edges changed by the last upsert."""
        return [
            self._edge_to_dict(self.network.edges[key])
            for key in self.network.changed_edges
            if key in self.network.edges
        ]

    def get_player_info(self, player_id: str) -> Dict[str, Any]:
        """Detailed compatibility information for one player."""
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
        """Legacy cumulative network statistics."""
        total_passes = sum(e.pass_count for e in self.network.edges.values())
        return {
            "total_players": len(self.network.players),
            "total_connections": len(self.network.edges),
            "total_passes": total_passes,
            "team_id": self.network.team_id,
        }

    def get_temporal_payload(
        self,
        match_time_seconds: Optional[int] = None,
        bucket_indices: Optional[Iterable[int]] = None,
    ) -> Dict[str, Any]:
        """Returns independent temporal buckets for frontend aggregation."""
        buckets = self.get_temporal_buckets(bucket_indices=bucket_indices)
        inferred_match_time = max(
            [bucket["endSecond"] for bucket in self.get_temporal_buckets()] or [0]
        )

        return {
            "bucketSizeSeconds": PASS_NETWORK_BUCKET_SIZE_SECONDS,
            "matchTimeSeconds": max(0, int(match_time_seconds or inferred_match_time)),
            "buckets": buckets,
        }

    def get_temporal_buckets(
        self,
        bucket_indices: Optional[Iterable[int]] = None,
    ) -> List[Dict[str, Any]]:
        """Serializes independent 60-second buckets.

        When bucket_indices is provided, empty buckets are included too. This is
        important for corrections that remove the last pass from a bucket.
        """
        if bucket_indices is None:
            indices = sorted(self._temporal_buckets)
        else:
            indices = sorted({max(0, int(index)) for index in bucket_indices})

        return [self._bucket_to_dict(index) for index in indices]

    def get_bucket_statistics(
        self,
        bucket: Optional[int] = None,
        bucket_indices: Optional[Iterable[int]] = None,
    ) -> Dict[str, Any]:
        """
        Deprecated compatibility metrics.

        These are still cumulative 5-minute snapshots for older clients. New
        pass-network visualizations should use get_temporal_payload() and build
        the desired range on the frontend.
        """
        player_ids = list(self.network.players.keys())

        if bucket is not None:
            buckets_to_compute = [max(0, min(N_5MIN_BUCKETS - 1, bucket))]
        elif bucket_indices is not None:
            buckets_to_compute = sorted(
                {
                    max(0, min(N_5MIN_BUCKETS - 1, bucket_index))
                    for bucket_index in bucket_indices
                }
            )
        else:
            buckets_to_compute = list(range(N_5MIN_BUCKETS))

        results = []
        for b in buckets_to_compute:
            W, present_ids = self._build_weight_matrix(b, player_ids)
            total_passes_bucket = int(W.sum())

            minute = bucket_minute_range(b).stop - 1
            minute = max(5, minute)

            if total_passes_bucket == 0:
                from app.services.pass_networks.metrics import _empty_metrics

                metrics = _empty_metrics()
            else:
                metrics = compute_network_metrics(W, present_ids)

            bucket_entry: Dict[str, Any] = {
                "bucket_index": b,
                "minute": minute,
                "total_passes": total_passes_bucket,
                "top_passer": metrics["top_passer"],
                "top_receiver": metrics["top_receiver"],
                "top_player_total": metrics["top_player_total"],
                "top_connection": metrics["top_connection"],
                "betweenness_centrality": metrics["betweenness"],
                "eigenvector_centrality": metrics["eigenvector"],
                "flow_centrality": metrics["flow_centrality"],
                "deprecated": True,
            }
            results.append(bucket_entry)

        return {
            "team_id": self.network.team_id,
            "deprecated": True,
            "buckets": results,
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serializes the full pass-network state."""
        return {
            "nodes": self.get_nodes(),
            "edges": self.get_edges(),
            "statistics": self.get_statistics(),
            "temporal": self.get_temporal_payload(),
        }

    # ------------------------------------------------------------------ #
    # Contribution and rebuild helpers                                    #
    # ------------------------------------------------------------------ #

    def _event_to_contribution(
        self,
        event: Event,
        player_name_lookup: Optional[Callable[[str, str], Optional[str]]] = None,
    ) -> Optional[PassContribution]:
        if event.type_id != "1" or event.outcome != 1:
            return None
        if not event.event_id or not event.player_id or not event.player_receiver_id:
            return None

        end_x: Optional[float] = None
        end_y: Optional[float] = None
        for qualifier in event.qualifiers:
            if qualifier.qualifier_id == "140":
                end_x = self._coerce_float(qualifier.value)
            elif qualifier.qualifier_id == "141":
                end_y = self._coerce_float(qualifier.value)

        x = self._coerce_float(event.x)
        y = self._coerce_float(event.y)
        has_origin_position = self._has_valid_position(x, y)
        has_end_position = self._has_valid_position(end_x, end_y)

        event_team_id = str(event.team_id or self.network.team_id)
        from_player_name = ""
        to_player_name = ""
        if player_name_lookup:
            from_player_name = player_name_lookup(event_team_id, event.player_id) or ""
            to_player_name = player_name_lookup(event_team_id, event.player_receiver_id) or ""

        match_second = self.event_match_second(event)
        bucket_index = match_second // PASS_NETWORK_BUCKET_SIZE_SECONDS
        minute = match_second // 60
        second = match_second % 60

        return PassContribution(
            event_id=event.event_id,
            team_id=event_team_id,
            from_player_id=event.player_id,
            to_player_id=event.player_receiver_id,
            from_player_name=from_player_name,
            to_player_name=to_player_name,
            minute=minute,
            second=second,
            match_second=match_second,
            bucket_index=bucket_index,
            x=float(x or 0.0),
            y=float(y or 0.0),
            end_x=float(end_x or 0.0),
            end_y=float(end_y or 0.0),
            has_origin_position=has_origin_position,
            has_end_position=has_end_position,
        )

    def _rebuild_network_from_contributions(self) -> None:
        self.network.players = {}
        self.network.edges = {}
        self.network.processed_event_ids = set(self._applied_passes)
        self._temporal_buckets = {}

        for contribution in sorted(
            self._applied_passes.values(),
            key=lambda item: (item.match_second, item.event_id),
        ):
            self._apply_legacy_contribution(contribution)
            self._apply_temporal_contribution(contribution)

        self._finalize_legacy_averages()
        self.network.changed_players = set(self.network.players)
        self.network.changed_edges = set(self.network.edges)

    def _apply_legacy_contribution(self, contribution: PassContribution) -> None:
        self._ensure_player(
            contribution.from_player_id,
            contribution.from_player_name,
            contribution.team_id,
        )
        self._ensure_player(
            contribution.to_player_id,
            contribution.to_player_name,
            contribution.team_id,
        )

        from_player = self.network.players[contribution.from_player_id]
        to_player = self.network.players[contribution.to_player_id]
        minute_idx = self._normalize_minute(contribution.minute)

        self._ensure_minute_capacity(from_player.minute_buckets, minute_idx, 0)
        self._ensure_minute_capacity(to_player.minute_buckets, minute_idx, 0)
        self._ensure_minute_capacity(from_player.minute_given_stats, minute_idx, None)
        self._ensure_minute_capacity(to_player.minute_received_stats, minute_idx, None)

        from_player.passes_given += 1
        from_player.pass_count += 1
        from_player.minute_buckets[minute_idx] += 1
        to_player.passes_received += 1
        to_player.minute_buckets[minute_idx] += 1

        if contribution.has_origin_position:
            self._add_position_stat(
                from_player.minute_given_stats[minute_idx],
                contribution.x,
                contribution.y,
            )

        if contribution.has_end_position:
            self._add_position_stat(
                to_player.minute_received_stats[minute_idx],
                contribution.end_x,
                contribution.end_y,
            )

        edge_key: Tuple[str, str] = (
            contribution.from_player_id,
            contribution.to_player_id,
        )
        edge = self.network.edges.get(edge_key)
        if edge is None:
            edge = PassEdge(
                from_player_id=contribution.from_player_id,
                to_player_id=contribution.to_player_id,
                pass_count=0,
                avg_x=0.0,
                avg_y=0.0,
            )
            self.network.edges[edge_key] = edge

        self._ensure_minute_capacity(edge.minute_buckets, minute_idx, 0)
        self._ensure_minute_capacity(edge.minute_position_stats, minute_idx, None)
        edge.pass_count += 1
        edge.minute_buckets[minute_idx] += 1
        if contribution.has_origin_position:
            self._add_position_stat(
                edge.minute_position_stats[minute_idx],
                contribution.x,
                contribution.y,
            )

    def _apply_temporal_contribution(self, contribution: PassContribution) -> None:
        bucket = self._temporal_buckets.setdefault(
            contribution.bucket_index,
            {"nodes": {}, "edges": {}},
        )

        from_node = self._get_bucket_node(bucket, contribution, "from")
        to_node = self._get_bucket_node(bucket, contribution, "to")

        from_node["passes_given"] += 1
        from_node["pass_count"] += 1
        to_node["passes_received"] += 1

        if contribution.has_origin_position:
            self._add_position_stat(
                from_node["position_given"],
                contribution.x,
                contribution.y,
            )
            self._add_position_stat(
                from_node["position_total"],
                contribution.x,
                contribution.y,
            )

        if contribution.has_end_position:
            self._add_position_stat(
                to_node["position_received"],
                contribution.end_x,
                contribution.end_y,
            )
            self._add_position_stat(
                to_node["position_total"],
                contribution.end_x,
                contribution.end_y,
            )

        edge_key = (contribution.from_player_id, contribution.to_player_id)
        edge = bucket["edges"].setdefault(
            edge_key,
            {
                "from_player_id": contribution.from_player_id,
                "to_player_id": contribution.to_player_id,
                "pass_count": 0,
                "position": self._empty_position_stat(),
            },
        )
        edge["pass_count"] += 1
        if contribution.has_origin_position:
            self._add_position_stat(edge["position"], contribution.x, contribution.y)

    def _ensure_player(self, player_id: str, player_name: str, team_id: str) -> None:
        if player_id not in self.network.players:
            self.network.players[player_id] = PlayerNode(
                player_id=player_id,
                player_name=player_name,
                team_id=str(team_id),
            )
            return

        if player_name:
            self.network.players[player_id].player_name = player_name

    def _get_bucket_node(
        self,
        bucket: Dict[str, Any],
        contribution: PassContribution,
        role: str,
    ) -> Dict[str, Any]:
        player_id = (
            contribution.from_player_id if role == "from" else contribution.to_player_id
        )
        player_name = (
            contribution.from_player_name
            if role == "from"
            else contribution.to_player_name
        )

        return bucket["nodes"].setdefault(
            player_id,
            {
                "player_id": player_id,
                "player_name": player_name,
                "team_id": contribution.team_id,
                "pass_count": 0,
                "passes_given": 0,
                "passes_received": 0,
                "position_given": self._empty_position_stat(),
                "position_received": self._empty_position_stat(),
                "position_total": self._empty_position_stat(),
            },
        )

    def _finalize_legacy_averages(self) -> None:
        for player in self.network.players.values():
            given = self._sum_position_stats(player.minute_given_stats)
            received = self._sum_position_stats(player.minute_received_stats)
            total = {
                "count": given["count"] + received["count"],
                "x_sum": given["x_sum"] + received["x_sum"],
                "y_sum": given["y_sum"] + received["y_sum"],
            }

            player.avg_x_given = self._avg(given, "x_sum")
            player.avg_y_given = self._avg(given, "y_sum")
            player.avg_x_received = self._avg(received, "x_sum")
            player.avg_y_received = self._avg(received, "y_sum")
            player.avg_x_total = self._avg(total, "x_sum")
            player.avg_y_total = self._avg(total, "y_sum")

        for edge in self.network.edges.values():
            position = self._sum_position_stats(edge.minute_position_stats)
            edge.avg_x = self._avg(position, "x_sum")
            edge.avg_y = self._avg(position, "y_sum")

    # ------------------------------------------------------------------ #
    # Serialization helpers                                               #
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
            "minute_buckets": player.minute_buckets,
            "minute_given_stats": player.minute_given_stats,
            "minute_received_stats": player.minute_received_stats,
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
            "minute_buckets": edge.minute_buckets,
            "minute_position_stats": edge.minute_position_stats,
        }

    def _bucket_to_dict(self, bucket_index: int) -> Dict[str, Any]:
        bucket = self._temporal_buckets.get(bucket_index, {"nodes": {}, "edges": {}})
        return {
            "bucketIndex": bucket_index,
            "startSecond": bucket_index * PASS_NETWORK_BUCKET_SIZE_SECONDS,
            "endSecond": (bucket_index + 1) * PASS_NETWORK_BUCKET_SIZE_SECONDS,
            "nodes": sorted(
                (
                    self._bucket_node_to_dict(node)
                    for node in bucket["nodes"].values()
                ),
                key=lambda node: node["player_id"],
            ),
            "edges": sorted(
                (
                    self._bucket_edge_to_dict(edge)
                    for edge in bucket["edges"].values()
                ),
                key=lambda edge: (edge["from_player_id"], edge["to_player_id"]),
            ),
        }

    @staticmethod
    def _bucket_node_to_dict(node: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "player_id": node["player_id"],
            "player_name": node["player_name"],
            "team_id": node["team_id"],
            "pass_count": int(node["pass_count"]),
            "passes_given": int(node["passes_given"]),
            "passes_received": int(node["passes_received"]),
            "position_given": dict(node["position_given"]),
            "position_received": dict(node["position_received"]),
            "position_total": dict(node["position_total"]),
        }

    @staticmethod
    def _bucket_edge_to_dict(edge: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "from_player_id": edge["from_player_id"],
            "to_player_id": edge["to_player_id"],
            "pass_count": int(edge["pass_count"]),
            "position": dict(edge["position"]),
        }

    # ------------------------------------------------------------------ #
    # Time and numeric helpers                                            #
    # ------------------------------------------------------------------ #

    @staticmethod
    def event_match_second(event: Event) -> int:
        minute = max(0, int(event.min or 0))
        second = max(0, min(59, int(event.sec or 0)))
        period_id = event.period_id

        period_offsets = {
            1: 0,
            2: 45,
            3: 90,
            4: 105,
            5: 120,
        }
        period_offset = period_offsets.get(period_id or 0, 0)
        absolute_minute = minute if minute >= period_offset else period_offset + minute

        return absolute_minute * 60 + second

    @staticmethod
    def _normalize_minute(minute: int | None) -> int:
        if minute is None:
            return 0
        return max(0, int(minute))

    @staticmethod
    def _empty_position_stat() -> dict[str, float]:
        return {"count": 0.0, "x_sum": 0.0, "y_sum": 0.0}

    @staticmethod
    def _add_position_stat(stat: Dict[str, float], x: float, y: float) -> None:
        stat["count"] = float(stat.get("count", 0.0)) + 1.0
        stat["x_sum"] = float(stat.get("x_sum", 0.0)) + x
        stat["y_sum"] = float(stat.get("y_sum", 0.0)) + y

    @staticmethod
    def _sum_position_stats(stats: Iterable[Dict[str, float]]) -> Dict[str, float]:
        total = {"count": 0.0, "x_sum": 0.0, "y_sum": 0.0}
        for stat in stats:
            total["count"] += float(stat.get("count", 0.0))
            total["x_sum"] += float(stat.get("x_sum", 0.0))
            total["y_sum"] += float(stat.get("y_sum", 0.0))
        return total

    @staticmethod
    def _avg(stat: Dict[str, float], key: str) -> float:
        count = float(stat.get("count", 0.0))
        if count <= 0:
            return 0.0
        return float(stat.get(key, 0.0)) / count

    @staticmethod
    def _coerce_float(value: object) -> Optional[float]:
        if value is None or value == "":
            return None
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None
        if not np.isfinite(number):
            return None
        return number

    @staticmethod
    def _has_valid_position(x: Optional[float], y: Optional[float]) -> bool:
        return x is not None and y is not None

    @staticmethod
    def _ensure_minute_capacity(items: List[Any], index: int, fill_value: Any) -> None:
        while len(items) <= index:
            if fill_value is None:
                items.append({"count": 0.0, "x_sum": 0.0, "y_sum": 0.0})
            else:
                items.append(fill_value)

    def _build_weight_matrix(
        self, bucket: int, player_ids: List[str]
    ) -> tuple[np.ndarray, List[str]]:
        """
        Builds a directed compatibility weight matrix from the start of the
        match up to the end of a deprecated 5-minute bucket.
        """
        cumulative_end = bucket_minute_range(bucket).stop
        id_to_idx = {pid: idx for idx, pid in enumerate(player_ids)}
        n = len(player_ids)
        W_full = np.zeros((n, n), dtype=float)

        for (from_id, to_id), edge in self.network.edges.items():
            fi = id_to_idx.get(from_id)
            ti = id_to_idx.get(to_id)
            if fi is None or ti is None:
                continue
            end = min(cumulative_end, len(edge.minute_buckets))
            passes_cumulative = sum(edge.minute_buckets[m] for m in range(end))
            if passes_cumulative > 0:
                W_full[fi, ti] = passes_cumulative

        activity = W_full.sum(axis=1) + W_full.sum(axis=0)
        active_mask = activity > 0
        active_indices = [i for i in range(n) if active_mask[i]]

        if not active_indices:
            return np.zeros((0, 0), dtype=float), []

        W = W_full[np.ix_(active_indices, active_indices)]
        present_ids = [player_ids[i] for i in active_indices]
        return W, present_ids
