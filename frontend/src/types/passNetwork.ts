export interface PitchPosition {
	x: number;
	y: number;
}

export interface MinutePositionStat {
	count: number;
	x_sum: number;
	y_sum: number;
}

export interface PassNetworkNode {
	player_id: string;
	player_name: string;
	team_id: string;
	pass_count: number;
	passes_given: number;
	passes_received: number;
	minute_buckets: number[];
	minute_given_stats: MinutePositionStat[];
	minute_received_stats: MinutePositionStat[];
	avg_position_given: PitchPosition;
	avg_position_received: PitchPosition;
	avg_position_total: PitchPosition;
}

export interface PassNetworkEdge {
	from_player_id: string;
	to_player_id: string;
	pass_count: number;
	minute_buckets: number[];
	minute_position_stats: MinutePositionStat[];
	avg_position: PitchPosition;
}

export interface PassNetworkStatistics {
	total_players: number;
	total_connections: number;
	total_passes: number;
	team_id: string | number;
}

export interface TeamPassNetwork {
	nodes: PassNetworkNode[];
	edges: PassNetworkEdge[];
	statistics: PassNetworkStatistics;
}

export type SnapshotPassNetworks = Record<string, TeamPassNetwork>;
