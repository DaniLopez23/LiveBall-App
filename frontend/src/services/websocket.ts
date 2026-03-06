export interface OptaQualifier {
	qualifier_id: string;
	qualifier_name: string;
	value: string;
}

export interface OptaEventMessage {
	id: string;
	event_id: string;
	type_id: string;
	event_name: string;
	x?: number | null;
	y?: number | null;
	outcome?: number | null;
	team_id?: string | null;
	player_id?: string | null;
	qualifiers: OptaQualifier[];
}

export type IncomingWsMessage =
	| {
			type: "connection";
			status: "connected";
			client_id: string;
			game_id: string;
			message: string;
		}
	| {
			type: "match_state_snapshot";
			game_id: string;
			total_events: number;
			last_event_id: string | null;
			events: OptaEventMessage[];
			pass_networks?: Record<string, unknown>;
		}
	| {
			type: "new_events" | "updated_events" | "game_update";
			game_id: string;
			events: OptaEventMessage[];
			total_events?: number;
			last_event_id?: string | null;
			timestamp?: string;
		}
	| {
			type: "pass_network_updated";
			game_id: string;
			team_id: string;
			nodes: unknown[];
			edges: unknown[];
			statistics: Record<string, unknown>;
		}
	| {
			type: "pong";
			message: string;
		}
	| {
			type: string;
			[key: string]: unknown;
		};

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

