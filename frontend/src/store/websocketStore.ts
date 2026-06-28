import { create } from "zustand";

export type WsStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

interface WebsocketStoreState {
	status: WsStatus;
	setStatus: (status: WsStatus) => void;
}

const useWebsocketStore = create<WebsocketStoreState>((set) => ({
	status: "connecting",
	setStatus: (status) => set({ status }),
}));

export default useWebsocketStore;
