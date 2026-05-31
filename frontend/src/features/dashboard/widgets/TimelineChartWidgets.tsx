import { useMemo } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Line,
	LineChart,
	ReferenceLine,
	XAxis,
	YAxis,
} from "recharts";

import StatsEventMarkers, {
	getStatsEventMarkers,
	type StatsEventMarker,
} from "@/components/stats/StatsEventMarkers";
import { formatStatValue } from "@/components/stats/StatsComparisonBars";
import {
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import useStatsStore from "@/store/statsStore";
import type {
	MatchMomentumPayload,
	MatchStatsTimeline,
	StatsTimeBucket,
	TeamSide,
} from "@/types/stats";
import type {
	WidgetComponentProps,
	WidgetPanelProps,
} from "@/features/dashboard/types/dashboard.types";
import {
	DASHBOARD_METRIC_BY_ID,
	DEFAULT_TIMELINE_METRIC_ID,
	formatDashboardMetric,
	type DashboardMetricConfig,
} from "@/features/dashboard/widgets/dashboardStats";
import {
	MinuteRangeField,
	SelectField,
	SectionTitle,
	SwitchField,
	TextField,
} from "@/features/dashboard/widgets/widgetControls";

type DashboardChartType = "line" | "area" | "bar";

export type TimelineChartConfig = {
	title: string;
	chartType: DashboardChartType;
	showCumulative: boolean;
	showKeyEvents: boolean;
};

export type TimelineChartFilters = {
	team: TeamSide | "both";
	minuteRange: [number, number];
};

interface ChartPoint {
	minute: number;
	[key: string]: number | null;
}

interface ChartSeries {
	key: string;
	label: string;
	color: string;
}

export const DEFAULT_STATS_EVOLUTION_CONFIG: TimelineChartConfig = {
	title: "Evolucion de posesion",
	chartType: "line",
	showCumulative: false,
	showKeyEvents: true,
};

export const DEFAULT_MOMENTUM_CONFIG: TimelineChartConfig = {
	title: "Momentum xT",
	chartType: "area",
	showCumulative: false,
	showKeyEvents: true,
};

export const DEFAULT_TIMELINE_CHART_FILTERS: TimelineChartFilters = {
	team: "both",
	minuteRange: [0, 90],
};

const CHART_TYPE_OPTIONS = [
	{ value: "line", label: "Linea" },
	{ value: "area", label: "Area" },
	{ value: "bar", label: "Barras" },
];

function getMaxMinute(timeline: MatchStatsTimeline | null | undefined) {
	return timeline?.buckets.reduce(
		(maxMinute, bucket) => Math.max(maxMinute, bucket.minute),
		90,
	) ?? 90;
}

function getTimelineMetricValue(
	bucket: StatsTimeBucket,
	side: TeamSide,
	metric: DashboardMetricConfig,
): number | null {
	return bucket[side].groups[metric.group]?.[metric.key]?.total ?? null;
}

function getMomentumValue(
	bucket: StatsTimeBucket,
	momentum: MatchMomentumPayload | null | undefined,
	side: TeamSide,
): number | null {
	const point = momentum?.points.find((item) => item.minute === bucket.minute);
	if (point) {
		return side === "home" ? point.homeMomentum : point.awayMomentum;
	}

	const bucketMomentum = bucket.momentum;
	if (!bucketMomentum) return null;
	return side === "home" ? bucketMomentum.homeMomentum : bucketMomentum.awayMomentum;
}

function cumulativeData(data: ChartPoint[], series: ChartSeries[]): ChartPoint[] {
	const totals = series.reduce<Record<string, number>>((acc, item) => {
		acc[item.key] = 0;
		return acc;
	}, {});

	return data.map((point) => {
		const nextPoint: ChartPoint = { minute: point.minute };

		for (const item of series) {
			const value = point[item.key];
			if (typeof value === "number") {
				totals[item.key] += value;
				nextPoint[item.key] = Number(totals[item.key].toFixed(3));
			} else {
				nextPoint[item.key] = null;
			}
		}

		return nextPoint;
	});
}

function filterMarkers(
	markers: StatsEventMarker[],
	filters: TimelineChartFilters,
): StatsEventMarker[] {
	const [startMinute, endMinute] = filters.minuteRange;

	return markers.filter((marker) => {
		if (marker.minute < startMinute || marker.minute > endMinute) return false;
		if (filters.team === "both") return true;
		return marker.teamSide === filters.team;
	});
}

function EmptyChartState({ message }: { message: string }) {
	return (
		<div className="flex min-h-[14rem] flex-1 items-center justify-center rounded-md border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
			{message}
		</div>
	);
}

function SeriesChart({
	data,
	series,
	chartType,
	formatValue,
	markers,
	showZeroLine = false,
}: {
	data: ChartPoint[];
	series: ChartSeries[];
	chartType: DashboardChartType;
	formatValue: (value: number | null) => string;
	markers: StatsEventMarker[];
	showZeroLine?: boolean;
}) {
	const chartConfig = series.reduce<ChartConfig>((acc, item) => {
		acc[item.key] = {
			label: item.label,
			color: item.color,
		};
		return acc;
	}, {});
	const hasData = data.some((point) =>
		series.some((item) => point[item.key] != null),
	);
	const commonChildren = (
		<>
			<CartesianGrid vertical={false} />
			<XAxis
				type="number"
				dataKey="minute"
				domain={[0, "dataMax"]}
				allowDecimals={false}
				tickLine={false}
				axisLine={false}
				tickMargin={8}
				tickFormatter={(value: number | string) => `${Number(value).toFixed(0)}'`}
			/>
			<YAxis
				tickLine={false}
				axisLine={false}
				tickMargin={8}
				tickFormatter={(value: number | string) => formatValue(Number(value))}
			/>
			<ChartTooltip
				content={
					<ChartTooltipContent
						labelFormatter={(label) => `${label}'`}
						valueFormatter={(value) =>
							typeof value === "number" ? formatValue(value) : String(value ?? "-")
						}
					/>
				}
			/>
			<ChartLegend content={<ChartLegendContent />} />
			{showZeroLine ? <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="3 3" /> : null}
			<StatsEventMarkers events={markers} />
		</>
	);

	if (!hasData) {
		return <EmptyChartState message="Esperando datos para pintar la grafica." />;
	}

	if (chartType === "bar") {
		return (
			<ChartContainer config={chartConfig} className="h-full min-h-[16rem] w-full">
				<BarChart data={data} margin={{ left: 8, right: 16, top: 20, bottom: 8 }}>
					{commonChildren}
					{series.map((item) => (
						<Bar key={item.key} dataKey={item.key} fill={`var(--color-${item.key})`} />
					))}
				</BarChart>
			</ChartContainer>
		);
	}

	if (chartType === "area") {
		return (
			<ChartContainer config={chartConfig} className="h-full min-h-[16rem] w-full">
				<AreaChart data={data} margin={{ left: 8, right: 16, top: 20, bottom: 8 }}>
					{commonChildren}
					{series.map((item) => (
						<Area
							key={item.key}
							dataKey={item.key}
							type="monotone"
							fill={`var(--color-${item.key})`}
							fillOpacity={0.18}
							stroke={`var(--color-${item.key})`}
							strokeWidth={2.5}
							connectNulls
						/>
					))}
				</AreaChart>
			</ChartContainer>
		);
	}

	return (
		<ChartContainer config={chartConfig} className="h-full min-h-[16rem] w-full">
			<LineChart data={data} margin={{ left: 8, right: 16, top: 20, bottom: 8 }}>
				{commonChildren}
				{series.map((item) => (
					<Line
						key={item.key}
						dataKey={item.key}
						type="monotone"
						stroke={`var(--color-${item.key})`}
						strokeWidth={2.5}
						dot={false}
						connectNulls
					/>
				))}
			</LineChart>
		</ChartContainer>
	);
}

function ChartHeader({
	title,
	badges,
}: {
	title: string;
	badges: string[];
}) {
	return (
		<div className="flex flex-wrap items-start justify-between gap-3">
			<div className="min-w-0">
				<h3 className="truncate text-sm font-semibold">{title}</h3>
			</div>
			<div className="flex flex-wrap justify-end gap-2">
				{badges.map((badge) => (
					<Badge key={badge} variant="outline" className="rounded-md">
						{badge}
					</Badge>
				))}
			</div>
		</div>
	);
}

export function StatsEvolutionChartWidget({
	config,
	filters,
}: WidgetComponentProps<TimelineChartConfig, TimelineChartFilters>) {
	const game = useGameStore((state) => state.game);
	const statsData = useStatsStore((state) => state.data);
	const events = useEventsStore((state) => state.events);
	const metric =
		DASHBOARD_METRIC_BY_ID[DEFAULT_TIMELINE_METRIC_ID] ??
		DASHBOARD_METRIC_BY_ID["possession.possession_percentage"];
	const eventMarkers = getStatsEventMarkers(
		events,
		statsData?.current.home.teamId,
		statsData?.current.away.teamId,
	);
	const filteredMarkers = config.showKeyEvents ? filterMarkers(eventMarkers, filters) : [];
	const { data, series } = useMemo(() => {
		if (!statsData || !metric) return { data: [], series: [] };

		const [startMinute, endMinute] = filters.minuteRange;
		const nextSeries: ChartSeries[] =
			filters.team === "both"
				? [
						{
							key: "home",
							label: statsData.current.home.teamName || game?.home_team.team_name || "Local",
							color: "#3b82f6",
						},
						{
							key: "away",
							label:
								statsData.current.away.teamName || game?.away_team.team_name || "Visitante",
							color: "#f43f5e",
						},
					]
				: [
						{
							key: filters.team,
							label:
								filters.team === "home"
									? statsData.current.home.teamName || game?.home_team.team_name || "Local"
									: statsData.current.away.teamName ||
										game?.away_team.team_name ||
										"Visitante",
							color: filters.team === "home" ? "#3b82f6" : "#f43f5e",
						},
					];
		const nextData = statsData.timeline.buckets
			.filter((bucket) => bucket.minute >= startMinute && bucket.minute <= endMinute)
			.sort((a, b) => a.minute - b.minute)
			.map((bucket) => {
				const point: ChartPoint = { minute: bucket.minute };

				for (const item of nextSeries) {
					point[item.key] = getTimelineMetricValue(bucket, item.key as TeamSide, metric);
				}

				return point;
			});

		return {
			data: config.showCumulative ? cumulativeData(nextData, nextSeries) : nextData,
			series: nextSeries,
		};
	}, [
		config.showCumulative,
		filters.minuteRange,
		filters.team,
		game?.away_team.team_name,
		game?.home_team.team_name,
		metric,
		statsData,
	]);

	if (!statsData || !metric) {
		return <EmptyChartState message="Sin timeline de estadisticas disponible." />;
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<ChartHeader
				title={config.title}
				badges={[
					config.showCumulative ? "Acumulada" : metric.label,
					config.showKeyEvents ? "Eventos clave" : "Sin eventos",
				]}
			/>
			<div className="min-h-0 flex-1">
				<SeriesChart
					data={data}
					series={series}
					chartType={config.chartType}
					formatValue={(value) =>
						config.showCumulative ? formatStatValue(value) : formatDashboardMetric(metric, value)
					}
					markers={filteredMarkers}
				/>
			</div>
		</div>
	);
}

export function MomentumChartWidget({
	config,
	filters,
}: WidgetComponentProps<TimelineChartConfig, TimelineChartFilters>) {
	const game = useGameStore((state) => state.game);
	const statsData = useStatsStore((state) => state.data);
	const events = useEventsStore((state) => state.events);
	const eventMarkers = getStatsEventMarkers(
		events,
		statsData?.current.home.teamId,
		statsData?.current.away.teamId,
	);
	const filteredMarkers = config.showKeyEvents ? filterMarkers(eventMarkers, filters) : [];
	const { data, series } = useMemo(() => {
		if (!statsData) return { data: [], series: [] };

		const [startMinute, endMinute] = filters.minuteRange;
		const nextSeries: ChartSeries[] =
			filters.team === "both"
				? [
						{
							key: "home",
							label: statsData.current.home.teamName || game?.home_team.team_name || "Local",
							color: "#3b82f6",
						},
						{
							key: "away",
							label:
								statsData.current.away.teamName || game?.away_team.team_name || "Visitante",
							color: "#f43f5e",
						},
					]
				: [
						{
							key: filters.team,
							label:
								filters.team === "home"
									? statsData.current.home.teamName || game?.home_team.team_name || "Local"
									: statsData.current.away.teamName ||
										game?.away_team.team_name ||
										"Visitante",
							color: filters.team === "home" ? "#3b82f6" : "#f43f5e",
						},
					];
		const nextData = statsData.timeline.buckets
			.filter((bucket) => bucket.minute >= startMinute && bucket.minute <= endMinute)
			.sort((a, b) => a.minute - b.minute)
			.map((bucket) => {
				const point: ChartPoint = { minute: bucket.minute };

				for (const item of nextSeries) {
					point[item.key] = getMomentumValue(
						bucket,
						statsData.momentum,
						item.key as TeamSide,
					);
				}

				return point;
			});

		return {
			data: config.showCumulative ? cumulativeData(nextData, nextSeries) : nextData,
			series: nextSeries,
		};
	}, [
		config.showCumulative,
		filters.minuteRange,
		filters.team,
		game?.away_team.team_name,
		game?.home_team.team_name,
		statsData,
	]);

	if (!statsData) {
		return <EmptyChartState message="Sin timeline de momentum disponible." />;
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<ChartHeader
				title={config.title}
				badges={[
					config.showCumulative ? "Acumulada" : "xT neto",
					config.showKeyEvents ? "Eventos clave" : "Sin eventos",
				]}
			/>
			<div className="min-h-0 flex-1">
				<SeriesChart
					data={data}
					series={series}
					chartType={config.chartType}
					formatValue={(value) =>
						value == null
							? "-"
							: value > 0
								? `+${value.toFixed(3)}`
								: value.toFixed(3)
					}
					markers={filteredMarkers}
					showZeroLine
				/>
			</div>
		</div>
	);
}

function TimelineChartConfigPanel({
	value,
	onChange,
}: WidgetPanelProps<TimelineChartConfig>) {
	return (
		<div className="space-y-4">
			<SectionTitle>Grafica</SectionTitle>
			<TextField
				label="Titulo"
				value={value.title}
				onChange={(title) => onChange({ ...value, title })}
			/>
			<SelectField
				label="Tipo de grafico"
				value={value.chartType}
				onChange={(chartType) => {
					if (chartType === "line" || chartType === "area" || chartType === "bar") {
						onChange({ ...value, chartType });
					}
				}}
				options={CHART_TYPE_OPTIONS}
			/>
			<SwitchField
				label="Linea acumulada"
				description="Transforma cada serie en un acumulado progresivo."
				checked={value.showCumulative}
				onChange={(showCumulative) => onChange({ ...value, showCumulative })}
			/>
			<SwitchField
				label="Eventos clave"
				description="Muestra tiros y goles sobre la linea temporal."
				checked={value.showKeyEvents}
				onChange={(showKeyEvents) => onChange({ ...value, showKeyEvents })}
			/>
		</div>
	);
}

function TimelineChartFiltersPanel({
	value,
	onChange,
}: WidgetPanelProps<TimelineChartFilters>) {
	const game = useGameStore((state) => state.game);
	const statsData = useStatsStore((state) => state.data);
	const maxMinute = getMaxMinute(statsData?.timeline);

	return (
		<div className="grid gap-3">
			<SelectField
				label="Equipo"
				value={value.team}
				onChange={(team) => {
					if (team === "home" || team === "away" || team === "both") {
						onChange({ ...value, team });
					}
				}}
				options={[
					{ value: "both", label: "Ambos" },
					{ value: "home", label: game?.home_team.team_name ?? "Local" },
					{ value: "away", label: game?.away_team.team_name ?? "Visitante" },
				]}
			/>
			<MinuteRangeField
				value={value.minuteRange}
				maxMinute={maxMinute}
				onChange={(minuteRange) => onChange({ ...value, minuteRange })}
			/>
		</div>
	);
}

export function StatsEvolutionChartWidgetConfig(props: WidgetPanelProps<TimelineChartConfig>) {
	return <TimelineChartConfigPanel {...props} />;
}

export function StatsEvolutionChartWidgetFilters(props: WidgetPanelProps<TimelineChartFilters>) {
	return <TimelineChartFiltersPanel {...props} />;
}

export function MomentumChartWidgetConfig(props: WidgetPanelProps<TimelineChartConfig>) {
	return <TimelineChartConfigPanel {...props} />;
}

export function MomentumChartWidgetFilters(props: WidgetPanelProps<TimelineChartFilters>) {
	return <TimelineChartFiltersPanel {...props} />;
}
