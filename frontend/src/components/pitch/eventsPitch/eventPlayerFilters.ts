import type { PitchEvent } from "@/types/event";
import type { Game } from "@/types/game";

export interface PlayerFilterOption {
	id: string;
	label: string;
	teamId?: string | null;
}

type EventTeamFilter = "home" | "away" | "both";

function getTeamIdForFilter(
	teamFilter: EventTeamFilter,
	game: Game | null | undefined,
): string | null {
	if (!game || teamFilter === "both") return null;
	return teamFilter === "home" ? game.home_team.team_id : game.away_team.team_id;
}

function formatPlayerOptionLabel(
	id: string,
	dorsal?: string | null,
	name?: string | null,
): string {
	const safeDorsal = dorsal?.trim() || "S/D";
	const safeName = name?.trim() || `Jugador ${id}`;
	return `${safeDorsal}-${safeName}`;
}

function getEventPlayerIds(event: PitchEvent): string[] {
	const ids = [
		event.player?.id,
		event.player_id,
		event.player_receiver?.id,
		event.player_receiver_id,
	]
		.map((id) => id?.trim())
		.filter((id): id is string => Boolean(id));

	return Array.from(new Set(ids));
}

export function eventMatchesPlayerFilter(
	event: PitchEvent,
	selectedPlayerIds: string[],
): boolean {
	if (selectedPlayerIds.length === 0) return true;
	const selected = new Set(selectedPlayerIds);
	return getEventPlayerIds(event).some((id) => selected.has(id));
}

export function buildPlayerOptions(
	events: PitchEvent[],
	teamFilter: EventTeamFilter,
	game: Game | null | undefined,
): PlayerFilterOption[] {
	const selectedTeamId = getTeamIdForFilter(teamFilter, game);
	const playersById = new Map<string, PlayerFilterOption & { dorsalSort: number }>();

	for (const event of events) {
		if (selectedTeamId && event.team_id !== selectedTeamId) continue;

		const candidates = [
			{
				id: event.player?.id ?? event.player_id,
				dorsal: event.player?.dorsal,
				name: event.player?.name,
			},
			{
				id: event.player_receiver?.id ?? event.player_receiver_id,
				dorsal: event.player_receiver?.dorsal,
				name: event.player_receiver?.name,
			},
		];

		for (const candidate of candidates) {
			const id = candidate.id?.trim();
			if (!id) continue;

			const dorsalSort = Number(candidate.dorsal);
			const option = {
				id,
				label: formatPlayerOptionLabel(id, candidate.dorsal, candidate.name),
				teamId: event.team_id,
				dorsalSort: Number.isFinite(dorsalSort) ? dorsalSort : Number.MAX_SAFE_INTEGER,
			};
			const current = playersById.get(id);

			if (!current || current.label.startsWith("S/D-")) {
				playersById.set(id, option);
			}
		}
	}

	return Array.from(playersById.values())
		.sort(
			(left, right) =>
				left.dorsalSort - right.dorsalSort ||
				left.label.localeCompare(right.label, "es", { sensitivity: "base" }),
		)
		.map(({ dorsalSort, ...option }) => option);
}
