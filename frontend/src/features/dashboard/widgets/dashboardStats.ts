import { Activity, Crosshair, Gauge, Send, ShieldCheck, BadgeAlert } from "lucide-react";
import type { ComponentType } from "react";

import {
	formatPercentValue,
	formatStatValue,
	type StatMetricConfig,
} from "@/components/stats/StatsComparisonBars";
import type { StatGroupName, StatPeriodValues, TeamGroupedStats } from "@/types/stats";

export type StatsPeriod = "total" | "firstHalf" | "secondHalf";

export interface DashboardMetricConfig extends StatMetricConfig {
	id: string;
	group: StatGroupName;
	description?: string;
}

export interface DashboardStatGroup {
	group: StatGroupName;
	title: string;
	icon: ComponentType<{ className?: string }>;
	metrics: DashboardMetricConfig[];
}

export const STATS_PERIOD_OPTIONS: Array<{ value: StatsPeriod; label: string }> = [
	{ value: "total", label: "Partido" },
	{ value: "firstHalf", label: "Primera parte" },
	{ value: "secondHalf", label: "Segunda parte" },
];

export const DASHBOARD_STAT_GROUPS: DashboardStatGroup[] = [
	{
		group: "possession",
		title: "Posesion",
		icon: Gauge,
		metrics: [
			{
				id: "possession.possession_percentage",
				group: "possession",
				key: "possession_percentage",
				label: "Posesion",
				format: formatPercentValue,
			},
			{ id: "possession.touches", group: "possession", key: "touches", label: "Toques" },
			{
				id: "possession.touches_in_opp_box",
				group: "possession",
				key: "touches_in_opp_box",
				label: "Toques en area rival",
			},
		],
	},
	{
		group: "passing",
		title: "Pases",
		icon: Send,
		metrics: [
			{ id: "passing.total_pass", group: "passing", key: "total_pass", label: "Pases" },
			{
				id: "passing.accurate_pass",
				group: "passing",
				key: "accurate_pass",
				label: "Pases acertados",
			},
			{
				id: "passing.fwd_pass",
				group: "passing",
				key: "fwd_pass",
				label: "Pases hacia delante",
			},
			{
				id: "passing.total_final_third_passes",
				group: "passing",
				key: "total_final_third_passes",
				label: "Pases ultimo tercio",
			},
		],
	},
	{
		group: "shooting",
		title: "Tiro",
		icon: Crosshair,
		metrics: [
			{ id: "shooting.goals", group: "shooting", key: "goals", label: "Goles" },
			{
				id: "shooting.total_scoring_att",
				group: "shooting",
				key: "total_scoring_att",
				label: "Tiros",
			},
			{
				id: "shooting.ontarget_scoring_att",
				group: "shooting",
				key: "ontarget_scoring_att",
				label: "Tiros a puerta",
			},
			{
				id: "shooting.big_chance_created",
				group: "shooting",
				key: "big_chance_created",
				label: "Grandes ocasiones",
			},
		],
	},
	{
		group: "defensive",
		title: "Defensivo",
		icon: ShieldCheck,
		metrics: [
			{
				id: "defensive.total_tackle",
				group: "defensive",
				key: "total_tackle",
				label: "Entradas",
			},
			{
				id: "defensive.interception",
				group: "defensive",
				key: "interception",
				label: "Intercepciones",
			},
			{
				id: "defensive.ball_recovery",
				group: "defensive",
				key: "ball_recovery",
				label: "Recuperaciones",
			},
		],
	},
	{
		group: "discipline",
		title: "Disciplina",
		icon: BadgeAlert,
		metrics: [
			{
				id: "discipline.fk_foul_lost",
				group: "discipline",
				key: "fk_foul_lost",
				label: "Faltas cometidas",
			},
			{
				id: "discipline.total_yel_card",
				group: "discipline",
				key: "total_yel_card",
				label: "Amarillas",
			},
			{
				id: "discipline.total_red_card",
				group: "discipline",
				key: "total_red_card",
				label: "Rojas",
			},
		],
	},
];

export const DASHBOARD_METRIC_OPTIONS = DASHBOARD_STAT_GROUPS.flatMap((group) =>
	group.metrics.map((metric) => ({
		value: metric.id,
		label: `${group.title} - ${metric.label}`,
		description: group.title,
	})),
);

export const DASHBOARD_METRIC_BY_ID = DASHBOARD_STAT_GROUPS.flatMap((group) =>
	group.metrics,
).reduce<Record<string, DashboardMetricConfig>>((acc, metric) => {
	acc[metric.id] = metric;
	return acc;
}, {});

export const DEFAULT_MATCH_STAT_METRICS = [
	"possession.possession_percentage",
	"shooting.total_scoring_att",
	"shooting.ontarget_scoring_att",
	"shooting.goals",
	"passing.total_pass",
];

export const DEFAULT_TIMELINE_METRIC_ID = "possession.possession_percentage";

export function getStatPeriodValue(
	team: TeamGroupedStats,
	metric: DashboardMetricConfig,
	period: StatsPeriod,
): number | null {
	const values: StatPeriodValues | undefined = team.groups[metric.group]?.[metric.key];
	return values?.[period] ?? null;
}

export function formatDashboardMetric(
	metric: DashboardMetricConfig,
	value: number | null,
): string {
	return (metric.format ?? formatStatValue)(value);
}

export function getMetricGroupIcon(metric: DashboardMetricConfig) {
	return DASHBOARD_STAT_GROUPS.find((group) => group.group === metric.group)?.icon ?? Activity;
}
