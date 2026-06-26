import test from "node:test";
import assert from "node:assert/strict";

import { buildPassingNetworkFromBuckets } from "./passNetworkAggregation.ts";
import { derivePassingNetworkRange } from "./matchTime.ts";
import type { PassNetworkTemporalBucket } from "../types/passNetwork.ts";

const makeBucket = (
	bucketIndex: number,
	passCount: number,
	xSum: number,
	ySum: number,
): PassNetworkTemporalBucket => ({
	bucketIndex,
	startSecond: bucketIndex * 60,
	endSecond: (bucketIndex + 1) * 60,
	nodes: [
		{
			player_id: "p1",
			player_name: "Player 1",
			team_id: "1",
			pass_count: passCount,
			passes_given: passCount,
			passes_received: 0,
			position_given: { count: passCount, x_sum: xSum, y_sum: ySum },
			position_received: { count: 0, x_sum: 0, y_sum: 0 },
			position_total: { count: passCount, x_sum: xSum, y_sum: ySum },
		},
		{
			player_id: "p2",
			player_name: "Player 2",
			team_id: "1",
			pass_count: 0,
			passes_given: 0,
			passes_received: passCount,
			position_given: { count: 0, x_sum: 0, y_sum: 0 },
			position_received: { count: passCount, x_sum: xSum + 10, y_sum: ySum + 10 },
			position_total: { count: passCount, x_sum: xSum + 10, y_sum: ySum + 10 },
		},
	],
	edges: [
		{
			from_player_id: "p1",
			to_player_id: "p2",
			pass_count: passCount,
			position: { count: passCount, x_sum: xSum, y_sum: ySum },
		},
	],
});

const filters = {
	minPasses: 1,
	nodePositionMode: "global" as const,
};

test("aggregates cumulative buckets without averaging averages", () => {
	const buckets = [makeBucket(0, 1, 10, 20), makeBucket(1, 2, 70, 90)];
	const original = structuredClone(buckets);

	const network = buildPassingNetworkFromBuckets(buckets, 0, 120, filters);

	assert.deepEqual(buckets, original);
	assert.equal(network.edges.length, 1);
	assert.equal(network.edges[0]?.pass_count, 3);
	assert.equal(network.edges[0]?.avg_position.x, 80 / 3);
	assert.equal(network.edges[0]?.avg_position.y, 110 / 3);
	assert.equal(network.nodes.find((node) => node.player_id === "p1")?.passes_given, 3);
	assert.equal(
		network.nodes.find((node) => node.player_id === "p1")?.avg_position_total.x,
		80 / 3,
	);
});

test("uses only buckets intersecting the selected sliding window", () => {
	const buckets = [
		makeBucket(0, 1, 10, 10),
		makeBucket(5, 2, 40, 40),
		makeBucket(10, 3, 90, 90),
		makeBucket(15, 4, 160, 160),
	];

	const fiveMinuteRange = derivePassingNetworkRange({
		mode: "sliding",
		endSecond: 15 * 60,
		windowDurationSeconds: 5 * 60,
	});
	const tenMinuteRange = derivePassingNetworkRange({
		mode: "sliding",
		endSecond: 15 * 60,
		windowDurationSeconds: 10 * 60,
	});
	const fifteenMinuteRange = derivePassingNetworkRange({
		mode: "sliding",
		endSecond: 15 * 60,
		windowDurationSeconds: 15 * 60,
	});
	const customRange = derivePassingNetworkRange({
		mode: "sliding",
		endSecond: 15 * 60,
		windowDurationSeconds: 7 * 60,
	});

	assert.equal(
		buildPassingNetworkFromBuckets(buckets, fiveMinuteRange[0], fiveMinuteRange[1], filters)
			.edges[0]?.pass_count,
		3,
	);
	assert.equal(
		buildPassingNetworkFromBuckets(buckets, tenMinuteRange[0], tenMinuteRange[1], filters)
			.edges[0]?.pass_count,
		5,
	);
	assert.equal(
		buildPassingNetworkFromBuckets(buckets, fifteenMinuteRange[0], fifteenMinuteRange[1], filters)
			.edges[0]?.pass_count,
		6,
	);
	assert.equal(
		buildPassingNetworkFromBuckets(buckets, customRange[0], customRange[1], filters)
			.edges[0]?.pass_count,
		3,
	);
});

test("handles start and end limits and min-pass filters", () => {
	const buckets = [makeBucket(0, 1, 10, 10), makeBucket(1, 2, 30, 30)];

	const atStart = buildPassingNetworkFromBuckets(buckets, 0, 0, filters);
	const atEnd = buildPassingNetworkFromBuckets(buckets, 60, 120, {
		...filters,
		minPasses: 3,
	});

	assert.equal(atStart.edges.length, 0);
	assert.equal(atStart.nodes.length, 0);
	assert.equal(atEnd.edges.length, 0);
	assert.equal(atEnd.nodes.length, 2);
});

test("cumulative mode can use a custom start and manual end can move off live", () => {
	assert.deepEqual(
		derivePassingNetworkRange({
			mode: "cumulative",
			startSecond: 15 * 60,
			endSecond: 63 * 60,
			windowDurationSeconds: 10 * 60,
		}),
		[15 * 60, 63 * 60],
	);

	const manualEndSecond = 30 * 60;
	assert.deepEqual(
		derivePassingNetworkRange({
			mode: "sliding",
			endSecond: manualEndSecond,
			windowDurationSeconds: 10 * 60,
		}),
		[20 * 60, 30 * 60],
	);
});
