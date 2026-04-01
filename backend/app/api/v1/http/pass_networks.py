"""
HTTP endpoints for pass-network statistics.

Routes:
    GET /api/v1/games/{game_id}/pass-network/{team_id}/stats
        Returns statistics for all 19 five-minute buckets.

    GET /api/v1/games/{game_id}/pass-network/{team_id}/stats/{bucket}
        Returns statistics for a single bucket (0-18).
"""
from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException, Request

from app.schemas.pass_networks import N_5MIN_BUCKETS

router = APIRouter()


@router.get(
    "/{game_id}/pass-network/{team_id}/stats",
    summary="Pass-network statistics for all 5-min buckets",
    response_description=(
        "Network-theory metrics per 5-minute bucket: top passer, top receiver, "
        "top player total, top connection, betweenness centrality, eigenvector "
        "centrality, and flow centrality."
    ),
)
async def get_pass_network_stats(
    game_id: str,
    team_id: str,
    request: Request,
) -> Dict[str, Any]:
    """Return network statistics broken down into 19 five-minute buckets.

    Each bucket covers a 5-minute window (bucket 0 = 0–4 min, …,
    bucket 18 = 90 min).  Buckets with no passes are returned with empty
    metric dicts and ``total_passes=0``.
    """
    cache = request.app.state.cache
    key = (game_id, team_id)

    if key not in cache.pass_networks:
        raise HTTPException(
            status_code=404,
            detail=f"No pass network found for game '{game_id}', team '{team_id}'.",
        )

    service = cache.pass_networks[key]
    return service.get_bucket_statistics(bucket=None)


@router.get(
    "/{game_id}/pass-network/{team_id}/stats/{bucket}",
    summary="Pass-network statistics for a single 5-min bucket",
    response_description="Network-theory metrics for the requested bucket.",
)
async def get_pass_network_stats_bucket(
    game_id: str,
    team_id: str,
    bucket: int,
    request: Request,
) -> Dict[str, Any]:
    """Return network statistics for a single five-minute bucket (0–18).

    - Bucket 0  → minutes 0–4
    - Bucket 1  → minutes 5–9
    - …
    - Bucket 17 → minutes 85–89
    - Bucket 18 → minute 90
    """
    if bucket < 0 or bucket >= N_5MIN_BUCKETS:
        raise HTTPException(
            status_code=422,
            detail=f"Bucket must be between 0 and {N_5MIN_BUCKETS - 1} (inclusive).",
        )

    cache = request.app.state.cache
    key = (game_id, team_id)

    if key not in cache.pass_networks:
        raise HTTPException(
            status_code=404,
            detail=f"No pass network found for game '{game_id}', team '{team_id}'.",
        )

    service = cache.pass_networks[key]
    return service.get_bucket_statistics(bucket=bucket)
