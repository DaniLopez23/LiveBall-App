import assert from "node:assert/strict";
import test from "node:test";

import { getShotTargetOptaCoordinate } from "./eventPitchCoordinates.ts";

test("keeps the home shot goal-mouth side unchanged", () => {
	assert.deepEqual(
		getShotTargetOptaCoordinate(
			{ x: 88, y: 42, goal_mouth_y: 39, team_id: "home" },
			"away",
		),
		{ x: 100, y: 39 },
	);
});

test("mirrors only the away shot goal-mouth side", () => {
	assert.deepEqual(
		getShotTargetOptaCoordinate(
			{ x: 88, y: 42, goal_mouth_y: 39, team_id: "away" },
			"away",
		),
		{ x: 100, y: 61 },
	);
});

test("uses the shot Y fallback with the same away orientation", () => {
	assert.deepEqual(
		getShotTargetOptaCoordinate(
			{ x: 12, y: 28, goal_mouth_y: null, team_id: "away" },
			"away",
		),
		{ x: 0, y: 72 },
	);
});
