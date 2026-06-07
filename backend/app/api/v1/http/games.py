from fastapi import APIRouter, HTTPException, Request

from app.schemas.games import AvailableMatch
from app.services.games.catalog_service import MatchCatalogService

router = APIRouter()


@router.get(
    "",
    response_model=list[AvailableMatch],
    summary="Selectable matches",
    response_description="Matches parsed from the configured Opta F42 feed.",
)
async def get_available_games(request: Request) -> list[AvailableMatch]:
    """Return all F42 MatchData objects prepared for frontend selection."""
    service: MatchCatalogService = request.app.state.match_catalog_service
    try:
        return service.get_available_matches()
    except (OSError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to load the F42 match catalogue: {exc}",
        ) from exc
