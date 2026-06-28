"""
network_metrics.py
==================
Calculates graph-theory statistics for a **directed weighted pass network**.

The network is represented as a weight matrix ``W`` (numpy 2-D array) where
``W[i][j]`` is the number of passes from player *i* to player *j*.

No external graph library is required – only numpy (already available).

Public API
----------
compute_network_metrics(W, player_ids) -> dict
    Returns a single dict with all metrics for every player.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, List

import numpy as np

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------ #
# Public entry point                                                   #
# ------------------------------------------------------------------ #


def compute_network_metrics(
    W: np.ndarray,
    player_ids: List[str],
) -> Dict[str, Any]:
    """
    Compute a full set of network-theory metrics for a pass network.

    Parameters
    ----------
    W : np.ndarray, shape (n, n), dtype float
        Directed weight matrix.  ``W[i, j]`` = passes from player i to player j.
    player_ids : list[str]
        Node labels, aligned with the rows/cols of *W*.

    Returns
    -------
    dict with keys:
        ``top_passer``          – {player_id, passes_given}
        ``top_receiver``        – {player_id, passes_received}
        ``top_player_total``    – {player_id, total_passes}
        ``top_connection``      – {from_player_id, to_player_id, pass_count}
        ``betweenness``         – {player_id: float, …}  (normalised 0-1)
        ``eigenvector``         – {player_id: float, …}  (normalised 0-1)
        ``flow_centrality``     – {player_id: float, …}  (range -1 to 1)
    """
    n = len(player_ids)
    if n == 0:
        return _empty_metrics()

    results: Dict[str, Any] = {}

    # ── Node-level pass sums ──────────────────────────────────────── #
    given = W.sum(axis=1)       # row sums  = passes given by each player
    received = W.sum(axis=0)    # col sums  = passes received by each player
    total = given + received

    # top passer / receiver / total
    results["top_passer"] = _top_node(player_ids, given, "passes_given")
    results["top_receiver"] = _top_node(player_ids, received, "passes_received")
    results["top_player_total"] = _top_node(player_ids, total, "total_passes")

    # top connection
    results["top_connection"] = _top_edge(W, player_ids)

    # ── Graph-theory centralities ─────────────────────────────────── #
    results["betweenness"] = _betweenness_centrality(W, player_ids)
    results["eigenvector"] = _eigenvector_centrality(W, player_ids)
    results["flow_centrality"] = _flow_centrality(W, player_ids, given, received)

    return results


# ------------------------------------------------------------------ #
# Helper – top node / edge                                            #
# ------------------------------------------------------------------ #


def _top_node(
    player_ids: List[str],
    scores: np.ndarray,
    score_key: str,
) -> Dict[str, Any]:
    """Returns the player with the highest score (or empty dict if all zeros)."""
    if scores.max() == 0:
        return {}
    idx = int(np.argmax(scores))
    return {"player_id": player_ids[idx], score_key: int(scores[idx])}


def _top_edge(W: np.ndarray, player_ids: List[str]) -> Dict[str, Any]:
    """Returns the directed edge (i→j) with the highest weight."""
    if W.max() == 0:
        return {}
    flat_idx = int(np.argmax(W))
    n = len(player_ids)
    i, j = flat_idx // n, flat_idx % n
    if i == j:
        # Ignore self-loops; find next best
        tmp = W.copy()
        np.fill_diagonal(tmp, 0)
        if tmp.max() == 0:
            return {}
        flat_idx = int(np.argmax(tmp))
        i, j = flat_idx // n, flat_idx % n
    return {
        "from_player_id": player_ids[i],
        "to_player_id": player_ids[j],
        "pass_count": int(W[i, j]),
    }


# ------------------------------------------------------------------ #
# Betweenness Centrality (Brandes, directed, weighted)                #
# ------------------------------------------------------------------ #


def _betweenness_centrality(
    W: np.ndarray,
    player_ids: List[str],
) -> Dict[str, float]:
    """
    Computes *normalised* betweenness centrality on the directed weighted graph.

    Uses Brandes's algorithm with **inverted weights** as distances so that
    heavier edges are traversed preferentially (more passes = shorter distance).
    Self-loops are ignored.

    Normalisation: divides by ``(n-1)*(n-2)`` (directed formula).
    """
    n = len(player_ids)
    if n <= 2:
        return {pid: 0.0 for pid in player_ids}

    # Distance matrix: dist[i,j] = 1 / W[i,j], large value if no edge.
    INF = float("inf")
    dist = np.full((n, n), INF)
    np.fill_diagonal(dist, 0.0)
    for i in range(n):
        for j in range(n):
            if i != j and W[i, j] > 0:
                dist[i, j] = 1.0 / W[i, j]

    # Dijkstra from each source (using simple O(n²) priority scan since n ≤ ~25)
    betweenness = np.zeros(n)

    for s in range(n):
        # Single-source shortest paths via Dijkstra
        d = dist[s].copy()
        visited = [False] * n
        sigma = np.zeros(n)  # number of shortest paths from s
        sigma[s] = 1.0
        pred: list[list[int]] = [[] for _ in range(n)]

        queue = list(range(n))
        remaining = d.copy()
        remaining[s] = 0.0

        order: list[int] = []
        tmp_d = remaining.copy()

        while queue:
            # find unvisited node with min distance
            u = -1
            min_d = INF
            for v in queue:
                if not visited[v] and tmp_d[v] < min_d:
                    min_d = tmp_d[v]
                    u = v
            if u == -1 or min_d == INF:
                break
            visited[u] = True
            queue.remove(u)
            order.append(u)

            for w in range(n):
                if w == u or dist[u, w] == INF:
                    continue
                nd = tmp_d[u] + dist[u, w]
                if nd < tmp_d[w] - 1e-12:
                    tmp_d[w] = nd
                    sigma[w] = sigma[u]
                    pred[w] = [u]
                elif abs(nd - tmp_d[w]) < 1e-12:
                    sigma[w] += sigma[u]
                    pred[w].append(u)

        # Accumulation (back-propagation)
        delta = np.zeros(n)
        for w in reversed(order):
            for v in pred[w]:
                if sigma[w] > 0:
                    delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w])
            if w != s:
                betweenness[w] += delta[w]

    # Normalise
    norm = (n - 1) * (n - 2)
    if norm > 0:
        betweenness /= norm

    return {pid: round(float(betweenness[i]), 4) for i, pid in enumerate(player_ids)}


# ------------------------------------------------------------------ #
# Eigenvector Centrality (power iteration)                             #
# ------------------------------------------------------------------ #


def _eigenvector_centrality(
    W: np.ndarray,
    player_ids: List[str],
    max_iter: int = 100,
    tol: float = 1e-6,
) -> Dict[str, float]:
    """
    Computes eigenvector centrality via power iteration on the adjacency matrix.

    A node is important if it receives passes from other important nodes.
    Convergence is monitored; if it fails (all-zero network) every player
    gets 0.0.
    """
    n = len(player_ids)
    if n == 0 or W.sum() == 0:
        return {pid: 0.0 for pid in player_ids}

    # Use column-normalised W so in-flow drives importance
    x = np.ones(n)
    A = W.T.astype(float)  # column = who gives passes to this player

    for _ in range(max_iter):
        x_new = A @ x
        norm = np.linalg.norm(x_new)
        if norm < 1e-12:
            x = np.zeros(n)
            break
        x_new /= norm
        if np.linalg.norm(x_new - x) < tol:
            x = x_new
            break
        x = x_new

    # Normalise to [0, 1]
    mx = x.max()
    if mx > 0:
        x /= mx

    return {pid: round(float(x[i]), 4) for i, pid in enumerate(player_ids)}


# ------------------------------------------------------------------ #
# Flow Centrality (net flow)                                          #
# ------------------------------------------------------------------ #


def _flow_centrality(
    W: np.ndarray,
    player_ids: List[str],
    given: np.ndarray,
    received: np.ndarray,
) -> Dict[str, float]:
    """
    Flow centrality = (passes_given − passes_received) / total_passes_in_network.

    Positive values → player is a *source* (creator / ball-player).
    Negative values → player is a *sink* (target / finisher).
    Zero            → balanced.

    Result is in range [-1, 1].
    """
    total_network = float(W.sum())
    if total_network == 0:
        return {pid: 0.0 for pid in player_ids}

    flow = (given - received) / total_network
    return {pid: round(float(flow[i]), 4) for i, pid in enumerate(player_ids)}


# ------------------------------------------------------------------ #
# Fallback                                                            #
# ------------------------------------------------------------------ #


def _empty_metrics() -> Dict[str, Any]:
    return {
        "top_passer": {},
        "top_receiver": {},
        "top_player_total": {},
        "top_connection": {},
        "betweenness": {},
        "eigenvector": {},
        "flow_centrality": {},
    }
