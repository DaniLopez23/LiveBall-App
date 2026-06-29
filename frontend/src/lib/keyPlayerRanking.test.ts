import assert from "node:assert/strict";
import test from "node:test";

import type { Event } from "../types/event.ts";
import { getRankedKeyPlayers } from "./keyPlayerRanking.ts";

function makeEvent({
	id,
	typeId,
	playerId,
	teamId = "home",
	outcome = 1,
	extra = {},
}: {
	id: string;
	typeId: string;
	playerId: string;
	teamId?: string;
	outcome?: number | string;
	extra?: Record<string, unknown>;
}): Event {
	return {
		id,
		event_id: id,
		event_name: "Test event",
		event_description: "Test event",
		type_id: typeId,
		player_id: playerId,
		team_id: teamId,
		outcome,
		player: { id: playerId, name: playerId, dorsal: null },
		...extra,
	} as Event;
}

test("ranks one player per line using only the selected team", () => {
	const events: Event[] = [
		makeEvent({ id: "tackle-ok", typeId: "7", playerId: "Defensa" }),
		makeEvent({ id: "tackle-fail", typeId: "7", playerId: "Defensa", outcome: 0 }),
		makeEvent({ id: "duel-ok", typeId: "44", playerId: "Defensa" }),
		makeEvent({ id: "interception", typeId: "8", playerId: "Defensa" }),
		makeEvent({ id: "assist-pass", typeId: "1", playerId: "Medio" }),
		makeEvent({ id: "pass-2", typeId: "1", playerId: "Medio" }),
		makeEvent({ id: "dribble-ok", typeId: "3", playerId: "Medio" }),
		makeEvent({ id: "dribble-fail", typeId: "3", playerId: "Medio", outcome: 0 }),
		makeEvent({
			id: "goal",
			typeId: "16",
			playerId: "Delantero",
			outcome: "Goal",
			extra: { type_name: "shot", assist_event_id: "assist-pass" },
		}),
		makeEvent({
			id: "away-goal-1",
			typeId: "16",
			playerId: "Rival",
			teamId: "away",
			outcome: "Goal",
			extra: { type_name: "shot" },
		}),
		makeEvent({
			id: "away-goal-2",
			typeId: "16",
			playerId: "Rival",
			teamId: "away",
			outcome: "Goal",
			extra: { type_name: "shot" },
		}),
	];

	const [defense, midfield, attack] = getRankedKeyPlayers(events, "home");

	assert.equal(defense?.player?.id, "Defensa");
	assert.equal(defense?.player?.tackles, 2);
	assert.equal(defense?.player?.successfulTackles, 1);
	assert.equal(defense?.player?.duelsWon, 1);
	assert.equal(defense?.player?.successfulDefensiveActions, 3);

	assert.equal(midfield?.player?.id, "Medio");
	assert.equal(midfield?.player?.passes, 2);
	assert.equal(midfield?.player?.successfulPasses, 2);
	assert.equal(midfield?.player?.dribbles, 2);
	assert.equal(midfield?.player?.successfulDribbles, 1);
	assert.equal(midfield?.player?.assists, 1);

	assert.equal(attack?.player?.id, "Delantero");
	assert.equal(attack?.player?.goals, 1);
	assert.equal(attack?.player?.shotsOnTarget, 1);
});

test("goals dominate high shot volume and blocked shots stay off target", () => {
	const events: Event[] = [];

	for (let index = 0; index < 10; index += 1) {
		events.push(
			makeEvent({
				id: `saved-${index}`,
				typeId: "15",
				playerId: "Volumen",
				outcome: "Attempt Saved",
				extra: { type_name: "shot", blocked_by_defender: false },
			}),
		);
	}

	events.push(
		makeEvent({
			id: "blocked",
			typeId: "15",
			playerId: "Finalizador",
			outcome: "Attempt Saved",
			extra: { type_name: "shot", blocked_by_defender: true },
		}),
		makeEvent({
			id: "winning-goal",
			typeId: "16",
			playerId: "Finalizador",
			outcome: "Goal",
			extra: { type_name: "shot" },
		}),
	);

	const attack = getRankedKeyPlayers(events, "home").find(
		({ role }) => role === "attack",
	);

	assert.equal(attack?.player?.id, "Finalizador");
	assert.equal(attack?.player?.shots, 2);
	assert.equal(attack?.player?.shotsOnTarget, 1);
	assert.equal(attack?.player?.blockedShots, 1);
});

test("an assist decisively increases the attacking ranking", () => {
	const events: Event[] = [
		makeEvent({
			id: "creator-goal",
			typeId: "16",
			playerId: "Creador",
			outcome: "Goal",
			extra: { type_name: "shot" },
		}),
		makeEvent({ id: "creator-pass", typeId: "1", playerId: "Creador" }),
		makeEvent({
			id: "other-goal",
			typeId: "16",
			playerId: "Otro delantero",
			outcome: "Goal",
			extra: { type_name: "shot", assist_event_id: "creator-pass" },
		}),
		makeEvent({
			id: "other-shot",
			typeId: "13",
			playerId: "Otro delantero",
			outcome: "Miss",
			extra: { type_name: "shot" },
		}),
	];

	const attack = getRankedKeyPlayers(events, "home").find(
		({ role }) => role === "attack",
	);

	assert.equal(attack?.player?.id, "Creador");
	assert.equal(attack?.player?.assists, 1);
	assert.equal(attack?.score, 198);
});
