import type { IncomingWsMessage } from "@/types/websocket";

export interface WsClientHandlers {
	onOpen?: () => void;
	onClose?: (event: CloseEvent) => void;
	onError?: (event: Event) => void;
	onMessage?: (message: IncomingWsMessage) => void;
}

const DEFAULT_WS_BASE_URL = "ws://localhost:8000/api/v1";

const normalizeBaseWsUrl = (rawBase?: string): string => {
	const base = (rawBase ?? DEFAULT_WS_BASE_URL).trim();
	return base.endsWith("/") ? base.slice(0, -1) : base;
};

export const buildGameWsUrl = (gameId: string): string => {
	const baseWsUrl = normalizeBaseWsUrl(import.meta.env.VITE_WS_BASE_URL);
	return `${baseWsUrl}/ws/games/${gameId}`;
};

export class GameWebSocketClient {
	private readonly gameId: string;
	private readonly handlers: WsClientHandlers;
	private socket: WebSocket | null = null;

	constructor(gameId: string, handlers: WsClientHandlers = {}) {
		this.gameId = gameId;
		this.handlers = handlers;
	}

	connect(): void {
		if (
			this.socket &&
			(this.socket.readyState === WebSocket.OPEN ||
				this.socket.readyState === WebSocket.CONNECTING)
		) {
			return;
		}

		const url = buildGameWsUrl(this.gameId);
		this.socket = new WebSocket(url);

		this.socket.onopen = () => {
			this.handlers.onOpen?.();
		};

		this.socket.onclose = (event) => {
			this.handlers.onClose?.(event);
		};

		this.socket.onerror = (event) => {
			this.handlers.onError?.(event);
		};

		this.socket.onmessage = (event) => {
			try {
				const parsed = JSON.parse(event.data) as IncomingWsMessage;
				this.handlers.onMessage?.(parsed);
			} catch {
				this.handlers.onMessage?.({
					type: "invalid_json",
					raw: event.data,
				});
			}
		};
	}

	disconnect(): void {
		if (!this.socket) return;
		this.socket.close();
		this.socket = null;
	}

	ping(): void {
		if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;
		this.socket.send(JSON.stringify({ type: "ping" }));
	}

	getReadyState(): number {
		return this.socket?.readyState ?? WebSocket.CLOSED;
	}
}

