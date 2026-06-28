import { create } from "zustand";

import type {
	MatchMomentumPayload,
	MatchStatsTimeline,
	MatchStatsUpdateData,
} from "@/types/stats";

interface StatsStoreState {
	gameId: string | null;
	data: MatchStatsUpdateData | null;
	setFromSnapshot: (payload: {
		gameId: string;
		stats: MatchStatsUpdateData | null | undefined;
	}) => void;
	applyUpdate: (payload: {
		gameId: string;
		data: MatchStatsUpdateData;
	}) => void;
	reset: () => void;
}

const baseState = {
	gameId: null,
	data: null,
};

const hasStatsPayload = (
	stats: MatchStatsUpdateData | null | undefined,
): stats is MatchStatsUpdateData => {
	return Boolean(stats && stats.current && stats.comparison && stats.timeline);
};

const mergeTimeline = (
	current: MatchStatsTimeline,
	incoming: MatchStatsTimeline,
): MatchStatsTimeline => {
	const bucketsByMinute = new Map(
		current.buckets.map((bucket) => [bucket.minute, bucket]),
	);

	for (const bucket of incoming.buckets) {
		bucketsByMinute.set(bucket.minute, bucket);
	}

	return {
		...incoming,
		buckets: [...bucketsByMinute.values()].sort((a, b) => a.minute - b.minute),
	};
};

const mergeMomentum = (
	current: MatchMomentumPayload | null | undefined,
	incoming: MatchMomentumPayload | null | undefined,
): MatchMomentumPayload | null | undefined => {
	if (!incoming) return current ?? incoming;
	if (!current) return incoming;

	const pointsByMinute = new Map(
		current.points.map((point) => [point.minute, point]),
	);

	for (const point of incoming.points) {
		pointsByMinute.set(point.minute, point);
	}

	return {
		...incoming,
		points: [...pointsByMinute.values()].sort((a, b) => a.minute - b.minute),
	};
};

const mergeStatsUpdate = (
	current: MatchStatsUpdateData | null,
	incoming: MatchStatsUpdateData,
): MatchStatsUpdateData => {
	if (!current) return incoming;

	return {
		...incoming,
		timeline: mergeTimeline(current.timeline, incoming.timeline),
		momentum: mergeMomentum(current.momentum, incoming.momentum),
	};
};

const useStatsStore = create<StatsStoreState>((set) => ({
	...baseState,
	setFromSnapshot: ({ gameId, stats }) => {
		set({
			gameId,
			data: hasStatsPayload(stats) ? stats : null,
		});
	},
	applyUpdate: ({ gameId, data }) => {
		set((state) => ({
			gameId,
			data:
				state.gameId === gameId
					? mergeStatsUpdate(state.data, data)
					: data,
		}));
	},
	reset: () => {
		set(baseState);
	},
}));

export default useStatsStore;
