import { create } from "zustand";

import { getAvailableMatches } from "@/services/api";
import type { AvailableMatch } from "@/types/availableMatch";

type MatchesLoadStatus = "idle" | "loading" | "loaded" | "error";

interface MatchSelectionState {
	matches: AvailableMatch[];
	selectedGameId: string | null;
	loadStatus: MatchesLoadStatus;
	isRefreshing: boolean;
	lastUpdatedAt: number | null;
	error: string | null;
	loadAvailableMatches: (force?: boolean) => Promise<void>;
	selectMatch: (gameId: string) => void;
}

const useMatchSelectionStore = create<MatchSelectionState>((set, get) => ({
	matches: [],
	selectedGameId: null,
	loadStatus: "idle",
	isRefreshing: false,
	lastUpdatedAt: null,
	error: null,
	loadAvailableMatches: async (force = false) => {
		const { isRefreshing, loadStatus } = get();
		if (
			loadStatus === "loading" ||
			isRefreshing ||
			(!force && loadStatus === "loaded")
		) {
			return;
		}

		const refreshingLoadedMatches = loadStatus === "loaded";
		set(
			refreshingLoadedMatches
				? { isRefreshing: true, error: null }
				: { loadStatus: "loading", isRefreshing: false, error: null },
		);
		try {
			const matches = await getAvailableMatches();
			set((state) => ({
				matches,
				selectedGameId: matches.some(
					(match) => match.game_id === state.selectedGameId,
				)
					? state.selectedGameId
					: null,
				loadStatus: "loaded",
				isRefreshing: false,
				lastUpdatedAt: Date.now(),
				error: null,
			}));
		} catch (error) {
			set({
				loadStatus: refreshingLoadedMatches ? "loaded" : "error",
				isRefreshing: false,
				error:
					error instanceof Error
						? error.message
						: "No se pudieron cargar los partidos.",
			});
		}
	},
	selectMatch: (gameId) => {
		if (!get().matches.some((match) => match.game_id === gameId)) return;
		set({ selectedGameId: gameId });
	},
}));

export default useMatchSelectionStore;
