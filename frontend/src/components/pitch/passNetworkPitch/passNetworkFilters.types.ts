export type NodePositionMode = "given" | "received" | "global";

export interface PassNetworkFiltersState {
	minPasses: number;
	minuteRange: [number, number];
	nodePositionMode: NodePositionMode;
}

export const DEFAULT_PASS_NETWORK_FILTERS: PassNetworkFiltersState = {
	minPasses: 3,
	minuteRange: [0, 90],
	nodePositionMode: "global",
};
