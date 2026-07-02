import { useCallback, useEffect, useRef, useState } from "react";

import { BUCKET_SIZE_SECONDS, clamp } from "@/lib/matchTime";
import type {
	PassNetworkRangeChangeOptions,
	PassingNetworkMode,
} from "./passNetworkFilters.types";

const PLAYBACK_TICK_MS = 500;

interface UsePassNetworkPlaybackOptions {
	mode: PassingNetworkMode;
	selectedRangeSeconds: [number, number];
	currentSecond: number;
	maxSecond: number;
	bucketSizeSeconds?: number;
	onRangeChange: (range: [number, number], options?: PassNetworkRangeChangeOptions) => void;
	onCurrentSecondChange: (second: number) => void;
}

function normalizeRange(
	range: [number, number],
	maxSecond: number,
): [number, number] {
	const endSecond = clamp(Math.max(range[0], range[1]), 0, maxSecond);
	return [clamp(Math.min(range[0], range[1]), 0, endSecond), endSecond];
}

/**
 * Reproduces a cumulative cursor or a sliding window in fixed bucket-sized
 * steps. The selected interval remains stable in cumulative mode.
 */
export function usePassNetworkPlayback({
	mode,
	selectedRangeSeconds,
	currentSecond,
	maxSecond,
	bucketSizeSeconds = BUCKET_SIZE_SECONDS,
	onRangeChange,
	onCurrentSecondChange,
}: UsePassNetworkPlaybackOptions) {
	const [isPlaying, setIsPlaying] = useState(false);
	const onRangeChangeRef = useRef(onRangeChange);
	const onCurrentSecondChangeRef = useRef(onCurrentSecondChange);

	useEffect(() => {
		onRangeChangeRef.current = onRangeChange;
	}, [onRangeChange]);
	useEffect(() => {
		onCurrentSecondChangeRef.current = onCurrentSecondChange;
	}, [onCurrentSecondChange]);

	const range = normalizeRange(selectedRangeSeconds, maxSecond);
	const cursorSecond = clamp(currentSecond, range[0], range[1]);
	const windowDuration = Math.max(bucketSizeSeconds, range[1] - range[0]);
	const canPlay = mode === "cumulative" ? cursorSecond < range[1] : range[1] < maxSecond;

	const emitRange = useCallback(
		(nextRange: [number, number]) => {
			onRangeChangeRef.current(nextRange, { followLive: false });
		},
		[],
	);

	const pause = useCallback(() => {
		setIsPlaying(false);
	}, []);

	const handleRangeChange = useCallback(
		(nextRange: [number, number], options?: PassNetworkRangeChangeOptions) => {
			setIsPlaying(false);
			onRangeChangeRef.current(nextRange, options);
		},
		[],
	);
	const handleCurrentSecondChange = useCallback((nextSecond: number) => {
		setIsPlaying(false);
		onCurrentSecondChangeRef.current(nextSecond);
	}, []);

	const play = useCallback(() => {
		if (!canPlay) return;
		setIsPlaying(true);
	}, [canPlay]);

	const reset = useCallback(() => {
		setIsPlaying(false);
		if (mode === "cumulative") {
			onCurrentSecondChangeRef.current(range[0]);
			return;
		}

		const endSecond = Math.min(windowDuration, maxSecond);
		emitRange([Math.max(0, endSecond - windowDuration), endSecond]);
	}, [emitRange, maxSecond, mode, range, windowDuration]);

	useEffect(() => {
		if (!isPlaying) return;

		const intervalId = window.setInterval(() => {
			if (mode === "cumulative") {
				const nextSecond = Math.min(range[1], cursorSecond + bucketSizeSeconds);
				onCurrentSecondChangeRef.current(nextSecond);
				if (nextSecond >= range[1]) setIsPlaying(false);
				return;
			}

			const nextEnd = Math.min(maxSecond, range[1] + bucketSizeSeconds);
			emitRange([
				Math.max(0, nextEnd - windowDuration),
				nextEnd,
			]);
			if (nextEnd >= maxSecond) setIsPlaying(false);
		}, PLAYBACK_TICK_MS);

		return () => window.clearInterval(intervalId);
	}, [bucketSizeSeconds, cursorSecond, emitRange, isPlaying, maxSecond, mode, range, windowDuration]);

	return {
		canPlay,
		isPlaying,
		pause,
		play,
		reset,
		handleRangeChange,
		handleCurrentSecondChange,
	};
}
