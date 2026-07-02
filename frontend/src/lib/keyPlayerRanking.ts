import { isShotEvent, type Event } from "../types/event.ts";

export type KeyPlayerRole = "defense" | "midfield" | "attack";

export interface KeyPlayerStats {
	id: string;
	name: string;
	passes: number;
	successfulPasses: number;
	duelsWon: number;
	dribbles: number;
	successfulDribbles: number;
	defensiveActions: number;
	successfulDefensiveActions: number;
	tackles: number;
	successfulTackles: number;
	shots: number;
	shotsOnTarget: number;
	blockedShots: number;
	goals: number;
	assists: number;
}

export interface RankedKeyPlayer {
	role: KeyPlayerRole;
	player: KeyPlayerStats | null;
	score: number;
}

const DEFENSIVE_TYPE_IDS = new Set(["7", "8", "12", "44", "49", "67"]);
const DUEL_TYPE_IDS = new Set(["44", "67"]);
// Goals and assists complement role metrics, but only dominate the attacking rank.
const DECISIVE_ACTION_WEIGHTS = {
	defense: { goals: 8, assists: 6 },
	midfield: { goals: 12, assists: 10 },
	attack: { goals: 100, assists: 90 },
} as const;
const SCORE_WEIGHTS = {
	defense: {
		defensiveActions: 1,
		successfulDefensiveActions: 3,
		duelsWon: 6,
		tackles: 2,
		successfulTackles: 8,
	},
	midfield: {
		passes: 0.5,
		successfulPasses: 1,
		duelsWon: 5,
		dribbles: 2,
		successfulDribbles: 6,
	},
	attack: {
		successfulPasses: 0.1,
		shots: 2,
		shotsOnTarget: 6,
		blockedShots: 3,
	},
} as const;

function getDecisiveActionScore(
	player: KeyPlayerStats,
	role: KeyPlayerRole,
): number {
	const weights = DECISIVE_ACTION_WEIGHTS[role];
	return (
		player.goals * weights.goals +
		player.assists * weights.assists
	);
}

function isSuccessful(event: Event): boolean {
	return String(event.outcome) === "1";
}

function getPlayerKey(event: Event): string | null {
	return event.player_id ?? event.player?.id ?? null;
}

function getPlayerName(event: Event): string {
	const dorsal = event.player?.dorsal?.trim();
	const name = event.player?.name?.trim();

	if (dorsal && name) return `${dorsal} - ${name}`;
	if (name) return name;
	if (dorsal) return dorsal;
	return event.player_id ? `Jugador ${event.player_id}` : "Jugador sin identificar";
}

function createPlayer(event: Event, id: string): KeyPlayerStats {
	return {
		id,
		name: getPlayerName(event),
		passes: 0,
		successfulPasses: 0,
		duelsWon: 0,
		dribbles: 0,
		successfulDribbles: 0,
		defensiveActions: 0,
		successfulDefensiveActions: 0,
		tackles: 0,
		successfulTackles: 0,
		shots: 0,
		shotsOnTarget: 0,
		blockedShots: 0,
		goals: 0,
		assists: 0,
	};
}

function getRoleScore(player: KeyPlayerStats, role: KeyPlayerRole): number {
	if (role === "defense") {
		return (
			player.defensiveActions * SCORE_WEIGHTS.defense.defensiveActions +
			player.successfulDefensiveActions *
				SCORE_WEIGHTS.defense.successfulDefensiveActions +
			player.duelsWon * SCORE_WEIGHTS.defense.duelsWon +
			player.tackles * SCORE_WEIGHTS.defense.tackles +
			player.successfulTackles * SCORE_WEIGHTS.defense.successfulTackles +
			getDecisiveActionScore(player, role)
		);
	}

	if (role === "midfield") {
		return (
			player.passes * SCORE_WEIGHTS.midfield.passes +
			player.successfulPasses * SCORE_WEIGHTS.midfield.successfulPasses +
			player.duelsWon * SCORE_WEIGHTS.midfield.duelsWon +
			player.dribbles * SCORE_WEIGHTS.midfield.dribbles +
			player.successfulDribbles * SCORE_WEIGHTS.midfield.successfulDribbles +
			getDecisiveActionScore(player, role)
		);
	}

	return (
		player.successfulPasses * SCORE_WEIGHTS.attack.successfulPasses +
		player.shots * SCORE_WEIGHTS.attack.shots +
		player.shotsOnTarget * SCORE_WEIGHTS.attack.shotsOnTarget +
		player.blockedShots * SCORE_WEIGHTS.attack.blockedShots +
		getDecisiveActionScore(player, role)
	);
}

function getTieBreakers(player: KeyPlayerStats, role: KeyPlayerRole): number[] {
	if (role === "defense") {
		return [
			player.goals,
			player.assists,
			player.successfulTackles,
			player.duelsWon,
			player.successfulDefensiveActions,
			player.defensiveActions,
		];
	}

	if (role === "midfield") {
		return [
			player.goals,
			player.assists,
			player.successfulPasses,
			player.successfulDribbles,
			player.duelsWon,
			player.passes,
		];
	}

	return [
		player.goals,
		player.assists,
		player.shotsOnTarget,
		player.shots,
		player.successfulPasses,
	];
}

function rankPlayer(
	players: KeyPlayerStats[],
	role: KeyPlayerRole,
): RankedKeyPlayer {
	const ranked = players
		.map((player) => ({ player, score: getRoleScore(player, role) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;

			const aTieBreakers = getTieBreakers(a.player, role);
			const bTieBreakers = getTieBreakers(b.player, role);
			for (let index = 0; index < aTieBreakers.length; index += 1) {
				const difference =
					(bTieBreakers[index] ?? 0) - (aTieBreakers[index] ?? 0);
				if (difference !== 0) return difference;
			}

			return a.player.name.localeCompare(b.player.name, "es-ES");
		});

	return {
		role,
		player: ranked[0]?.player ?? null,
		score: ranked[0]?.score ?? 0,
	};
}

export function getRankedKeyPlayers(
	events: Event[],
	teamId: string | null | undefined,
): RankedKeyPlayer[] {
	if (!teamId) {
		return (["defense", "midfield", "attack"] as const).map((role) => ({
			role,
			player: null,
			score: 0,
		}));
	}

	const players = new Map<string, KeyPlayerStats>();
	const eventsByReference = new Map<string, Event>();

	for (const event of events) {
		eventsByReference.set(String(event.id), event);
		eventsByReference.set(String(event.event_id), event);

		if (event.team_id !== teamId) continue;

		const playerId = getPlayerKey(event);
		if (!playerId) continue;

		const player = players.get(playerId) ?? createPlayer(event, playerId);
		const successful = isSuccessful(event);

		if (event.type_id === "1" || event.type_id === "2") {
			player.passes += 1;
			if (successful) player.successfulPasses += 1;
		}

		if (event.type_id === "3") {
			player.dribbles += 1;
			if (successful) player.successfulDribbles += 1;
		}

		if (DEFENSIVE_TYPE_IDS.has(event.type_id)) {
			player.defensiveActions += 1;
			if (successful) player.successfulDefensiveActions += 1;
		}

		if (event.type_id === "7") {
			player.tackles += 1;
			if (successful) player.successfulTackles += 1;
		}

		if (DUEL_TYPE_IDS.has(event.type_id) && successful) {
			player.duelsWon += 1;
		}

		if (isShotEvent(event)) {
			player.shots += 1;

			const blocked = event.type_id === "15" && event.blocked_by_defender === true;
			const goal = event.type_id === "16" || event.outcome === "Goal";
			if (blocked) player.blockedShots += 1;
			if (goal || (event.type_id === "15" && !blocked)) player.shotsOnTarget += 1;
			if (goal) player.goals += 1;
		}

		players.set(playerId, player);
	}

	for (const event of events) {
		if (!isShotEvent(event) || event.team_id !== teamId || event.type_id !== "16") {
			continue;
		}

		if (!event.assist_event_id) {
			continue;
		}

		const assistEvent = eventsByReference.get(String(event.assist_event_id));
		if (!assistEvent || assistEvent.team_id !== teamId) continue;

		const playerId = getPlayerKey(assistEvent);
		if (!playerId) continue;

		const player = players.get(playerId) ?? createPlayer(assistEvent, playerId);
		player.assists += 1;
		players.set(playerId, player);
	}

	const playerValues = [...players.values()];
	return (["defense", "midfield", "attack"] as const).map((role) =>
		rankPlayer(playerValues, role),
	);
}
