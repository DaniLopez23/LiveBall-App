import { create } from "zustand";

import type { MatchStatsUpdateData } from "@/types/stats";

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

const useStatsStore = create<StatsStoreState>((set) => ({
	...baseState,
	setFromSnapshot: ({ gameId, stats }) => {
		set({
			gameId,
			data: hasStatsPayload(stats) ? stats : null,
		});
	},
	applyUpdate: ({ gameId, data }) => {
		set({ gameId, data });
	},
	reset: () => {
		set(baseState);
	},
}));

export default useStatsStore;
