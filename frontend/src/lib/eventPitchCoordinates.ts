import type { ShotEvent } from "../types/event.ts";

interface ShotTargetCoordinate {
	x: number;
	y: number;
}

function isSameTeam(
	leftTeamId: string | null | undefined,
	rightTeamId: string | null | undefined,
): boolean {
	return (
		leftTeamId != null &&
		rightTeamId != null &&
		String(leftTeamId) === String(rightTeamId)
	);
}

/**
 * Opta goal-mouth Y is relative to the attacking team. On a shared pitch,
 * the away target must be mirrored laterally to preserve its real side.
 */
export function getShotTargetOptaCoordinate(
	event: Pick<ShotEvent, "x" | "y" | "goal_mouth_y" | "team_id">,
	awayTeamId?: string | null,
): ShotTargetCoordinate {
	const rawGoalMouthY = event.goal_mouth_y ?? event.y ?? 50;
	const goalMouthY = isSameTeam(event.team_id, awayTeamId)
		? 100 - rawGoalMouthY
		: rawGoalMouthY;

	return {
		x: (event.x ?? 50) > 50 ? 100 : 0,
		y: goalMouthY,
	};
}
