import type { Event } from "@/types/event";

export const BUCKET_SIZE_SECONDS = 60;
export const DEFAULT_TIMELINE_END_SECONDS = 90 * 60;

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function getEventMatchSecond(event: Event): number | null {
	if (typeof event.min !== "number" || !Number.isFinite(event.min)) return null;

	const minute = Math.max(0, Math.floor(event.min));
	const second =
		typeof event.sec === "number" && Number.isFinite(event.sec)
			? clamp(Math.floor(event.sec), 0, 59)
			: 0;
	const periodOffsets: Record<number, number> = {
		1: 0,
		2: 45,
		3: 90,
		4: 105,
		5: 120,
	};
	const periodOffset = event.period_id ? (periodOffsets[event.period_id] ?? 0) : 0;
	const absoluteMinute = minute >= periodOffset ? minute : periodOffset + minute;

	return absoluteMinute * 60 + second;
}

export function getMaxEventSecond(events: Event[]): number {
	return events.reduce((latestSecond, event) => {
		const eventSecond = getEventMatchSecond(event);
		return eventSecond == null ? latestSecond : Math.max(latestSecond, eventSecond);
	}, 0);
}

export function snapSecondToBucket(second: number, bucketSizeSeconds = BUCKET_SIZE_SECONDS): number {
	if (bucketSizeSeconds <= 0) return Math.max(0, Math.floor(second));
	return Math.max(0, Math.round(second / bucketSizeSeconds) * bucketSizeSeconds);
}

export function formatMatchTime(totalSeconds: number): string {
	const safeSeconds = Math.max(0, Math.floor(totalSeconds));
	const minute = Math.floor(safeSeconds / 60);
	const second = safeSeconds % 60;

	return `${minute}:${String(second).padStart(2, "0")}`;
}

export function derivePassingNetworkRange({
	mode,
	startSecond = 0,
	endSecond,
	windowDurationSeconds,
}: {
	mode: "cumulative" | "sliding";
	startSecond?: number;
	endSecond: number;
	windowDurationSeconds: number;
}): [number, number] {
	const normalizedEnd = Math.max(0, Math.floor(endSecond));
	if (mode === "cumulative") {
		const normalizedStart = clamp(
			Math.max(0, Math.floor(startSecond)),
			0,
			normalizedEnd,
		);
		return [normalizedStart, normalizedEnd];
	}

	const duration = Math.max(BUCKET_SIZE_SECONDS, Math.floor(windowDurationSeconds));
	return [Math.max(0, normalizedEnd - duration), normalizedEnd];
}
