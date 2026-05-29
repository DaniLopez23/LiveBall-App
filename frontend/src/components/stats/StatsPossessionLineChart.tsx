import { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import StatsEventMarkers, {
	type StatsEventMarker,
} from "@/components/stats/StatsEventMarkers";
import {
	formatPercentValue,
	formatStatValue,
} from "@/components/stats/StatsComparisonBars";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { MatchStatsTimeline, StatGroupName } from "@/types/stats";

export interface TimelineMetricOption {
	id: string;
	group: StatGroupName;
	key: string;
	label: string;
	format?: (value: number | null) => string;
	isPercent?: boolean;
}

interface StatsPossessionLineChartProps {
	timeline: MatchStatsTimeline;
	homeTeamName: string;
	awayTeamName: string;
	events: StatsEventMarker[];
	metric?: TimelineMetricOption;
	metricOptions?: TimelineMetricOption[];
	selectedMetricId?: string;
	onMetricChange?: (metricId: string) => void;
}

interface TimelinePoint {
	minute: number;
	home: number | null;
	away: number | null;
}

interface TimelineDotProps {
	cx?: number;
	cy?: number;
	value?: number | null;
	stroke?: string;
	payload?: TimelinePoint;
	teamName: string;
	formatValue: (value: number | null) => string;
	side?: "left" | "center" | "right";
}

const DEFAULT_TIMELINE_METRIC: TimelineMetricOption = {
	id: "possession.possession_percentage",
	group: "possession",
	key: "possession_percentage",
	label: "Posesión",
	format: formatPercentValue,
	isPercent: true,
};

const getTimelineValue = (
	bucket: MatchStatsTimeline["buckets"][number],
	side: "home" | "away",
	metric: TimelineMetricOption,
) => {
	return bucket[side].groups[metric.group]?.[metric.key]?.total ?? null;
};

function TimelineDot({
	cx,
	cy,
	value,
	stroke,
	payload,
	teamName,
	formatValue,
	side = "center",
}: TimelineDotProps) {
	if (cx == null || cy == null || value == null) return null;

	const tooltipWidth = Math.max(104, teamName.length * 6 + 72);
	const tooltipX =
		side === "right"
			? cx + 12
			: side === "left"
				? cx - tooltipWidth - 12
				: cx - tooltipWidth / 2;
	const tooltipY = cy < 38 ? cy + 14 : cy - 34;

	return (
		<g className="group">
			<circle cx={cx} cy={cy} r={9} fill="transparent" />
			<circle
				cx={cx}
				cy={cy}
				r={3.5}
				fill="var(--background)"
				stroke={stroke}
				strokeWidth={2.5}
				className="transition-opacity group-hover:opacity-75"
			/>
			<g
				transform={`translate(${tooltipX}, ${tooltipY})`}
				className="pointer-events-none opacity-0 transition-opacity group-hover:opacity-100"
			>
				<rect
					width={tooltipWidth}
					height={24}
					rx={5}
					className="fill-background stroke-border"
				/>
				<text
					x={tooltipWidth / 2}
					y={15}
					textAnchor="middle"
					className="fill-foreground text-[11px] font-medium"
				>
					{teamName} · {formatValue(value)} · {payload?.minute}'
				</text>
			</g>
		</g>
	);
}

export default function StatsPossessionLineChart({
	timeline,
	homeTeamName,
	awayTeamName,
	events,
	metric,
	metricOptions = [],
	selectedMetricId,
	onMetricChange,
}: StatsPossessionLineChartProps) {
	const activeMetric = metric ?? DEFAULT_TIMELINE_METRIC;
	const formatValue = activeMetric.format ?? formatStatValue;
	const chartData = useMemo<TimelinePoint[]>(() => {
		return [...timeline.buckets]
			.sort((a, b) => a.minute - b.minute)
			.map((bucket) => ({
				minute: bucket.minute,
				home: getTimelineValue(bucket, "home", activeMetric),
				away: getTimelineValue(bucket, "away", activeMetric),
			}));
	}, [activeMetric, timeline.buckets]);

	const hasData = chartData.some(
		(point) => point.home != null || point.away != null,
	);
	const lastPoint = chartData[chartData.length - 1];
	const firstMinute = chartData[0]?.minute;
	const lastMinute = chartData[chartData.length - 1]?.minute;
	const hasSelector = metricOptions.length > 1 && onMetricChange != null;
	const metricTitle = activeMetric.label.toLocaleLowerCase("es-ES");
	const chartConfig = {
		home: {
			label: homeTeamName,
			color: "#3b82f6",
		},
		away: {
			label: awayTeamName,
			color: "#f43f5e",
		},
	} satisfies ChartConfig;

	return (
		<section className="rounded-md border bg-background shadow-sm">
			<header className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
				<div className="min-w-0">
					<h2 className="truncate text-sm font-semibold text-foreground">
						Evolución de {metricTitle}
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Buckets de {timeline.intervalMinutes} minutos
					</p>
				</div>

				<div className="flex flex-wrap items-center justify-end gap-3">
					{hasSelector ? (
						<Select
							value={selectedMetricId ?? activeMetric.id}
							onValueChange={onMetricChange}
						>
							<SelectTrigger size="sm" className="w-[13rem] max-w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent align="end">
								{metricOptions.map((option) => (
									<SelectItem key={option.id} value={option.id}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					) : null}

					<div className="flex flex-wrap justify-end gap-3 text-xs">
						<span className="inline-flex items-center gap-1.5 text-muted-foreground">
							<span className="size-2 rounded-full bg-blue-500" />
							{homeTeamName}
							<span className="font-semibold tabular-nums text-foreground">
								{formatValue(lastPoint?.home ?? null)}
							</span>
						</span>
						<span className="inline-flex items-center gap-1.5 text-muted-foreground">
							<span className="size-2 rounded-full bg-rose-500" />
							{awayTeamName}
							<span className="font-semibold tabular-nums text-foreground">
								{formatValue(lastPoint?.away ?? null)}
							</span>
						</span>
					</div>
				</div>
			</header>

			<div className="px-3 py-4">
				{hasData ? (
					<ChartContainer
						config={chartConfig}
						className="h-[18rem] min-h-[18rem] w-full"
					>
						<LineChart
							accessibilityLayer
							data={chartData}
							margin={{ left: 8, right: 16, top: 24, bottom: 8 }}
						>
							<CartesianGrid vertical={false} />
							<XAxis
								type="number"
								dataKey="minute"
								domain={[0, "dataMax"]}
								allowDecimals={false}
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value: number | string) => `${value}'`}
							/>
							<YAxis
								domain={activeMetric.isPercent ? [0, 100] : [0, "dataMax"]}
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value: number | string) =>
									formatValue(Number(value))
								}
							/>
							<ChartLegend content={<ChartLegendContent />} />
							<Line
								dataKey="home"
								type="monotone"
								stroke="var(--color-home)"
								strokeWidth={3}
								dot={(props: Omit<TimelineDotProps, "teamName" | "formatValue">) => {
									const side =
										props.payload?.minute === firstMinute
											? "right"
											: props.payload?.minute === lastMinute
												? "left"
												: "center";

									return (
										<TimelineDot
											{...props}
											teamName={homeTeamName}
											formatValue={formatValue}
											side={side}
										/>
									);
								}}
								activeDot={false}
								connectNulls
							/>
							<Line
								dataKey="away"
								type="monotone"
								stroke="var(--color-away)"
								strokeWidth={3}
								dot={(props: Omit<TimelineDotProps, "teamName" | "formatValue">) => {
									const side =
										props.payload?.minute === firstMinute
											? "right"
											: props.payload?.minute === lastMinute
												? "left"
												: "center";

									return (
										<TimelineDot
											{...props}
											teamName={awayTeamName}
											formatValue={formatValue}
											side={side}
										/>
									);
								}}
								activeDot={false}
								connectNulls
							/>
							<StatsEventMarkers events={events} />
						</LineChart>
					</ChartContainer>
				) : (
					<div className="flex min-h-[14rem] items-center justify-center rounded-md border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
						Esperando buckets de {metricTitle} para pintar la evolución.
					</div>
				)}
			</div>
		</section>
	);
}
