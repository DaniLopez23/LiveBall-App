import { create } from "zustand";

import type { Game, GameMessageData } from "@/types/game";

interface GameStoreState {
	game: Game | null;
	setFromSnapshot: (payload: {
		game: Omit<Game, "total_events">;
		totalEvents: number;
	}) => void;
	upsertFromUpdate: (payload: { data: GameMessageData; totalEvents?: number }) => void;
	setTotalEvents: (totalEvents: number) => void;
	reset: () => void;
}

const useGameStore = create<GameStoreState>((set) => ({
	game: null,
	setFromSnapshot: ({ game, totalEvents }) => {
		set({ game: { ...game, total_events: totalEvents } });
	},
	upsertFromUpdate: ({ data, totalEvents }) => {
		set((state) => ({
			game: {
				...data,
				total_events: totalEvents ?? state.game?.total_events,
			},
		}));
	},
	setTotalEvents: (totalEvents) => {
		set((state) => ({
			game: state.game ? { ...state.game, total_events: totalEvents } : state.game,
		}));
	},
	reset: () => {
		set({ game: null });
	},
}));

export default useGameStore;
