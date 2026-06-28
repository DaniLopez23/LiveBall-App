import type { NodePositionMode } from "@/components/pitch/passNetworkPitch/passNetworkFilters.types";
import type {
	MinutePositionStat,
	PassNetworkEdge,
	PassNetworkNode,
	PassNetworkTemporalBucket,
	TeamPassNetwork,
} from "@/types/passNetwork";

export interface PassNetworkAggregationFilters {
	minPasses: number;
	nodePositionMode: NodePositionMode;
}

export interface BuiltPassNetwork {
	nodes: PassNetworkNode[];
	edges: PassNetworkEdge[];
}

interface NodeAccumulator {
	player_id: string;
	player_name: string;
	team_id: string;
	pass_count: number;
	passes_given: number;
	passes_received: number;
	position_given: MinutePositionStat;
	position_received: MinutePositionStat;
	position_total: MinutePositionStat;
}

interface EdgeAccumulator {
	from_player_id: string;
	to_player_id: string;
	pass_count: number;
	position: MinutePositionStat;
}

const emptyPosition = (): MinutePositionStat => ({
	count: 0,
	x_sum: 0,
	y_sum: 0,
});

const addPosition = (
	target: MinutePositionStat,
	source: MinutePositionStat | undefined,
) => {
	if (!source) return;
	target.count += source.count ?? 0;
	target.x_sum += source.x_sum ?? 0;
	target.y_sum += source.y_sum ?? 0;
};

const averagePosition = (
	stat: MinutePositionStat,
	fallback?: { x: number; y: number },
) => ({
	x: stat.count > 0 ? stat.x_sum / stat.count : (fallback?.x ?? 0),
	y: stat.count > 0 ? stat.y_sum / stat.count : (fallback?.y ?? 0),
});

const edgeKey = (fromPlayerId: string, toPlayerId: string): string =>
	`${fromPlayerId}->${toPlayerId}`;

const applyNodePositionMode = (
	node: PassNetworkNode,
	mode: NodePositionMode,
): PassNetworkNode => {
	if (mode === "given") {
		return {
			...node,
			avg_position_total:
				node.avg_position_given.x !== 0 || node.avg_position_given.y !== 0
					? node.avg_position_given
					: node.avg_position_total,
		};
	}

	if (mode === "received") {
		return {
			...node,
			avg_position_total:
				node.avg_position_received.x !== 0 || node.avg_position_received.y !== 0
					? node.avg_position_received
					: node.avg_position_total,
		};
	}

	return node;
};

/**
 * Builds a pass network from differential temporal buckets.
 *
 * The current backend buckets are 60-second half-open intervals:
 * [startSecond, endSecond). When the requested range does not align exactly
 * with bucket boundaries, the whole intersecting bucket is included. The UI
 * snaps the draggable selector to minute boundaries so it does not imply
 * sub-minute precision that the bucket payload does not carry.
 */
export function buildPassingNetworkFromBuckets(
	buckets: PassNetworkTemporalBucket[],
	startSecond: number,
	endSecond: number,
	filters: PassNetworkAggregationFilters,
): BuiltPassNetwork {
	const normalizedStart = Math.max(0, Math.floor(Math.min(startSecond, endSecond)));
	const normalizedEnd = Math.max(normalizedStart, Math.floor(Math.max(startSecond, endSecond)));
	const nodesById = new Map<string, NodeAccumulator>();
	const edgesByKey = new Map<string, EdgeAccumulator>();

	for (const bucket of buckets) {
		if (bucket.endSecond <= normalizedStart || bucket.startSecond >= normalizedEnd) {
			continue;
		}

		for (const node of bucket.nodes) {
			const current = nodesById.get(node.player_id) ?? {
				player_id: node.player_id,
				player_name: node.player_name,
				team_id: node.team_id,
				pass_count: 0,
				passes_given: 0,
				passes_received: 0,
				position_given: emptyPosition(),
				position_received: emptyPosition(),
				position_total: emptyPosition(),
			};

			current.player_name = node.player_name || current.player_name;
			current.pass_count += node.pass_count ?? 0;
			current.passes_given += node.passes_given ?? 0;
			current.passes_received += node.passes_received ?? 0;
			addPosition(current.position_given, node.position_given);
			addPosition(current.position_received, node.position_received);
			addPosition(current.position_total, node.position_total);
			nodesById.set(node.player_id, current);
		}

		for (const edge of bucket.edges) {
			const key = edgeKey(edge.from_player_id, edge.to_player_id);
			const current = edgesByKey.get(key) ?? {
				from_player_id: edge.from_player_id,
				to_player_id: edge.to_player_id,
				pass_count: 0,
				position: emptyPosition(),
			};
			current.pass_count += edge.pass_count ?? 0;
			addPosition(current.position, edge.position);
			edgesByKey.set(key, current);
		}
	}

	const edges = Array.from(edgesByKey.values())
		.filter((edge) => edge.pass_count >= filters.minPasses)
		.map<PassNetworkEdge>((edge) => ({
			from_player_id: edge.from_player_id,
			to_player_id: edge.to_player_id,
			pass_count: edge.pass_count,
			avg_position: averagePosition(edge.position),
			minute_buckets: [],
			minute_position_stats: [],
		}))
		.sort((a, b) =>
			edgeKey(a.from_player_id, a.to_player_id).localeCompare(
				edgeKey(b.from_player_id, b.to_player_id),
			),
		);

	const nodes = Array.from(nodesById.values())
		.filter((node) => node.position_total.count > 0)
		.map<PassNetworkNode>((node) => ({
			player_id: node.player_id,
			player_name: node.player_name,
			team_id: node.team_id,
			pass_count: node.pass_count,
			passes_given: node.passes_given,
			passes_received: node.passes_received,
			avg_position_given: averagePosition(node.position_given, averagePosition(node.position_total)),
			avg_position_received: averagePosition(
				node.position_received,
				averagePosition(node.position_total),
			),
			avg_position_total: averagePosition(node.position_total),
			minute_buckets: [],
			minute_given_stats: [],
			minute_received_stats: [],
		}))
		.map((node) => applyNodePositionMode(node, filters.nodePositionMode))
		.sort((a, b) => a.player_id.localeCompare(b.player_id));

	return {
		nodes,
		edges,
	};
}

const sumMinuteStats = (
	stats: MinutePositionStat[] | undefined,
	startMinute: number,
	endMinute: number,
): MinutePositionStat => {
	const start = Math.max(0, startMinute);
	const end = Math.min(Math.max(0, (stats?.length ?? 0) - 1), Math.max(start, endMinute));
	const total = emptyPosition();

	for (let minute = start; minute <= end; minute += 1) {
		addPosition(total, stats?.[minute]);
	}

	return total;
};

export function buildPassingNetworkFromLegacyNetwork(
	network: TeamPassNetwork | null,
	startSecond: number,
	endSecond: number,
	filters: PassNetworkAggregationFilters,
): BuiltPassNetwork | null {
	if (!network) return null;

	const startMinute = Math.floor(Math.max(0, startSecond) / 60);
	const endMinute = Math.max(startMinute, Math.ceil(Math.max(0, endSecond) / 60) - 1);

	const filteredEdges = network.edges
		.map((edge) => {
			const stat = sumMinuteStats(edge.minute_position_stats, startMinute, endMinute);
			if (stat.count < filters.minPasses) return null;

			return {
				...edge,
				pass_count: stat.count,
				avg_position: averagePosition(stat, edge.avg_position),
			};
		})
		.filter((edge): edge is PassNetworkEdge => edge !== null);

	const filteredNodes = network.nodes
		.map((node) => {
			const given = sumMinuteStats(node.minute_given_stats, startMinute, endMinute);
			const received = sumMinuteStats(node.minute_received_stats, startMinute, endMinute);
			const total = {
				count: given.count + received.count,
				x_sum: given.x_sum + received.x_sum,
				y_sum: given.y_sum + received.y_sum,
			};

			if (total.count <= 0) return null;

			return applyNodePositionMode(
				{
					...node,
					passes_given: given.count,
					passes_received: received.count,
					pass_count: given.count,
					avg_position_given: averagePosition(given, averagePosition(total)),
					avg_position_received: averagePosition(received, averagePosition(total)),
					avg_position_total: averagePosition(total),
				},
				filters.nodePositionMode,
			);
		})
		.filter((node): node is PassNetworkNode => node !== null);

	return {
		nodes: filteredNodes,
		edges: filteredEdges,
	};
}

export function buildPassingNetworkForRange(
	network: TeamPassNetwork | null,
	startSecond: number,
	endSecond: number,
	filters: PassNetworkAggregationFilters,
): BuiltPassNetwork | null {
	if (!network) return null;

	if (network.temporal?.buckets?.length) {
		return buildPassingNetworkFromBuckets(
			network.temporal.buckets,
			startSecond,
			endSecond,
			filters,
		);
	}

	return buildPassingNetworkFromLegacyNetwork(
		network,
		startSecond,
		endSecond,
		filters,
	);
}
