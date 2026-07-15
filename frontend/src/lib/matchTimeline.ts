import { getEventMatchSecond } from "./matchTime.ts";
import type { Event } from "../types/event.ts";

export const REGULATION_HALF_SECONDS = 45 * 60;
export const REGULATION_MATCH_SECONDS = 90 * 60;

export interface MatchTimelineModel {
	firstHalfEndSecond: number;
	secondHalfEndMatchSecond: number;
	durationSecond: number;
	availableSecond: number;
	currentPeriodId: number;
	hasSecondHalf: boolean;
}

function getMainPeriodId(event: Event): 1 | 2 {
	if ((event.period_id ?? 1) >= 2) return 2;
	return 1;
}

/**
 * Builds a monotonic UI timeline while keeping the provider clock untouched.
 * Added time belongs to the end of 1P; 2P starts in the next visual segment
 * even when the provider sends its first event as minute 45 again.
 */
export function createMatchTimeline(events: Event[]): MatchTimelineModel {
	let firstHalfEndSecond = REGULATION_HALF_SECONDS;
	let secondHalfEndMatchSecond = REGULATION_MATCH_SECONDS;

	for (const event of events) {
		const matchSecond = getEventMatchSecond(event);
		if (matchSecond == null) continue;

		if (getMainPeriodId(event) === 1) {
			firstHalfEndSecond = Math.max(firstHalfEndSecond, matchSecond);
		} else {
			secondHalfEndMatchSecond = Math.max(secondHalfEndMatchSecond, matchSecond);
		}
	}

	const hasSecondHalf = events.some((event) => (event.period_id ?? 1) >= 2);
	const durationSecond =
		firstHalfEndSecond + (secondHalfEndMatchSecond - REGULATION_HALF_SECONDS);
	let latestTimelineSecond = 0;
	let currentPeriodId = 1;

	for (const event of events) {
		const matchSecond = getEventMatchSecond(event);
		if (matchSecond == null) continue;

		const timelineSecond = eventToTimelineSecond(event, { firstHalfEndSecond });
		if (timelineSecond >= latestTimelineSecond) {
			latestTimelineSecond = timelineSecond;
			currentPeriodId = getMainPeriodId(event);
		}
	}

	return {
		firstHalfEndSecond,
		secondHalfEndMatchSecond,
		durationSecond,
		availableSecond: latestTimelineSecond,
		currentPeriodId,
		hasSecondHalf,
	};
}

export function eventToTimelineSecond(
	event: Event,
	timeline: Pick<MatchTimelineModel, "firstHalfEndSecond">,
): number {
	const matchSecond = getEventMatchSecond(event) ?? 0;
	if (getMainPeriodId(event) === 1) return matchSecond;

	return timeline.firstHalfEndSecond + Math.max(0, matchSecond - REGULATION_HALF_SECONDS);
}

export function timelineSecondToMatchSecond(
	timelineSecond: number,
	timeline: Pick<MatchTimelineModel, "firstHalfEndSecond">,
	periodAtBoundary: 1 | 2 = 2,
): number {
	const safeSecond = Math.max(0, timelineSecond);
	if (
		safeSecond < timeline.firstHalfEndSecond ||
		(safeSecond === timeline.firstHalfEndSecond && periodAtBoundary === 1)
	) {
		return safeSecond;
	}

	return REGULATION_HALF_SECONDS + (safeSecond - timeline.firstHalfEndSecond);
}

export function timelineRangeToMatchRange(
	range: [number, number],
	timeline: Pick<MatchTimelineModel, "firstHalfEndSecond">,
): [number, number] {
	const start = Math.max(0, Math.min(range[0], range[1]));
	const end = Math.max(start, Math.max(range[0], range[1]));
	const startsInSecondHalf = start >= timeline.firstHalfEndSecond;
	const endsInFirstHalf = end <= timeline.firstHalfEndSecond;

	if (endsInFirstHalf) {
		return [start, end];
	}
	if (startsInSecondHalf) {
		return [
			timelineSecondToMatchSecond(start, timeline, 2),
			timelineSecondToMatchSecond(end, timeline, 2),
		];
	}

	// A range crossing half-time maps to two provider-clock ranges. Temporal
	// network buckets do not carry period_id, so use the smallest bounding
	// range that preserves both the end of 1P and the beginning of 2P.
	return [
		Math.min(start, REGULATION_HALF_SECONDS),
		Math.max(
			timeline.firstHalfEndSecond,
			timelineSecondToMatchSecond(end, timeline, 2),
		),
	];
}

export function formatClockSecond(totalSeconds: number): string {
	const safeSeconds = Math.max(0, Math.floor(totalSeconds));
	const minute = Math.floor(safeSeconds / 60);
	const second = safeSeconds % 60;
	return `${minute}:${String(second).padStart(2, "0")}`;
}

export function formatTimelineSecond(
	timelineSecond: number,
	timeline: Pick<MatchTimelineModel, "firstHalfEndSecond">,
	periodAtBoundary: 1 | 2 = 2,
): string {
	return formatClockSecond(
		timelineSecondToMatchSecond(timelineSecond, timeline, periodAtBoundary),
	);
}

export function formatTimelineRange(
	range: [number, number],
	timeline: Pick<MatchTimelineModel, "firstHalfEndSecond">,
): string {
	const startsInSecondHalf = range[0] >= timeline.firstHalfEndSecond;
	const endsInFirstHalf = range[1] <= timeline.firstHalfEndSecond;
	return `${formatTimelineSecond(range[0], timeline, startsInSecondHalf ? 2 : 1)} - ${formatTimelineSecond(
		range[1],
		timeline,
		endsInFirstHalf ? 1 : 2,
	)}`;
}
