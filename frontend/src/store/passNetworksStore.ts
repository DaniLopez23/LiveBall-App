import { create } from "zustand";

import type {
	PassNetworkEdge,
	PassNetworkNode,
	PassNetworkStatistics,
	SnapshotPassNetworks,
	TeamPassNetwork,
} from "@/types/passNetwork";

interface PassNetworksStoreState {
	gameId: string | null;
	byTeamId: Record<string, TeamPassNetwork>;
	setFromSnapshot: (payload: {
		gameId: string;
		passNetworks: SnapshotPassNetworks;
	}) => void;
	applyIncrementalUpdate: (payload: {
		gameId: string;
		teamId: string | number;
		nodes: PassNetworkNode[];
		edges: PassNetworkEdge[];
		statistics: PassNetworkStatistics;
	}) => void;
	reset: () => void;
}

const mergeNodes = (
	currentNodes: PassNetworkNode[],
	changedNodes: PassNetworkNode[],
): PassNetworkNode[] => {
	const map = new Map<string, PassNetworkNode>(
		currentNodes.map((node) => [node.player_id, node]),
	);

	for (const node of changedNodes) {
		map.set(node.player_id, node);
	}

	return Array.from(map.values());
};

const edgeKey = (edge: PassNetworkEdge): string => {
	return `${edge.from_player_id}->${edge.to_player_id}`;
};

const mergeEdges = (
	currentEdges: PassNetworkEdge[],
	changedEdges: PassNetworkEdge[],
): PassNetworkEdge[] => {
	const map = new Map<string, PassNetworkEdge>(
		currentEdges.map((edge) => [edgeKey(edge), edge]),
	);

	for (const edge of changedEdges) {
		map.set(edgeKey(edge), edge);
	}

	return Array.from(map.values());
};

const defaultTeamNetwork = (statistics: PassNetworkStatistics): TeamPassNetwork => ({
	nodes: [],
	edges: [],
	statistics,
});

const mergeStatistics = (
	currentStatistics: PassNetworkStatistics,
	incomingStatistics: PassNetworkStatistics,
): PassNetworkStatistics => {
	const bucketsByIndex = new Map(
		currentStatistics.buckets.map((bucket) => [bucket.bucket_index, bucket]),
	);

	for (const bucket of incomingStatistics.buckets) {
		bucketsByIndex.set(bucket.bucket_index, bucket);
	}

	return {
		...currentStatistics,
		team_id: incomingStatistics.team_id ?? currentStatistics.team_id,
		buckets: Array.from(bucketsByIndex.values()).sort(
			(a, b) => a.bucket_index - b.bucket_index,
		),
	};
};

const baseState = {
	gameId: null,
	byTeamId: {},
};

const usePassNetworksStore = create<PassNetworksStoreState>((set, get) => ({
	...baseState,
	setFromSnapshot: ({ gameId, passNetworks }) => {
		set({
			gameId,
			byTeamId: passNetworks,
		});
	},
	applyIncrementalUpdate: ({ gameId, teamId, nodes, edges, statistics }) => {
		const { gameId: currentGameId, byTeamId } = get();
		const shouldReset = currentGameId !== gameId;
		const baseByTeamId = shouldReset ? {} : { ...byTeamId };
		const teamKey = String(teamId);

		const currentTeamNetwork =
			baseByTeamId[teamKey] ?? defaultTeamNetwork(statistics);
		const mergedStatistics = mergeStatistics(
			currentTeamNetwork.statistics,
			statistics,
		);

		baseByTeamId[teamKey] = {
			nodes: mergeNodes(currentTeamNetwork.nodes, nodes),
			edges: mergeEdges(currentTeamNetwork.edges, edges),
			statistics: mergedStatistics,
		};

		set({
			gameId,
			byTeamId: baseByTeamId,
		});
	},
	reset: () => {
		set(baseState);
	},
}));

export default usePassNetworksStore;
