import { useMemo } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";

import {
	ChartContainer,
	ChartTooltip,
	type ChartConfig,
} from "@/components/ui/chart";
import StatsEventMarkers, {
	type StatsEventMarker,
} from "@/components/stats/StatsEventMarkers";
import type { MatchMomentumPayload, MatchStatsTimeline } from "@/types/stats";

interface StatsMomentumLineChartProps {
	timeline: MatchStatsTimeline;
	momentum: MatchMomentumPayload | null | undefined;
	homeTeamName: string;
	awayTeamName: string;
	events: StatsEventMarker[];
	title?: string;
	description?: string;
	minuteRange?: [number, number];
	compact?: boolean;
}

interface MomentumPoint {
	minute: number;
	home: number | null;
	away: number | null;
	neutral: number | null;
	value: number | null;
}

const NEUTRAL_MOMENTUM_EPSILON = 0.000001;

const formatMomentumValue = (value: number | null | undefined): string => {
	if (value == null) return "-";
	return value > 0 ? `+${value.toFixed(3)}` : value.toFixed(3);
};

const normalizeMomentumValue = (value: number | null): number | null => {
	if (value == null) return null;
	return Math.abs(value) <= NEUTRAL_MOMENTUM_EPSILON ? 0 : value;
};

const getMomentumValue = (
	bucket: MatchStatsTimeline["buckets"][number],
	momentum: MatchMomentumPayload | null | undefined,
): number | null => {
	const payloadMomentum =
		momentum?.points.find((point) => point.minute === bucket.minute)?.netMomentum ??
		null;
	if (payloadMomentum != null) return normalizeMomentumValue(payloadMomentum);

	const bucketMomentum = bucket.momentum?.netMomentum;
	if (bucketMomentum != null) return normalizeMomentumValue(bucketMomentum);

	return null;
};

const getMomentumChartSourcePoints = (
	timeline: MatchStatsTimeline,
	momentum: MatchMomentumPayload | null | undefined,
): Array<{ minute: number; value: number | null }> => {
	if (momentum?.points.length) {
		return [...momentum.points]
			.sort((a, b) => a.minute - b.minute)
			.map((point) => ({
				minute: point.minute,
				value: normalizeMomentumValue(point.netMomentum),
			}));
	}

	return [...timeline.buckets]
		.sort((a, b) => a.minute - b.minute)
		.map((bucket) => ({
			minute: bucket.minute,
			value: getMomentumValue(bucket, momentum),
		}));
};

const splitByMomentumSide = (
	points: Array<{ minute: number; value: number | null }>,
): MomentumPoint[] => {
	const result: MomentumPoint[] = [];

	for (const point of points) {
		const previous = result[result.length - 1];
		const value = point.value;

		if (
			previous?.value != null &&
			value != null &&
			previous.value !== 0 &&
			value !== 0 &&
			Math.sign(previous.value) !== Math.sign(value)
		) {
			const ratio = Math.abs(previous.value) / (Math.abs(previous.value) + Math.abs(value));
			const minute = previous.minute + (point.minute - previous.minute) * ratio;
			result.push({
				minute,
				value: 0,
				home: 0,
				away: 0,
				neutral: null,
			});
		}

		const normalizedValue = normalizeMomentumValue(value);
		result.push({
			minute: point.minute,
			value: normalizedValue,
			home: normalizedValue != null && normalizedValue >= 0 ? normalizedValue : null,
			away: normalizedValue != null && normalizedValue <= 0 ? normalizedValue : null,
			neutral: normalizedValue === 0 ? 0 : null,
		});
	}

	return result;
};

function MinuteTooltip({
	active,
	label,
}: {
	active?: boolean;
	label?: unknown;
}) {
	const minute = typeof label === "number" ? label : Number(label);
	if (!active || !Number.isFinite(minute)) return null;

	return (
		<div className="rounded-md border bg-background px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground shadow-md">
			Min {minute.toFixed(0)}'
		</div>
	);
}

export default function StatsMomentumLineChart({
	timeline,
	momentum,
	homeTeamName,
	awayTeamName,
	events,
	title = "Evolucion de momentum",
	description = "xT neto por minuto; cero indica equilibrio",
	minuteRange,
	compact = false,
}: StatsMomentumLineChartProps) {
	const chartData = useMemo<MomentumPoint[]>(() => {
		const points = getMomentumChartSourcePoints(timeline, momentum);
		return splitByMomentumSide(points);
	}, [momentum, timeline]);

	const hasData = chartData.some((point) => point.value != null);
	const values = chartData
		.map((point) => point.value)
		.filter((value): value is number => value != null);
	const maxAbsValue = Math.max(0.01, ...values.map((value) => Math.abs(value)));
	const domainLimit = Number((maxAbsValue * 1.2).toFixed(3));
	const lastPoint = [...chartData].reverse().find((point) => point.value != null);
	const chartConfig = {
		home: {
			label: homeTeamName,
			color: "#3b82f6",
		},
		away: {
			label: awayTeamName,
			color: "#f43f5e",
		},
		neutral: {
			label: "Neutro",
			color: "#111827",
		},
	} satisfies ChartConfig;
	const lastMomentum =
		lastPoint?.value == null
			? null
			: lastPoint.value === 0
				? {
						label: "Neutro",
						className: "size-2 rounded-full bg-neutral-950",
					}
				: lastPoint.value > 0
					? {
							label: homeTeamName,
							className: "size-2 rounded-full bg-blue-500",
						}
					: {
							label: awayTeamName,
							className: "size-2 rounded-full bg-rose-500",
						};

	return (
		<section
			className={
				compact
					? "flex h-full min-h-0 flex-col rounded-md border bg-background shadow-sm"
					: "rounded-md border bg-background shadow-sm"
			}
		>
			<header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
				<div>
					<h2 className="text-sm font-semibold text-foreground">
						{title}
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						{description}
					</p>
				</div>
				<div className="flex flex-wrap gap-3 text-xs">
					<span className="inline-flex items-center gap-1.5 text-muted-foreground">
						<span className={lastMomentum?.className ?? "size-2 rounded-full bg-muted"} />
						{lastMomentum?.label ?? "Sin momentum"}
						<span className="font-semibold tabular-nums text-foreground">
							{formatMomentumValue(lastPoint?.value)}
						</span>
					</span>
				</div>
			</header>

			<div className={compact ? "min-h-0 flex-1 px-3 py-3" : "px-3 py-4"}>
				{hasData ? (
					<ChartContainer
						config={chartConfig}
						className={compact ? "h-full min-h-[12rem] w-full" : "h-[18rem] min-h-[18rem] w-full"}
					>
						<LineChart
							accessibilityLayer
							data={chartData}
							margin={compact ? { left: 0, right: 10, top: 18, bottom: 0 } : { left: 8, right: 16, top: 24, bottom: 8 }}
						>
							<CartesianGrid vertical={false} />
							<XAxis
								type="number"
								dataKey="minute"
								domain={minuteRange ?? [0, "dataMax"]}
								allowDecimals={false}
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value: number | string) => `${Number(value).toFixed(0)}'`}
							/>
							<YAxis
								domain={[-domainLimit, domainLimit]}
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value: number | string) =>
									formatMomentumValue(Number(value))
								}
							/>
							<ChartTooltip
								cursor={{
									stroke: "hsl(var(--foreground))",
									strokeOpacity: 0.34,
									strokeWidth: 1.5,
								}}
								content={<MinuteTooltip />}
							/>
							<ReferenceLine
								y={0}
								stroke="#000000"
								strokeOpacity={0.9}
								strokeWidth={2.25}
							/>
							<StatsEventMarkers events={events} />
							<Line
								dataKey="home"
								type="monotone"
								stroke="var(--color-home)"
								strokeWidth={3}
								dot={false}
								activeDot={false}
								connectNulls={false}
							/>
							<Line
								dataKey="away"
								type="monotone"
								stroke="var(--color-away)"
								strokeWidth={3}
								dot={false}
								activeDot={false}
								connectNulls={false}
							/>
							<Line
								dataKey="neutral"
								type="monotone"
								stroke="var(--color-neutral)"
								strokeWidth={3.5}
								dot={false}
								activeDot={false}
								connectNulls={false}
							/>
						</LineChart>
					</ChartContainer>
				) : (
					<div
						className={
							compact
								? "flex h-full min-h-[10rem] items-center justify-center rounded-md border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground"
								: "flex min-h-[14rem] items-center justify-center rounded-md border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground"
						}
					>
						Esperando momentum para pintar la evolucion.
					</div>
				)}
			</div>
		</section>
	);
}
