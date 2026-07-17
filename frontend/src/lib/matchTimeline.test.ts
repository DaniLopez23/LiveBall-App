import assert from "node:assert/strict";
import test from "node:test";

import type { Event } from "../types/event.ts";
import {
	createMatchTimeline,
	eventToTimelineSecond,
	formatTimelineRange,
	timelineRangeToMatchRange,
} from "./matchTimeline.ts";

function makeEvent(id: string, periodId: number, minute: number, second = 0): Event {
	return {
		id,
		event_id: id,
		event_name: "Pass",
		event_description: "",
		type_id: "1",
		period_id: periodId,
		min: minute,
		sec: second,
	};
}

test("places a restarted 45th minute after first-half added time", () => {
	const firstHalfAdded = makeEvent("first-added", 1, 51, 12);
	const secondHalfStart = makeEvent("second-start", 2, 45, 3);
	const timeline = createMatchTimeline([firstHalfAdded, secondHalfStart]);

	assert.equal(timeline.firstHalfEndSecond, 51 * 60 + 12);
	assert.equal(eventToTimelineSecond(firstHalfAdded, timeline), 51 * 60 + 12);
	assert.equal(eventToTimelineSecond(secondHalfStart, timeline), 51 * 60 + 15);
	assert.equal(timeline.availableSecond, 51 * 60 + 15);
	assert.equal(formatTimelineRange([timeline.firstHalfEndSecond, timeline.durationSecond], timeline), "45:00 - 90:00");
});

test("maps each visual half back to the provider clock", () => {
	const timeline = createMatchTimeline([
		makeEvent("first-added", 1, 51),
		makeEvent("second", 2, 60),
	]);

	assert.deepEqual(
		timelineRangeToMatchRange([0, timeline.firstHalfEndSecond], timeline),
		[0, 51 * 60],
	);
	assert.deepEqual(
		timelineRangeToMatchRange([timeline.firstHalfEndSecond, timeline.durationSecond], timeline),
		[45 * 60, 90 * 60],
	);
});

test("keeps first-half added time when live play has just entered 2P", () => {
	const timeline = createMatchTimeline([
		makeEvent("first-added", 1, 51),
		makeEvent("second-start", 2, 45, 3),
	]);

	assert.deepEqual(
		timelineRangeToMatchRange([0, timeline.availableSecond], timeline),
		[0, 51 * 60],
	);
});

test("uses the latest timeline event even when events are not ordered", () => {
	const timeline = createMatchTimeline([
		makeEvent("second-late", 2, 89, 30),
		makeEvent("first-late-array-item", 1, 44, 10),
	]);

	assert.equal(timeline.hasSecondHalf, true);
	assert.equal(timeline.firstHalfAvailableSecond, 44 * 60 + 10);
	assert.equal(timeline.firstHalfEndSecond, 45 * 60);
	assert.equal(timeline.availableSecond, 89 * 60 + 30);
	assert.equal(timeline.currentPeriodId, 2);
});

test("keeps first-half progress separate from the regulation boundary", () => {
	const timeline = createMatchTimeline([
		makeEvent("first-current", 1, 23, 17),
		makeEvent("first-older", 1, 8, 45),
	]);

	assert.equal(timeline.firstHalfAvailableSecond, 23 * 60 + 17);
	assert.equal(timeline.firstHalfEndSecond, 45 * 60);
	assert.equal(timeline.availableSecond, 23 * 60 + 17);
});

test("ignores technical setup periods when calculating live progress", () => {
	const timeline = createMatchTimeline([
		makeEvent("team-setup", 16, 0),
		makeEvent("first-current", 1, 7, 12),
		makeEvent("first-older", 1, 6, 40),
	]);

	assert.equal(timeline.hasSecondHalf, false);
	assert.equal(timeline.currentPeriodId, 1);
	assert.equal(timeline.firstHalfAvailableSecond, 7 * 60 + 12);
	assert.equal(timeline.availableSecond, 7 * 60 + 12);
});
