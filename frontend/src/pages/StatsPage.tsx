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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import StatsComparisonBars, {
	formatPercentValue,
	type StatMetricConfig,
} from "@/components/stats/StatsComparisonBars";
import StatsPossessionLineChart from "@/components/stats/StatsPossessionLineChart";
import useGameStore from "@/store/gameStore";
import useStatsStore from "@/store/statsStore";
import useWebsocketStore from "@/store/websocketStore";
import type { StatGroupName } from "@/types/stats";

interface StatGroupSection {
	group: StatGroupName;
	title: string;
	icon: LucideIcon;
	metrics: StatMetricConfig[];
}

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
			{ key: "successful_final_third_passes", label: "Pases último tercio acertados" },
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

const LEFT_STAT_GROUP_SECTIONS = STAT_GROUP_SECTIONS.filter(
	(_, index) => index % 2 === 0,
);
const RIGHT_STAT_GROUP_SECTIONS = STAT_GROUP_SECTIONS.filter(
	(_, index) => index % 2 === 1,
);

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

export default function StatsPage() {
	const game = useGameStore((state) => state.game);
	const statsData = useStatsStore((state) => state.data);
	const wsStatus = useWebsocketStore((state) => state.status);

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

	return (
		<div className="mx-auto flex w-full max-w-[96rem] flex-col gap-4 p-4 lg:p-6">
			<header className="rounded-md border bg-background px-4 py-4 shadow-sm">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div>
						<div className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
							<Activity className="size-3.5" />
							Estadísticas del partido
						</div>
						<h1 className="mt-2 text-xl font-semibold text-foreground">
							{homeTeamName} vs {awayTeamName}
						</h1>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="outline" className="gap-1.5 rounded-md">
							<Clock className="size-3.5" />
							{formatMinute(current.minute)}
						</Badge>
						<Badge variant="outline" className="rounded-md">
							Actualizado {formatTimestamp(current.timestamp)}
						</Badge>
						<Badge variant="secondary" className="rounded-md">
							{timeline.buckets.length} buckets
						</Badge>
					</div>
				</div>

				<div className="mt-4 grid gap-3 md:grid-cols-2">
					<div className="rounded-md border bg-blue-50/70 px-3 py-2 text-sm dark:bg-blue-950/30">
						<div className="flex items-center gap-2 font-semibold text-blue-700 dark:text-blue-300">
							<span className="size-2 rounded-full bg-blue-500" />
							{homeTeamName}
						</div>
					</div>
					<div className="rounded-md border bg-rose-50/70 px-3 py-2 text-sm dark:bg-rose-950/30">
						<div className="flex items-center gap-2 font-semibold text-rose-700 dark:text-rose-300">
							<span className="size-2 rounded-full bg-rose-500" />
							{awayTeamName}
						</div>
					</div>
				</div>
			</header>

			<StatsPossessionLineChart
				timeline={timeline}
				homeTeamName={homeTeamName}
				awayTeamName={awayTeamName}
			/>

			<section className="flex flex-col gap-4">
				<div className="xl:col-span-2">
					<div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
						<BarChart3 className="size-4" />
						Barras contrapuestas por grupo
					</div>
				</div>

				<div className="grid gap-4 xl:grid-cols-2 xl:items-start">
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
	);
}
