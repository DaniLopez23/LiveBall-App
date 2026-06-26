export type NodePositionMode = "given" | "received" | "global";
export type PassingNetworkMode = "cumulative" | "sliding";
export type WindowDurationMode = "preset" | "custom";

export interface PassNetworkFiltersState {
	[key: string]: unknown;
	minPasses: number;
	minuteRange: [number, number];
	mode: PassingNetworkMode;
	windowDurationSeconds: number;
	windowDurationMode: WindowDurationMode;
	rangeStartSecond?: number;
	rangeEndSecond?: number;
	momentSecond?: number;
	followLive: boolean;
	nodePositionMode: NodePositionMode;
	momentMinute?: number;
}

export const DEFAULT_PASS_NETWORK_FILTERS: PassNetworkFiltersState = {
	minPasses: 3,
	minuteRange: [0, 90],
	mode: "cumulative",
	windowDurationSeconds: 10 * 60,
	windowDurationMode: "preset",
	rangeStartSecond: 0,
	rangeEndSecond: undefined,
	followLive: true,
	nodePositionMode: "global",
};
