import { WifiOff } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import useGameStore from "@/store/gameStore";
import useStatsStore from "@/store/statsStore";
import type { TeamGroupedStats, TeamSide } from "@/types/stats";
import type {
	WidgetComponentProps,
	WidgetPanelProps,
} from "@/features/dashboard/types/dashboard.types";
import {
	DASHBOARD_METRIC_BY_ID,
	DASHBOARD_METRIC_OPTIONS,
	DEFAULT_MATCH_STAT_METRICS,
	STATS_PERIOD_OPTIONS,
	formatDashboardMetric,
	getMetricGroupIcon,
	getStatPeriodValue,
	type DashboardMetricConfig,
	type StatsPeriod,
} from "@/features/dashboard/widgets/dashboardStats";
import {
	CheckboxList,
	SelectField,
	SectionTitle,
} from "@/features/dashboard/widgets/widgetControls";

export type MatchStatsConfig = {
	metrics: string[];
	displayType: "comparison" | "cards";
};

export type MatchStatsFilters = {
	team: TeamSide | "both";
	period: StatsPeriod;
};

export const DEFAULT_MATCH_STATS_CONFIG: MatchStatsConfig = {
	metrics: DEFAULT_MATCH_STAT_METRICS,
	displayType: "comparison",
};

export const DEFAULT_MATCH_STATS_FILTERS: MatchStatsFilters = {
	team: "both",
	period: "total",
};

function getBarWidth(value: number | null, totalValue: number) {
	if (value == null || value <= 0 || totalValue <= 0) return "0%";
	return `${Math.max(4, Math.min(100, (value / totalValue) * 100))}%`;
}

function getSelectedMetrics(metricIds: string[]): DashboardMetricConfig[] {
	const metrics = metricIds
		.map((metricId) => DASHBOARD_METRIC_BY_ID[metricId])
		.filter((metric): metric is DashboardMetricConfig => Boolean(metric));

	return metrics.length > 0
		? metrics
		: DEFAULT_MATCH_STAT_METRICS.map((metricId) => DASHBOARD_METRIC_BY_ID[metricId]).filter(
				(metric): metric is DashboardMetricConfig => Boolean(metric),
			);
}

function TeamMetricCard({
	team,
	metric,
	period,
	color,
}: {
	team: TeamGroupedStats;
	metric: DashboardMetricConfig;
	period: StatsPeriod;
	color: string;
}) {
	const Icon = getMetricGroupIcon(metric);
	const value = getStatPeriodValue(team, metric, period);

	return (
		<div className="rounded-md border bg-background p-3">
			<div className="flex items-start justify-between gap-3">
				<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
					<Icon className="size-4" />
				</span>
				<span className="text-right text-xl font-semibold tabular-nums" style={{ color }}>
					{formatDashboardMetric(metric, value)}
				</span>
			</div>
			<p className="mt-3 truncate text-sm font-medium">{metric.label}</p>
			<p className="mt-1 truncate text-xs text-muted-foreground">{team.teamName}</p>
		</div>
	);
}

function ComparisonRow({
	home,
	away,
	metric,
	period,
}: {
	home: TeamGroupedStats;
	away: TeamGroupedStats;
	metric: DashboardMetricConfig;
	period: StatsPeriod;
}) {
	const homeValue = getStatPeriodValue(home, metric, period);
	const awayValue = getStatPeriodValue(away, metric, period);
	const totalValue = Math.max((homeValue ?? 0) + (awayValue ?? 0), 0);

	return (
		<div className="grid grid-cols-[minmax(3.5rem,0.7fr)_minmax(8rem,1fr)_minmax(3.5rem,0.7fr)] items-center gap-3 px-3 py-3">
			<div className="text-right text-xs font-semibold tabular-nums text-foreground">
				{formatDashboardMetric(metric, homeValue)}
			</div>
			<div>
				<div className="mb-1.5 truncate text-center text-[11px] font-medium text-muted-foreground">
					{metric.label}
				</div>
				<div className="grid h-3 grid-cols-2 gap-px rounded-full bg-muted">
					<div className="relative h-full rounded-l-full bg-blue-100/80">
						<div
							className="absolute right-0 top-0 h-full rounded-l-full bg-blue-500"
							style={{ width: getBarWidth(homeValue, totalValue) }}
						/>
					</div>
					<div className="relative h-full rounded-r-full bg-rose-100/80">
						<div
							className="absolute left-0 top-0 h-full rounded-r-full bg-rose-500"
							style={{ width: getBarWidth(awayValue, totalValue) }}
						/>
					</div>
				</div>
			</div>
			<div className="text-xs font-semibold tabular-nums text-foreground">
				{formatDashboardMetric(metric, awayValue)}
			</div>
		</div>
	);
}

export function MatchStatsWidget({
	config,
	filters,
}: WidgetComponentProps<MatchStatsConfig, MatchStatsFilters>) {
	const game = useGameStore((state) => state.game);
	const statsData = useStatsStore((state) => state.data);
	const metrics = getSelectedMetrics(config.metrics);
	const periodLabel =
		STATS_PERIOD_OPTIONS.find((option) => option.value === filters.period)?.label ??
		"Partido";

	if (!statsData) {
		return (
			<div className="flex h-full items-center justify-center p-4">
				<Alert className="max-w-md">
					<WifiOff className="size-5" />
					<AlertTitle>Sin estadisticas disponibles</AlertTitle>
					<AlertDescription>
						Esperando el primer snapshot de estadisticas para alimentar el widget.
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const home = statsData.current.home;
	const away = statsData.current.away;
	const homeName = home.teamName || game?.home_team.team_name || "Local";
	const awayName = away.teamName || game?.away_team.team_name || "Visitante";
	const selectedTeams =
		filters.team === "home"
			? [{ team: home, color: "#3b82f6" }]
			: filters.team === "away"
				? [{ team: away, color: "#f43f5e" }]
				: [
						{ team: home, color: "#3b82f6" },
						{ team: away, color: "#f43f5e" },
					];
	const showComparison = filters.team === "both" && config.displayType === "comparison";

	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant="outline" className="rounded-md">
					{periodLabel}
				</Badge>
				<Badge variant="secondary" className="rounded-md">
					{metrics.length} metricas
				</Badge>
			</div>

			{showComparison ? (
				<div className="min-h-0 overflow-auto rounded-md border bg-background">
					<div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b px-3 py-2 text-[11px] font-medium text-muted-foreground">
						<span className="truncate text-right">{homeName}</span>
						<span className="h-px w-10 bg-border" />
						<span className="truncate">{awayName}</span>
					</div>
					<div className="divide-y">
						{metrics.map((metric) => (
							<ComparisonRow
								key={metric.id}
								home={home}
								away={away}
								metric={metric}
								period={filters.period}
							/>
						))}
					</div>
				</div>
			) : (
				<div className="grid min-h-0 gap-3 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
					{selectedTeams.flatMap(({ team, color }) =>
						metrics.map((metric) => (
							<TeamMetricCard
								key={`${team.side}-${metric.id}`}
								team={team}
								metric={metric}
								period={filters.period}
								color={color}
							/>
						)),
					)}
				</div>
			)}
		</div>
	);
}

export function MatchStatsWidgetConfig({
	value,
	onChange,
}: WidgetPanelProps<MatchStatsConfig>) {
	return (
		<div className="space-y-4">
			<SectionTitle>Tipo de visualizacion</SectionTitle>
			<SelectField
				label="Formato"
				value={value.displayType}
				onChange={(displayType) => {
					if (displayType === "comparison" || displayType === "cards") {
						onChange({ ...value, displayType });
					}
				}}
				options={[
					{ value: "comparison", label: "Comparativa" },
					{ value: "cards", label: "Tarjetas" },
				]}
			/>

			<SectionTitle>Metricas</SectionTitle>
			<CheckboxList
				options={DASHBOARD_METRIC_OPTIONS}
				value={value.metrics}
				onChange={(metrics) => onChange({ ...value, metrics })}
			/>
		</div>
	);
}

export function MatchStatsWidgetFilters({
	value,
	onChange,
}: WidgetPanelProps<MatchStatsFilters>) {
	const game = useGameStore((state) => state.game);

	return (
		<div className="grid gap-3 sm:grid-cols-2">
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
			<SelectField
				label="Periodo"
				value={value.period}
				onChange={(period) => {
					if (period === "total" || period === "firstHalf" || period === "secondHalf") {
						onChange({ ...value, period });
					}
				}}
				options={STATS_PERIOD_OPTIONS}
			/>
		</div>
	);
}
