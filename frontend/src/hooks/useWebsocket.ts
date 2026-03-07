import { useEffect, useState } from "react";
import { GameWebSocketClient } from "@/services/websocket";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import usePassNetworksStore from "@/store/passNetworksStore";
import { applyWebsocketMessageToStores } from "@/store/websocketStateUpdater";
import type { IncomingWsMessage } from "@/types/websocket";

interface UseWebsocketOptions {
	gameId: string;
	enabled?: boolean;
}

interface UseWebsocketResult {
	isConnected: boolean;
	status: "idle" | "connecting" | "connected" | "disconnected" | "error";
	error: string | null;
	lastMessage: IncomingWsMessage | null;
}

export const useWebsocket = ({
	gameId,
	enabled = true,
}: UseWebsocketOptions): UseWebsocketResult => {
	const [isConnected, setIsConnected] = useState(false);
	const [status, setStatus] = useState<UseWebsocketResult["status"]>("connecting");
	const [error, setError] = useState<string | null>(null);
	const [lastMessage, setLastMessage] = useState<IncomingWsMessage | null>(null);

	useEffect(() => {
		const resetDomainState = () => {
			useGameStore.getState().reset();
			useEventsStore.getState().reset();
			usePassNetworksStore.getState().reset();
		};

		if (!enabled) {
			resetDomainState();
			setIsConnected(false);
			setLastMessage(null);
			setError(null);
			setStatus("idle");
			return;
		}

		resetDomainState();

		console.log(`🔌 Conectando a WebSocket room: ${gameId}`);

		const client = new GameWebSocketClient(gameId, {
			onOpen: () => {
				console.log(`✅ WebSocket conectado al room ${gameId}`);
				setIsConnected(true);
				setStatus("connected");
				setError(null);
			},
			onClose: (event) => {
				console.log(`🔌 WebSocket desconectado (código: ${event.code})`);
				setIsConnected(false);
				setStatus("disconnected");
			},
			onError: (event) => {
				console.error("❌ Error en WebSocket:", event);
				setIsConnected(false);
				setStatus("error");
				setError("No se pudo establecer conexión WebSocket.");
			},
			onMessage: (message: IncomingWsMessage) => {
				console.log("📨 Mensaje recibido:", message);
				applyWebsocketMessageToStores(message);
				setLastMessage(message);
			},
		});

		client.connect();

		return () => {
			console.log(`🔌 Desconectando WebSocket del room ${gameId}`);
			client.disconnect();
		};
	}, [enabled, gameId]);

	return {
		isConnected,
		status,
		error,
		lastMessage,
	};
};

export default useWebsocket;
