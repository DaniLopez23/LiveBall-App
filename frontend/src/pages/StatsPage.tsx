import { useMemo, useState, type ComponentType } from "react";
import {
	Activity,
	BadgeAlert,
	BarChart3,
	Clock,
	Crosshair,
	Gauge,
	Send,
	ShieldCheck,
	WifiOff,
	type LucideIcon,
} from "lucide-react";

import StatsComparisonBars, {
	formatPercentValue,
	formatStatValue,
	type StatMetricConfig,
} from "@/components/stats/StatsComparisonBars";
import { getStatsEventMarkers } from "@/components/stats/StatsEventMarkers";
import StatsMomentumLineChart from "@/components/stats/StatsMomentumLineChart";
import StatsPossessionLineChart, {
	type TimelineMetricOption,
} from "@/components/stats/StatsPossessionLineChart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
	formatEventTime,
	formatPlayerLabel,
	getOutcomeLabel,
	getTeamName,
} from "@/components/pitch/eventsPitch/eventDisplay";
import ShotFigure from "@/components/pitch/figures/ShotFigure";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import useStatsStore from "@/store/statsStore";
import useWebsocketStore from "@/store/websocketStore";
import type { Game } from "@/types/game";
import {
	isDefensiveEvent,
	isPassEvent,
	isShotEvent,
	type Event,
	type ShotEvent,
} from "@/types/event";
import type {
	MatchStatsTimeline,
	StatGroupName,
	TeamGroupedStats,
	TeamSide,
} from "@/types/stats";

interface StatGroupSection {
	group: StatGroupName;
	title: string;
	icon: LucideIcon;
	metrics: StatMetricConfig[];
}

interface SummaryMetricConfig extends StatMetricConfig {
	group: StatGroupName;
}

interface PlayerScores {
	id: string;
	name: string;
	teamName: string;
	side: TeamSide | null;
	passes: number;
	accuratePasses: number;
	forwardPasses: number;
	progressivePasses: number;
	defensiveActions: number;
	shots: number;
	goals: number;
}

type AttackDirection = "left" | "right";

interface KeyPlayer {
	role: "defense" | "midfield" | "attack";
	title: string;
	icon: ComponentType<{ className?: string }>;
	player: PlayerScores | null;
	score: number;
	primary: string;
	secondary: string;
}

const TEAM_COLORS: Record<TeamSide, string> = {
	home: "#3b82f6",
	away: "#f43f5e",
};

const STAT_GROUP_SECTIONS: StatGroupSection[] = [
	{
		group: "possession",
		title: "Posesión",
		icon: Gauge,
		metrics: [
			{
				key: "possession_percentage",
				label: "Posesión",
				format: formatPercentValue,
			},
			{ key: "touches", label: "Toques" },
			{ key: "touches_in_opp_box", label: "Toques en área rival" },
			{ key: "poss_lost_all", label: "Pérdidas" },
		],
	},
	{
		group: "passing",
		title: "Pases",
		icon: Send,
		metrics: [
			{ key: "total_pass", label: "Pases" },
			{ key: "accurate_pass", label: "Pases acertados" },
			{ key: "fwd_pass", label: "Pases hacia delante" },
			{ key: "backward_pass", label: "Pases hacia atrás" },
			{ key: "total_final_third_passes", label: "Pases último tercio" },
			{
				key: "successful_final_third_passes",
				label: "Pases último tercio acertados",
			},
			{ key: "total_long_balls", label: "Balones largos" },
			{ key: "accurate_long_balls", label: "Balones largos acertados" },
			{ key: "total_cross", label: "Centros" },
			{ key: "accurate_cross", label: "Centros acertados" },
		],
	},
	{
		group: "shooting",
		title: "Tiro",
		icon: Crosshair,
		metrics: [
			{ key: "goals", label: "Goles" },
			{ key: "total_scoring_att", label: "Tiros" },
			{ key: "ontarget_scoring_att", label: "Tiros a puerta" },
			{ key: "shot_off_target", label: "Tiros fuera" },
			{ key: "blocked_scoring_att", label: "Tiros bloqueados" },
			{ key: "attempts_ibox", label: "Tiros dentro del área" },
			{ key: "attempts_obox", label: "Tiros fuera del área" },
			{ key: "big_chance_created", label: "Grandes ocasiones creadas" },
			{ key: "big_chance_missed", label: "Grandes ocasiones falladas" },
			{ key: "pen_area_entries", label: "Entradas al área" },
			{ key: "final_third_entries", label: "Entradas último tercio" },
			{ key: "total_att_assist", label: "Asistencias de tiro" },
		],
	},
	{
		group: "defensive",
		title: "Defensivo",
		icon: ShieldCheck,
		metrics: [
			{ key: "total_tackle", label: "Entradas" },
			{ key: "won_tackle", label: "Entradas ganadas" },
			{ key: "interception", label: "Intercepciones" },
			{ key: "ball_recovery", label: "Recuperaciones" },
			{ key: "total_clearance", label: "Despejes" },
			{ key: "effective_clearance", label: "Despejes efectivos" },
			{ key: "outfielder_block", label: "Bloqueos" },
			{ key: "duel_won", label: "Duelos ganados" },
			{ key: "duel_lost", label: "Duelos perdidos" },
			{ key: "aerial_won", label: "Aéreos ganados" },
			{ key: "aerial_lost", label: "Aéreos perdidos" },
			{ key: "poss_won_def_3rd", label: "Recuperaciones tercio defensivo" },
			{ key: "poss_won_mid_3rd", label: "Recuperaciones tercio medio" },
			{ key: "poss_won_att_3rd", label: "Recuperaciones tercio ofensivo" },
			{ key: "attempts_conceded_ibox", label: "Tiros concedidos dentro área" },
			{ key: "attempts_conceded_obox", label: "Tiros concedidos fuera área" },
			{ key: "goals_conceded", label: "Goles concedidos" },
			{ key: "saves", label: "Paradas" },
		],
	},
	{
		group: "discipline",
		title: "Disciplina",
		icon: BadgeAlert,
		metrics: [
			{ key: "fk_foul_won", label: "Faltas recibidas" },
			{ key: "fk_foul_lost", label: "Faltas cometidas" },
			{ key: "total_yel_card", label: "Tarjetas amarillas" },
			{ key: "total_red_card", label: "Tarjetas rojas" },
			{ key: "total_offside", label: "Fueras de juego" },
		],
	},
];

const SUMMARY_METRICS: SummaryMetricConfig[] = [
	{
		group: "possession",
		key: "possession_percentage",
		label: "Posesión",
		format: formatPercentValue,
	},
	{ group: "shooting", key: "total_scoring_att", label: "Tiros" },
	{ group: "shooting", key: "ontarget_scoring_att", label: "Tiros a puerta" },
	{ group: "shooting", key: "goals", label: "Goles" },
	{ group: "discipline", key: "fk_foul_lost", label: "Faltas" },
];

const LEFT_STAT_GROUP_SECTIONS = STAT_GROUP_SECTIONS.filter(
	(_, index) => index % 2 === 0,
);
const RIGHT_STAT_GROUP_SECTIONS = STAT_GROUP_SECTIONS.filter(
	(_, index) => index % 2 === 1,
);

const DEFAULT_TIMELINE_METRIC: TimelineMetricOption = {
	id: "possession.possession_percentage",
	group: "possession",
	key: "possession_percentage",
	label: "Posesión",
	format: formatPercentValue,
	isPercent: true,
};

const METRIC_CONFIG_BY_ID = STAT_GROUP_SECTIONS.reduce<
	Record<string, StatMetricConfig>
>((acc, section) => {
	for (const metric of section.metrics) {
		acc[getMetricId(section.group, metric.key)] = metric;
	}

	return acc;
}, {});

const METRIC_ORDER_BY_ID = STAT_GROUP_SECTIONS.reduce<Record<string, number>>(
	(acc, section, sectionIndex) => {
		section.metrics.forEach((metric, metricIndex) => {
			acc[getMetricId(section.group, metric.key)] = sectionIndex * 100 + metricIndex;
		});

		return acc;
	},
	{},
);

function getMetricId(group: StatGroupName, key: string): string {
	return `${group}.${key}`;
}

function humanizeMetricKey(key: string): string {
	return key
		.split("_")
		.filter(Boolean)
		.map((part) => part.charAt(0).toLocaleUpperCase("es-ES") + part.slice(1))
		.join(" ");
}

function getTimelineMetricOptions(
	timeline: MatchStatsTimeline | null | undefined,
): TimelineMetricOption[] {
	if (!timeline) return [];

	const options = new Map<string, TimelineMetricOption>();

	for (const bucket of timeline.buckets) {
		for (const side of ["home", "away"] as const) {
			for (const group of Object.keys(bucket[side].groups) as StatGroupName[]) {
				for (const [key, values] of Object.entries(bucket[side].groups[group])) {
					if (values.total == null) continue;

					const id = getMetricId(group, key);
					if (options.has(id)) continue;

					const configuredMetric = METRIC_CONFIG_BY_ID[id];
					const isPercent =
						key.includes("percentage") ||
						key.includes("accuracy") ||
						key.includes("conversion");
					options.set(id, {
						id,
						group,
						key,
						label: configuredMetric?.label ?? humanizeMetricKey(key),
						format: configuredMetric?.format ?? (isPercent ? formatPercentValue : undefined),
						isPercent,
					});
				}
			}
		}
	}

	return [...options.values()].sort((a, b) => {
		const aOrder = METRIC_ORDER_BY_ID[a.id] ?? Number.MAX_SAFE_INTEGER;
		const bOrder = METRIC_ORDER_BY_ID[b.id] ?? Number.MAX_SAFE_INTEGER;

		if (aOrder !== bOrder) return aOrder - bOrder;
		return a.label.localeCompare(b.label, "es-ES");
	});
}

function formatMinute(minute: number | null): string {
	return minute == null ? "Sin minuto" : `${minute}'`;
}

function formatTimestamp(timestamp: string): string {
	if (!timestamp) return "Sin timestamp";

	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return timestamp;

	return new Intl.DateTimeFormat("es-ES", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).format(date);
}

function getTotal(team: TeamGroupedStats, group: StatGroupName, metricKey: string) {
	return team.groups[group]?.[metricKey]?.total ?? null;
}

function getBarWidth(value: number | null, totalValue: number): string {
	if (value == null || value <= 0 || totalValue <= 0) return "0%";
	return `${Math.max(4, Math.min(100, (value / totalValue) * 100))}%`;
}

function getTeamSideFromGame(
	game: Game | null | undefined,
	teamId: string | null | undefined,
): TeamSide | null {
	if (!teamId) return null;
	if (game?.home_team.team_id === teamId) return "home";
	if (game?.away_team.team_id === teamId) return "away";
	return null;
}

function getTeamSideFromIds(
	teamId: string | null | undefined,
	homeTeamId: string,
	awayTeamId: string,
): TeamSide | null {
	if (!teamId) return null;
	if (teamId === homeTeamId) return "home";
	if (teamId === awayTeamId) return "away";
	return null;
}

function sortEventsByTime<T extends Event>(events: T[]): T[] {
	return [...events].sort((a, b) => {
		const aValue = (a.period_id ?? 0) * 10_000 + (a.min ?? 0) * 60 + (a.sec ?? 0);
		const bValue = (b.period_id ?? 0) * 10_000 + (b.min ?? 0) * 60 + (b.sec ?? 0);

		if (aValue !== bValue) return aValue - bValue;
		return String(a.event_id ?? a.id).localeCompare(String(b.event_id ?? b.id));
	});
}

function getPlayerName(event: Event): string {
	const dorsal = event.player?.dorsal?.trim();
	const name = event.player?.name?.trim();

	if (dorsal && name) return `${dorsal} - ${name}`;
	if (name) return name;
	if (dorsal) return dorsal;
	return event.player_id ? `Jugador ${event.player_id}` : "Jugador sin identificar";
}

function getPlayerKey(event: Event): string | null {
	return event.player_id ?? event.player?.id ?? null;
}

function getAttackDirectionResolver(events: Event[], game: Game | null) {
	const byTeam = new Map<string, { count: number; totalX: number }>();
	const byTeamPeriod = new Map<string, { count: number; totalX: number }>();

	for (const event of events) {
		if (!isShotEvent(event) || !event.team_id || event.x == null) continue;

		const teamSample = byTeam.get(event.team_id) ?? { count: 0, totalX: 0 };
		teamSample.count += 1;
		teamSample.totalX += event.x;
		byTeam.set(event.team_id, teamSample);

		const periodKey = `${event.team_id}.${event.period_id ?? "match"}`;
		const periodSample = byTeamPeriod.get(periodKey) ?? { count: 0, totalX: 0 };
		periodSample.count += 1;
		periodSample.totalX += event.x;
		byTeamPeriod.set(periodKey, periodSample);
	}

	return (event: Event): AttackDirection => {
		const teamId = event.team_id;
		if (!teamId) return "right";

		const periodSample = byTeamPeriod.get(`${teamId}.${event.period_id ?? "match"}`);
		const teamSample = byTeam.get(teamId);
		const sample = periodSample?.count ? periodSample : teamSample;

		if (sample?.count) {
			return sample.totalX / sample.count >= 50 ? "right" : "left";
		}

		const side = getTeamSideFromGame(game, teamId);
		return side === "away" ? "left" : "right";
	};
}

function getForwardPassDistance(
	event: Event,
	resolveAttackDirection: (event: Event) => AttackDirection,
): number {
	if (!isPassEvent(event) || event.x == null || event.end_x == null) return 0;

	const direction = resolveAttackDirection(event);
	return direction === "right" ? event.end_x - event.x : event.x - event.end_x;
}

function getPlayerScores(events: Event[], game: Game | null): PlayerScores[] {
	const players = new Map<string, PlayerScores>();
	const resolveAttackDirection = getAttackDirectionResolver(events, game);

	for (const event of events) {
		const playerId = getPlayerKey(event);
		if (!playerId) continue;

		const player =
			players.get(playerId) ??
			({
				id: playerId,
				name: getPlayerName(event),
				teamName: getTeamName(game, event.team_id),
				side: getTeamSideFromGame(game, event.team_id),
				passes: 0,
				accuratePasses: 0,
				forwardPasses: 0,
				progressivePasses: 0,
				defensiveActions: 0,
				shots: 0,
				goals: 0,
			} satisfies PlayerScores);

		if (isPassEvent(event)) {
			player.passes += 1;

			if (String(event.outcome) === "1") {
				player.accuratePasses += 1;
			}

			const forwardDistance = getForwardPassDistance(event, resolveAttackDirection);
			if (forwardDistance > 0) {
				player.forwardPasses += 1;

				if (forwardDistance >= 10) {
					player.progressivePasses += 1;
				}
			}
		}

		if (isDefensiveEvent(event)) {
			player.defensiveActions += 1;
		}

		if (isShotEvent(event)) {
			player.shots += 1;

			if (event.type_id === "16" || event.outcome === "Goal") {
				player.goals += 1;
			}
		}

		players.set(playerId, player);
	}

	return [...players.values()];
}

function getKeyPlayers(events: Event[], game: Game | null): KeyPlayer[] {
	const players = getPlayerScores(events, game);
	const byScore = (
		score: (player: PlayerScores) => number,
		tieBreaker: (player: PlayerScores) => number,
	) => {
		const sortedPlayers = [...players].sort((a, b) => {
			const scoreDiff = score(b) - score(a);
			if (scoreDiff !== 0) return scoreDiff;

			return tieBreaker(b) - tieBreaker(a);
		});

		return {
			player: sortedPlayers[0] ?? null,
			score: sortedPlayers[0] ? score(sortedPlayers[0]) : 0,
		};
	};
	const defense = byScore(
		(player) => player.defensiveActions * 3 + player.accuratePasses * 0.35,
		(player) => player.defensiveActions + player.passes,
	);
	const midfield = byScore(
		(player) =>
			player.passes * 1.15 +
			player.accuratePasses +
			player.forwardPasses * 1.8 +
			player.progressivePasses * 3,
		(player) => player.passes,
	);
	const attack = byScore(
		(player) =>
			player.shots * 7 +
			player.goals * 5 +
			player.progressivePasses * 1.75 +
			player.forwardPasses * 0.6,
		(player) => player.shots + player.forwardPasses,
	);

	return [
		{
			role: "defense",
			title: "Defensa",
			icon: ShieldCheck,
			player: defense.player,
			score: defense.score,
			primary: defense.player
				? `${defense.player.defensiveActions} acciones defensivas`
				: "Sin datos",
			secondary: defense.player
				? `${defense.player.accuratePasses} pases acertados`
				: "-",
		},
		{
			role: "midfield",
			title: "Mediocampo",
			icon: Send,
			player: midfield.player,
			score: midfield.score,
			primary: midfield.player
				? `${midfield.player.accuratePasses} pases acertados`
				: "Sin datos",
			secondary: midfield.player
				? `${midfield.player.forwardPasses} pases hacia delante`
				: "-",
		},
		{
			role: "attack",
			title: "Ataque",
			icon: Crosshair,
			player: attack.player,
			score: attack.score,
			primary: attack.player
				? `${attack.player.shots} tiros · ${attack.player.goals} goles`
				: "Sin datos",
			secondary: attack.player
				? `${attack.player.progressivePasses} pases progresivos`
				: "-",
		},
	];
}

function getShotTags(shot: ShotEvent): string[] {
	const tags = [
		shot.penalty ? "Penalti" : null,
		shot.head ? "Cabeza" : null,
		shot.right_footed ? "Pie derecho" : null,
		shot.left_footed ? "Pie izquierdo" : null,
		shot.big_chance ? "Gran ocasión" : null,
		shot.fast_break ? "Transición" : null,
		shot.set_piece ? "ABP" : null,
		shot.from_corner ? "Córner" : null,
		shot.free_kick ? "Falta directa" : null,
		shot.assisted ? "Asistido" : null,
	].filter((tag): tag is string => Boolean(tag));

	return tags.length > 0 ? tags : [shot.regular_play ? "Juego abierto" : "Sin detalle"];
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function getShotFigureOutcome(
	shot: ShotEvent,
): "Miss" | "Post" | "Attempt Saved" | "Goal" {
	if (shot.type_id === "16" || shot.outcome === "Goal") return "Goal";
	if (shot.type_id === "15" || shot.outcome === "Attempt Saved") {
		return "Attempt Saved";
	}
	if (shot.type_id === "14" || shot.outcome === "Post") return "Post";
	return "Miss";
}

function getNormalizedShotCoordinate(
	shot: ShotEvent,
	x: number,
	y: number,
): { x: number; y: number } {
	const mirrored = (shot.x ?? 50) <= 50;
	const normalizedX = mirrored ? 100 - x : x;
	const normalizedY = mirrored ? 100 - y : y;

	return {
		x: clamp(normalizedX, 50, 100),
		y: clamp(normalizedY, 0, 100),
	};
}

function getShotEndCoordinate(shot: ShotEvent): { x: number; y: number } {
	if (shot.blocked_x != null && shot.blocked_y != null) {
		return getNormalizedShotCoordinate(shot, shot.blocked_x, shot.blocked_y);
	}

	if (shot.gk_x != null && shot.gk_y != null) {
		return getNormalizedShotCoordinate(shot, shot.gk_x, shot.gk_y);
	}

	const goalX = (shot.x ?? 50) > 50 ? 100 : 0;
	return getNormalizedShotCoordinate(
		shot,
		goalX,
		shot.goal_mouth_y ?? shot.y ?? 50,
	);
}

function getHalfPitchPoint(coordinate: { x: number; y: number }) {
	const field = { x: 5, y: 5, width: 145, height: 190 };
	const progressToGoal = clamp((coordinate.x - 50) / 50, 0, 1);

	return {
		x: field.x + progressToGoal * field.width,
		y: field.y + (coordinate.y / 100) * field.height,
	};
}

function getShotMapPoints(shot: ShotEvent) {
	const start = getHalfPitchPoint(
		getNormalizedShotCoordinate(shot, shot.x ?? 50, shot.y ?? 50),
	);
	const end = getHalfPitchPoint(getShotEndCoordinate(shot));

	return { start, end };
}

function StatsSummaryBars({
	home,
	away,
	homeTeamName,
	awayTeamName,
	className,
}: {
	home: TeamGroupedStats;
	away: TeamGroupedStats;
	homeTeamName: string;
	awayTeamName: string;
	className?: string;
}) {
	return (
		<section
			className={[
				"flex flex-col rounded-md border bg-background shadow-sm",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			<header className="border-b px-4 py-3">
				<div className="flex items-center gap-2 text-sm font-semibold text-foreground">
					<BarChart3 className="size-4" />
					Stats principales
				</div>
				<div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[11px] font-medium text-muted-foreground">
					<span className="truncate text-right">{homeTeamName}</span>
					<span className="h-px w-10 bg-border" />
					<span className="truncate">{awayTeamName}</span>
				</div>
			</header>

			<div className="flex flex-1 flex-col divide-y">
				{SUMMARY_METRICS.map((metric) => {
					const homeValue = getTotal(home, metric.group, metric.key);
					const awayValue = getTotal(away, metric.group, metric.key);
					const totalValue = Math.max((homeValue ?? 0) + (awayValue ?? 0), 0);
					const formatter = metric.format ?? formatStatValue;

					return (
						<div
							key={`${metric.group}.${metric.key}`}
							className="grid min-h-[5.25rem] flex-1 grid-cols-[minmax(3.25rem,0.6fr)_minmax(8rem,1fr)_minmax(3.25rem,0.6fr)] items-center gap-3 px-4 py-4"
						>
							<div className="text-right text-xs font-semibold tabular-nums text-foreground">
								{formatter(homeValue)}
							</div>
							<div>
								<div className="mb-2 text-center text-[11px] font-medium text-muted-foreground">
									{metric.label}
								</div>
								<div
									className="grid h-3.5 grid-cols-2 gap-px rounded-full bg-muted"
									aria-label={`${metric.label}: ${homeTeamName} ${formatter(
										homeValue,
									)}, ${awayTeamName} ${formatter(awayValue)}`}
								>
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
								{formatter(awayValue)}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

function KeyPlayerCard({ item }: { item: KeyPlayer }) {
	const Icon = item.icon;
	const sideColor = item.player?.side ? TEAM_COLORS[item.player.side] : "#64748b";

	return (
		<article className="rounded-md border bg-background p-3 shadow-sm">
			<div className="flex items-start gap-3">
				<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
					<Icon className="size-4" />
				</span>
				<div className="min-w-0 flex-1">
					<div className="flex items-center justify-between gap-2">
						<h3 className="truncate text-sm font-semibold text-foreground">
							{item.title}
						</h3>
						<span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
							{formatStatValue(item.score)}
						</span>
					</div>
					<p className="mt-1 truncate text-sm font-medium text-foreground">
						{item.player?.name ?? "Sin jugador"}
					</p>
					<div className="mt-2 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
						<span
							className="size-2 shrink-0 rounded-full"
							style={{ backgroundColor: sideColor }}
						/>
						<span className="truncate">{item.player?.teamName ?? "-"}</span>
					</div>
				</div>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-2 text-xs">
				<div className="rounded-md bg-muted/45 px-2 py-1.5">
					<span className="block text-muted-foreground">Principal</span>
					<span className="font-semibold text-foreground">{item.primary}</span>
				</div>
				<div className="rounded-md bg-muted/45 px-2 py-1.5">
					<span className="block text-muted-foreground">Apoyo</span>
					<span className="font-semibold text-foreground">{item.secondary}</span>
				</div>
			</div>
		</article>
	);
}

function ShotMapPanel({
	shots,
	selectedShot,
	selectedShotId,
	onSelectShot,
	game,
	homeTeamId,
	awayTeamId,
}: {
	shots: ShotEvent[];
	selectedShot: ShotEvent | null;
	selectedShotId: string | null;
	onSelectShot: (shotId: string) => void;
	game: Game | null;
	homeTeamId: string;
	awayTeamId: string;
}) {
	return (
		<section className="rounded-md border bg-background shadow-sm">
			<header className="flex items-center justify-between gap-3 border-b px-4 py-3">
				<div className="flex min-w-0 items-center gap-2">
					<Crosshair className="size-4 shrink-0" />
					<h2 className="truncate text-sm font-semibold text-foreground">
						Mapa de tiros
					</h2>
				</div>
				<span className="text-xs font-semibold tabular-nums text-muted-foreground">
					{shots.length}
				</span>
			</header>

			<div className="p-3">
				<div className="h-[18rem] overflow-hidden rounded-md border bg-emerald-900">
					{shots.length > 0 ? (
						<svg
							viewBox="0 0 155 200"
							role="img"
							aria-label="Mapa de tiros a media cancha"
							className="h-full w-full"
						>
							<rect x="0" y="0" width="155" height="200" className="fill-emerald-800" />
							<rect x="5" y="5" width="145" height="190" className="fill-emerald-700/40" />
							<g
								fill="none"
								stroke="rgba(255,255,255,0.78)"
								strokeWidth="1"
							>
								<rect x="5" y="5" width="145" height="190" />
								<line x1="5" y1="5" x2="5" y2="195" />
								<path d="M 5 74.9 A 25.1 25.1 0 0 1 5 125.1" />
								<circle cx="5" cy="100" r="1.2" fill="rgba(255,255,255,0.78)" />
								<rect x="103.9" y="43" width="46.1" height="114" />
								<rect x="134.9" y="71.5" width="15.1" height="57" />
								<circle cx="115.2" cy="100" r="1.2" fill="rgba(255,255,255,0.78)" />
								<path d="M 103.9 82.9 A 25.1 25.1 0 0 0 103.9 117.1" />
								<rect x="150" y="88.5" width="3" height="23" />
							</g>

							{shots.map((shot, index) => {
								const { start, end } = getShotMapPoints(shot);
								const isSelected = selectedShotId === shot.id;
								const side = getTeamSideFromIds(shot.team_id, homeTeamId, awayTeamId);
								const color = side ? TEAM_COLORS[side] : "#f8fafc";
								const outcomeLabel = getOutcomeLabel(shot.type_id, shot.outcome);

								return (
									<g
										key={shot.id}
										role="button"
										tabIndex={0}
										aria-label={`${outcomeLabel}, ${formatPlayerLabel(shot)}, ${formatEventTime(
											shot.min,
											shot.sec,
										)}`}
										className="cursor-pointer focus:outline-none"
										onClick={() => onSelectShot(shot.id)}
										onKeyDown={(keyboardEvent) => {
											if (
												keyboardEvent.key === "Enter" ||
												keyboardEvent.key === " "
											) {
												keyboardEvent.preventDefault();
												onSelectShot(shot.id);
											}
										}}
									>
										<title>
											{index + 1}. {outcomeLabel} · {formatPlayerLabel(shot)}
										</title>
										{isSelected ? (
											<line
												x1={start.x}
												y1={start.y}
												x2={end.x}
												y2={end.y}
												stroke="#f8fafc"
												strokeWidth="2.2"
												strokeOpacity="0.75"
											/>
										) : null}
										<ShotFigure
											x1={start.x}
											y1={start.y}
											x2={end.x}
											y2={end.y}
											sequence={index + 1}
											markerLabel={shot.player?.dorsal ?? String(index + 1)}
											markerScale={0.72}
											outcome={getShotFigureOutcome(shot)}
											color={color}
										/>
										<circle
											cx={start.x}
											cy={start.y}
											r={isSelected ? 8 : 6.5}
											fill="transparent"
											stroke={isSelected ? "#f8fafc" : "transparent"}
											strokeWidth="1.2"
										/>
									</g>
								);
							})}
						</svg>
					) : (
						<div className="flex h-full items-center justify-center px-4 text-center text-sm text-emerald-50/80">
							Sin tiros registrados
						</div>
					)}
				</div>

				{selectedShot ? (
					<div className="mt-3 rounded-md border bg-muted/25 p-3">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<div className="truncate text-sm font-semibold text-foreground">
									{formatPlayerLabel(selectedShot)}
								</div>
								<div className="mt-1 truncate text-xs text-muted-foreground">
									{getTeamName(game, selectedShot.team_id)}
								</div>
							</div>
							<Badge variant="secondary" className="rounded-md">
								{getOutcomeLabel(selectedShot.type_id, selectedShot.outcome)}
							</Badge>
						</div>

						<div className="mt-3 grid grid-cols-2 gap-2 text-xs">
							<div>
								<span className="block text-muted-foreground">Tiempo</span>
								<span className="font-semibold tabular-nums text-foreground">
									{formatEventTime(selectedShot.min, selectedShot.sec)}
								</span>
							</div>
							<div>
								<span className="block text-muted-foreground">Zona</span>
								<span className="font-semibold text-foreground">
									{selectedShot.shot_zone ?? "-"}
								</span>
							</div>
							<div>
								<span className="block text-muted-foreground">Origen</span>
								<span className="font-semibold tabular-nums text-foreground">
									{selectedShot.x?.toFixed(1) ?? "-"} / {selectedShot.y?.toFixed(1) ?? "-"}
								</span>
							</div>
							<div>
								<span className="block text-muted-foreground">Portería</span>
								<span className="font-semibold tabular-nums text-foreground">
									{selectedShot.goal_mouth_y?.toFixed(1) ?? "-"} / {selectedShot.goal_mouth_z?.toFixed(1) ?? "-"}
								</span>
							</div>
						</div>

						<div className="mt-3 flex flex-wrap gap-1.5">
							{getShotTags(selectedShot).map((tag) => (
								<Badge key={tag} variant="outline" className="rounded-md">
									{tag}
								</Badge>
							))}
						</div>
					</div>
				) : null}
			</div>
		</section>
	);
}

export default function StatsPage() {
	const game = useGameStore((state) => state.game);
	const statsData = useStatsStore((state) => state.data);
	const events = useEventsStore((state) => state.events);
	const wsStatus = useWebsocketStore((state) => state.status);
	const [selectedTimelineMetricId, setSelectedTimelineMetricId] = useState(
		DEFAULT_TIMELINE_METRIC.id,
	);
	const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
	const timelineMetricOptions = useMemo(
		() => getTimelineMetricOptions(statsData?.timeline),
		[statsData?.timeline],
	);
	const shotEvents = useMemo(
		() => sortEventsByTime(events.filter(isShotEvent)),
		[events],
	);
	const keyPlayers = useMemo(() => getKeyPlayers(events, game), [events, game]);

	const isWaitingForStats =
		!statsData && (wsStatus === "connecting" || wsStatus === "connected");

	if (!statsData) {
		return (
			<div className="flex min-h-full items-center justify-center p-6">
				<Alert className="max-w-xl">
					{isWaitingForStats ? (
						<Spinner className="size-5" />
					) : (
						<WifiOff className="size-5" />
					)}
					<AlertTitle>
						{isWaitingForStats
							? "Cargando estadísticas"
							: "Sin estadísticas disponibles"}
					</AlertTitle>
					<AlertDescription>
						{isWaitingForStats
							? "Esperando el primer mensaje de estadísticas del partido."
							: "Todavía no ha llegado ningún snapshot o actualización de stats para este partido."}
					</AlertDescription>
				</Alert>
			</div>
		);
	}

	const { current, timeline } = statsData;
	const homeTeamName = current.home.teamName || game?.home_team.team_name || "Local";
	const awayTeamName = current.away.teamName || game?.away_team.team_name || "Visitante";
	const selectedTimelineMetric =
		timelineMetricOptions.find((option) => option.id === selectedTimelineMetricId) ??
		timelineMetricOptions.find((option) => option.id === DEFAULT_TIMELINE_METRIC.id) ??
		timelineMetricOptions[0] ??
		DEFAULT_TIMELINE_METRIC;
	const selectedShot =
		shotEvents.find((shot) => shot.id === selectedShotId) ?? shotEvents[0] ?? null;
	const eventMarkers = getStatsEventMarkers(events);

	return (
		<div className="mx-auto flex w-full max-w-[112rem] flex-col gap-3 p-3 lg:p-4">
			<header className="rounded-md border bg-background px-3 py-2 shadow-sm">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-3">
						<span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
							<Activity className="size-4" />
						</span>
						<div className="min-w-0">
							<div className="text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
								Estadísticas del partido
							</div>
							<h1 className="truncate text-base font-semibold text-foreground">
								{homeTeamName} vs {awayTeamName}
							</h1>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-2 text-xs">
						<span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1">
							<span
								className="size-2 rounded-full"
								style={{ backgroundColor: TEAM_COLORS.home }}
							/>
							<span className="max-w-36 truncate">{homeTeamName}</span>
						</span>
						<span className="inline-flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1">
							<span
								className="size-2 rounded-full"
								style={{ backgroundColor: TEAM_COLORS.away }}
							/>
							<span className="max-w-36 truncate">{awayTeamName}</span>
						</span>
						<Badge variant="outline" className="gap-1.5 rounded-md">
							<Clock className="size-3.5" />
							{formatMinute(current.minute)}
						</Badge>
						<Badge variant="outline" className="rounded-md">
							{formatTimestamp(current.timestamp)}
						</Badge>
						<Badge variant="secondary" className="rounded-md">
							{timeline.buckets.length} buckets · {timeline.intervalMinutes}'
						</Badge>
					</div>
				</div>
			</header>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.78fr)_minmax(19rem,0.82fr)] xl:items-start">
				<div className="flex min-w-0 flex-col gap-4">
					<StatsMomentumLineChart
						timeline={timeline}
						momentum={statsData.momentum}
						homeTeamName={homeTeamName}
						awayTeamName={awayTeamName}
						events={eventMarkers}
					/>

					<StatsPossessionLineChart
						timeline={timeline}
						homeTeamName={homeTeamName}
						awayTeamName={awayTeamName}
						events={eventMarkers}
						metric={selectedTimelineMetric}
						metricOptions={timelineMetricOptions}
						selectedMetricId={selectedTimelineMetric.id}
						onMetricChange={setSelectedTimelineMetricId}
					/>
				</div>

				<StatsSummaryBars
					home={current.home}
					away={current.away}
					homeTeamName={homeTeamName}
					awayTeamName={awayTeamName}
					className="h-full"
				/>

				<aside className="flex min-w-0 flex-col gap-4 xl:row-span-2">
					<section className="flex flex-col gap-3">
						<div className="flex items-center gap-2 px-1 text-sm font-semibold text-foreground">
							<Activity className="size-4" />
							Jugadores clave
						</div>
						{keyPlayers.map((item) => (
							<KeyPlayerCard key={item.role} item={item} />
						))}
					</section>

					<ShotMapPanel
						shots={shotEvents}
						selectedShot={selectedShot}
						selectedShotId={selectedShot?.id ?? null}
						onSelectShot={setSelectedShotId}
						game={game}
						homeTeamId={current.home.teamId}
						awayTeamId={current.away.teamId}
					/>
				</aside>

				<section className="min-w-0 xl:col-span-2">
					<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
						<BarChart3 className="size-4" />
						Detalle por grupos
					</div>

					<div className="grid gap-4 lg:grid-cols-2 lg:items-start">
						<div className="flex flex-col gap-4">
							{LEFT_STAT_GROUP_SECTIONS.map((section) => (
								<StatsComparisonBars
									key={section.group}
									group={section.group}
									title={section.title}
									icon={section.icon}
									home={current.home}
									away={current.away}
									metrics={section.metrics}
								/>
							))}
						</div>

						<div className="flex flex-col gap-4">
							{RIGHT_STAT_GROUP_SECTIONS.map((section) => (
								<StatsComparisonBars
									key={section.group}
									group={section.group}
									title={section.title}
									icon={section.icon}
									home={current.home}
									away={current.away}
									metrics={section.metrics}
								/>
							))}
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
