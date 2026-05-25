import { useMemo } from "react";
import {
	CartesianGrid,
	Line,
	LineChart,
	XAxis,
	YAxis,
} from "recharts";

import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	type ChartConfig,
} from "@/components/ui/chart";
import type { MatchStatsTimeline } from "@/types/stats";
import { formatPercentValue } from "@/components/stats/StatsComparisonBars";

interface StatsPossessionLineChartProps {
	timeline: MatchStatsTimeline;
	homeTeamName: string;
	awayTeamName: string;
}

interface PossessionPoint {
	minute: number;
	home: number | null;
	away: number | null;
}

interface PossessionDotProps {
	cx?: number;
	cy?: number;
	value?: number | null;
	stroke?: string;
	payload?: PossessionPoint;
	teamName: string;
	side?: "left" | "center" | "right";
}

const getPossessionValue = (
	bucket: MatchStatsTimeline["buckets"][number],
	side: "home" | "away",
) => {
	return bucket[side].groups.possession?.possession_percentage?.total ?? null;
};

function PossessionDot({
	cx,
	cy,
	value,
	stroke,
	payload,
	teamName,
	side = "center",
}: PossessionDotProps) {
	if (cx == null || cy == null || value == null) return null;

	const tooltipWidth = Math.max(96, teamName.length * 6 + 58);
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
					{teamName} · {formatPercentValue(value)} · {payload?.minute}'
				</text>
			</g>
		</g>
	);
}

export default function StatsPossessionLineChart({
	timeline,
	homeTeamName,
	awayTeamName,
}: StatsPossessionLineChartProps) {
	const chartData = useMemo<PossessionPoint[]>(() => {
		return [...timeline.buckets]
			.sort((a, b) => a.minute - b.minute)
			.map((bucket) => ({
				minute: bucket.minute,
				home: getPossessionValue(bucket, "home"),
				away: getPossessionValue(bucket, "away"),
			}));
	}, [timeline.buckets]);

	const hasData = chartData.some(
		(point) => point.home != null || point.away != null,
	);
	const lastPoint = chartData[chartData.length - 1];
	const firstMinute = chartData[0]?.minute;
	const lastMinute = chartData[chartData.length - 1]?.minute;
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
				<div>
					<h2 className="text-sm font-semibold text-foreground">
						Evolución de posesión
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Porcentaje por buckets de {timeline.intervalMinutes} minutos
					</p>
				</div>
				<div className="flex flex-wrap gap-3 text-xs">
					<span className="inline-flex items-center gap-1.5 text-muted-foreground">
						<span className="size-2 rounded-full bg-blue-500" />
						{homeTeamName}
						<span className="font-semibold tabular-nums text-foreground">
							{formatPercentValue(lastPoint?.home ?? null)}
						</span>
					</span>
					<span className="inline-flex items-center gap-1.5 text-muted-foreground">
						<span className="size-2 rounded-full bg-rose-500" />
						{awayTeamName}
						<span className="font-semibold tabular-nums text-foreground">
							{formatPercentValue(lastPoint?.away ?? null)}
						</span>
					</span>
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
							margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
						>
							<CartesianGrid vertical={false} />
							<XAxis
								dataKey="minute"
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value: number | string) => `${value}'`}
							/>
							<YAxis
								domain={[0, 100]}
								tickLine={false}
								axisLine={false}
								tickMargin={8}
								tickFormatter={(value: number | string) => `${value}%`}
							/>
							<ChartLegend content={<ChartLegendContent />} />
							<Line
								dataKey="home"
								type="monotone"
								stroke="var(--color-home)"
								strokeWidth={3}
								dot={(props: Omit<PossessionDotProps, "teamName">) => {
									const side =
										props.payload?.minute === firstMinute
											? "right"
											: props.payload?.minute === lastMinute
												? "left"
												: "center";

									return (
										<PossessionDot
											{...props}
											teamName={homeTeamName}
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
								dot={(props: Omit<PossessionDotProps, "teamName">) => {
									const side =
										props.payload?.minute === firstMinute
											? "right"
											: props.payload?.minute === lastMinute
												? "left"
												: "center";

									return (
										<PossessionDot
											{...props}
											teamName={awayTeamName}
											side={side}
										/>
									);
								}}
								activeDot={false}
								connectNulls
							/>
						</LineChart>
					</ChartContainer>
				) : (
					<div className="flex min-h-[14rem] items-center justify-center rounded-md border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
						Esperando buckets de posesión para pintar la evolución.
					</div>
				)}
			</div>
		</section>
	);
}
