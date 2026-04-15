from __future__ import annotations

from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from app.services.players_service import PlayersService

router = APIRouter()


def _resolve_team_payload(teams: Dict[str, Dict[str, Any]], team_id: str) -> Dict[str, Any] | None:
	# Team IDs are normalized during XML parsing (e.g. "t173" -> "173").
	return teams.get(team_id.strip())


@router.get(
	"/{team_id}",
	summary="Players for a team",
	response_description="Team payload with its parsed players from the Opta F40 feed.",
)
async def get_team_players(team_id: str) -> Dict[str, Any]:
	"""Return the parsed players for a given team id."""
	service = PlayersService()
	teams = service.get_all_teams_players()

	team_payload = _resolve_team_payload(teams, team_id)
	if team_payload is None:
		raise HTTPException(
			status_code=404,
			detail=f"No team found for team_id '{team_id}'.",
		)

	return {
		"team_id": team_payload.get("team_id", team_id),
		"team_name": team_payload.get("team_name"),
		"team_short_name": team_payload.get("team_short_name"),
		"team_official_name": team_payload.get("team_official_name"),
		"players": team_payload.get("players", []),
	}
