import type { Event } from "@/types/event";
import type { Game, GameMessageData } from "@/types/game";
import type {
	PassNetworkEdge,
	PassNetworkNode,
	PassNetworkStatistics,
	SnapshotPassNetworks,
} from "@/types/passNetwork";

export type ConnectionWsMessage = {
	type: "connection";
	status: "connected";
	client_id: string;
	game_id: string;
	message: string;
};

export type MatchStateSnapshotWsMessage = {
	type: "match_state_snapshot";
	game_id: string;
	game: Omit<Game, "total_events">;
	total_events: number;
	last_event_id: string | null;
	events: Event[];
	pass_networks: SnapshotPassNetworks;
};

export type GameUpdateWsMessage = {
	type: "new_game" | "updated_game";
	game_id: string;
	data: GameMessageData;
};

export type EventsUpdateWsMessage = {
	type: "new_events" | "updated_events";
	game_id: string;
	events: Event[];
};

export type PassNetworkUpdatedWsMessage = {
	type: "pass_network_updated";
	game_id: string;
	team_id: string;
	nodes: PassNetworkNode[];
	edges: PassNetworkEdge[];
	statistics: PassNetworkStatistics;
};

export type PongWsMessage = {
	type: "pong";
	message: string;
};

export type InvalidJsonWsMessage = {
	type: "invalid_json";
	raw: unknown;
};

export type IncomingWsMessage =
	| ConnectionWsMessage
	| MatchStateSnapshotWsMessage
	| GameUpdateWsMessage
	| EventsUpdateWsMessage
	| PassNetworkUpdatedWsMessage
	| PongWsMessage
	| InvalidJsonWsMessage;
