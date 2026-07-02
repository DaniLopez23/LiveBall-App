import assert from "node:assert/strict";
import test from "node:test";

import type { Event } from "../types/event.ts";
import {
	getCurrentMatchMinute,
	getScoreFromGoalEvents,
} from "./matchEventState.ts";

const makeEvent = (overrides: Partial<Event>): Event =>
	({
		id: "event",
		event_id: "event",
		type_id: "1",
		event_name: "Event",
		event_description: "Event",
		...overrides,
	}) as Event;

test("derives the score from goal events including own goals", () => {
	const score = getScoreFromGoalEvents(
		[
			makeEvent({ id: "home-goal", event_id: "home-goal", type_id: "16", team_id: "home" }),
			makeEvent({ id: "away-goal", event_id: "away-goal", type_id: "16", team_id: "away" }),
			makeEvent({
				id: "away-own-goal",
				event_id: "away-own-goal",
				type_id: "16",
				team_id: "away",
				own_goal: true,
			}),
			makeEvent({ id: "shot", event_id: "shot", type_id: "15", team_id: "home" }),
		],
		"home",
		"away",
	);

	assert.deepEqual(score, { home: 2, away: 1 });
});

test("normalizes a period-relative second-half minute", () => {
	const minute = getCurrentMatchMinute([
		makeEvent({ period_id: 1, min: 44, sec: 58 }),
		makeEvent({ period_id: 2, min: 12, sec: 10 }),
	]);

	assert.equal(minute, 57);
});
