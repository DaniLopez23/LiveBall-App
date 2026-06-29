import {
	ArrowRight,
	CalendarDays,
	CheckCircle2,
	CircleAlert,
	CircleHelp,
	Clock3,
	LoaderCircle,
	MapPin,
	Radio,
	RefreshCw,
	Trophy,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import useMatchSelectionStore from "@/store/matchSelectionStore";
import type {
	AvailableMatch,
	AvailableMatchStatus,
} from "@/types/availableMatch";

const STATUS_LABELS: Record<AvailableMatchStatus, string> = {
	scheduled: "Próximo",
	live: "En directo",
	paused: "Pausa",
	finished: "Finalizado",
	postponed: "Aplazado",
	suspended: "Suspendido",
	cancelled: "Cancelado",
	abandoned: "Abandonado",
	unknown: "Estado desconocido",
};

type MatchStatusFilter = "all" | "live" | "finished";

const isLiveMatch = (match: AvailableMatch): boolean => {
	return match.status === "live" || match.status === "paused";
};

const isFinishedMatch = (match: AvailableMatch): boolean => {
	return match.status === "finished";
};

const statusBadgeClassName = (status: AvailableMatchStatus): string => {
	if (status === "live") {
		return "border-red-500 bg-red-500 text-white shadow-sm shadow-red-500/20";
	}
	if (status === "finished") {
		return "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";
	}
	if (status === "scheduled") {
		return "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300";
	}
	return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300";
};

const formatMatchDate = (rawDate?: string | null): string => {
	if (!rawDate) return "Fecha por confirmar";
	const date = new Date(rawDate);
	if (Number.isNaN(date.getTime())) return rawDate;
	return new Intl.DateTimeFormat("es-ES", {
		weekday: "short",
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(date);
};

const formatLastUpdatedTime = (timestamp: number): string => {
	return new Intl.DateTimeFormat("es-ES", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).format(new Date(timestamp));
};

function MatchStatusBadge({ status }: { status: AvailableMatchStatus }) {
	return (
		<Badge
			variant="outline"
			className={cn("gap-1.5 px-2.5 py-1 font-medium", statusBadgeClassName(status))}
		>
			{status === "live" ? (
				<Radio className="size-3.5" />
			) : status === "finished" ? (
				<CheckCircle2 className="size-3.5" />
			) : (
				<Clock3 className="size-3.5" />
			)}
			{STATUS_LABELS[status]}
		</Badge>
	);
}

function MatchCard({
	match,
	isSelected,
	onSelect,
}: {
	match: AvailableMatch;
	isSelected: boolean;
	onSelect: () => void;
}) {
	const showScore =
		match.status === "live" ||
		match.status === "paused" ||
		match.status === "finished";

	return (
		<Card
			aria-current={isSelected ? "true" : undefined}
			className={cn(
				"relative overflow-hidden transition-all duration-200",
				isSelected
					? "border-emerald-500 bg-emerald-50/50 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/25 dark:bg-emerald-950/15"
					: "hover:border-primary/40 hover:shadow-sm",
			)}
		>
			{isSelected ? (
				<div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
			) : null}

			{isSelected ? (
				<div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm dark:bg-emerald-950 dark:text-emerald-200">
					<span className="relative flex size-2.5">
						<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
						<span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
					</span>
					<CheckCircle2 className="size-3.5" />
					Seleccionado
				</div>
			) : null}

			<CardContent
				className={cn(
					"grid gap-5 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5",
					isSelected && "pt-12 sm:pt-5",
				)}
			>
				<div className="flex min-w-0 flex-col items-center gap-3">
					<div className="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
						<div className="truncate text-right text-base font-semibold sm:text-lg">
							{match.home_team.team_name}
						</div>
						<div
							className={cn(
								"min-w-20 rounded-lg border px-3 py-2 text-center text-lg font-bold tabular-nums",
								isSelected
									? "border-emerald-500/30 bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"
									: "bg-muted/60",
							)}
						>
							{showScore
								? `${match.home_team.score ?? 0} : ${match.away_team.score ?? 0}`
								: "VS"}
						</div>
						<div className="truncate text-base font-semibold sm:text-lg">
							{match.away_team.team_name}
						</div>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-center text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1">
							<Trophy className="size-3.5" />
							Jornada {match.matchday ?? "-"}
						</span>
						<span className="inline-flex items-center gap-1">
							<CalendarDays className="size-3.5" />
							{formatMatchDate(match.game_date)}
						</span>
						{match.venue ? (
							<span className="inline-flex items-center gap-1">
								<MapPin className="size-3.5" />
								{match.venue}
							</span>
						) : null}
					</div>

					<div className="flex flex-wrap items-center justify-center gap-2">
						<MatchStatusBadge status={match.status} />
					</div>
				</div>

				<Button
					variant={isSelected ? "default" : "outline"}
					onClick={onSelect}
					className={cn(
						"min-w-36 self-center sm:min-w-40",
						isSelected &&
							"border-emerald-600 bg-emerald-600 text-white shadow-sm shadow-emerald-500/20 hover:bg-emerald-700",
					)}
				>
					{isSelected ? <CheckCircle2 /> : null}
					{isSelected ? "Abrir partido" : "Seleccionar"}
					<ArrowRight />
				</Button>
			</CardContent>
		</Card>
	);
}

function MatchListSection({
	title,
	icon,
	matches,
	selectedGameId,
	onSelect,
	className,
}: {
	title: string;
	icon: React.ReactNode;
	matches: AvailableMatch[];
	selectedGameId: string | null;
	onSelect: (gameId: string) => void;
	className?: string;
}) {
	return (
		<section className={cn("flex flex-col gap-3", className)} aria-label={title}>
			<div className="flex items-center gap-2">
				<span className="text-muted-foreground">{icon}</span>
				<h3 className="text-sm font-semibold uppercase text-muted-foreground">
					{title}
				</h3>
				<Badge variant="secondary" className="tabular-nums">
					{matches.length}
				</Badge>
			</div>
			<div className="flex flex-col gap-3">
				{matches.map((match) => (
					<MatchCard
						key={match.game_id}
						match={match}
						isSelected={match.game_id === selectedGameId}
						onSelect={() => onSelect(match.game_id)}
					/>
				))}
			</div>
		</section>
	);
}

function MatchHelpDialog() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon-sm"
					className="rounded-full border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15"
					aria-label="Ayuda sobre selección de partido"
				>
					<CircleHelp className="size-4" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Selecciona un partido</DialogTitle>
					<DialogDescription>
						Para ver el dashboard, stats, eventos y pass network, primero tienes
						que elegir uno de los partidos disponibles. Al seleccionarlo, LiveBall
						se conectará a la sala WebSocket de ese partido y mostrará únicamente
						su información.
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}

export default function HomePage() {
	const navigate = useNavigate();
	const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>("all");
	const matches = useMatchSelectionStore((state) => state.matches);
	const selectedGameId = useMatchSelectionStore((state) => state.selectedGameId);
	const loadStatus = useMatchSelectionStore((state) => state.loadStatus);
	const isRefreshing = useMatchSelectionStore((state) => state.isRefreshing);
	const lastUpdatedAt = useMatchSelectionStore(
		(state) => state.lastUpdatedAt,
	);
	const error = useMatchSelectionStore((state) => state.error);
	const loadAvailableMatches = useMatchSelectionStore(
		(state) => state.loadAvailableMatches,
	);
	const selectMatch = useMatchSelectionStore((state) => state.selectMatch);

	const handleSelect = (gameId: string) => {
		selectMatch(gameId);
		navigate("/dashboard");
	};

	const handleStatusFilterChange = (value: string) => {
		if (value === "all" || value === "live" || value === "finished") {
			setStatusFilter(value);
		}
	};

	const liveMatches = matches.filter(isLiveMatch);
	const finishedMatches = matches.filter(isFinishedMatch);
	const otherMatches = matches.filter(
		(match) => !isLiveMatch(match) && !isFinishedMatch(match),
	);
	const hasVisibleMatches =
		(statusFilter === "all" && matches.length > 0) ||
		(statusFilter === "live" && liveMatches.length > 0) ||
		(statusFilter === "finished" && finishedMatches.length > 0);

	return (
		<div className="flex w-full flex-col gap-6">
			<Card className="relative w-full overflow-hidden rounded-none border-x-0 border-t-0 border-primary/10 bg-gradient-to-br from-background via-muted/60 to-primary/10 shadow-sm">
				<div className="pointer-events-none absolute -left-24 top-8 size-56 rounded-full bg-primary/20 blur-3xl" />
				<div className="pointer-events-none absolute -right-20 bottom-0 size-52 rounded-full bg-emerald-400/20 blur-3xl" />
				<CardContent className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-8 text-center sm:px-6 sm:py-10 lg:px-8">
					<div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-7 sm:text-left">
						<div className="rounded-[1.75rem] border bg-background/80 p-3 shadow-xl shadow-primary/10 backdrop-blur">
							<img
								src="/app_logo.PNG"
								alt="LiveBall"
								className="h-20 w-auto sm:h-24"
							/>
						</div>
						<div className="flex max-w-2xl flex-col items-center gap-2 sm:items-start">
							<div className="bg-gradient-to-r from-slate-950 via-emerald-700 to-sky-500 bg-clip-text text-4xl font-black tracking-tight text-transparent dark:from-white dark:via-emerald-200 dark:to-cyan-300 sm:text-6xl">
								LiveBall
							</div>
							<h1 className="bg-gradient-to-r from-slate-950 via-emerald-700 to-sky-500 bg-clip-text text-base font-bold tracking-tight text-transparent dark:from-white dark:via-emerald-200 dark:to-cyan-300 sm:text-xl">
								Análisis y visualizacion de datos de partidos en vivo a otro nivel
							</h1>
						</div>
					</div>
				</CardContent>
			</Card>

			<section className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex items-center gap-2">
						<h2 className="text-lg font-semibold">
							Partidos disponibles
							{loadStatus === "loaded" ? ` (${matches.length})` : ""}
						</h2>
						<MatchHelpDialog />
					</div>
					<div className="flex flex-wrap items-center gap-2 sm:justify-end">
						<div className="flex flex-col text-xs text-muted-foreground sm:items-end">
							{loadStatus === "loaded" && matches[0] ? (
								<span>
									{matches[0]?.competition_name} · {matches[0]?.season_name}
								</span>
							) : null}
							{lastUpdatedAt ? (
								<time dateTime={new Date(lastUpdatedAt).toISOString()}>
									Actualizado a las {formatLastUpdatedTime(lastUpdatedAt)}
								</time>
							) : null}
						</div>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={loadStatus === "loading" || isRefreshing}
							onClick={() => void loadAvailableMatches(true)}
						>
							<RefreshCw className={cn(isRefreshing && "animate-spin")} />
							{isRefreshing ? "Actualizando..." : "Actualizar estados"}
						</Button>
					</div>
				</div>

				{loadStatus === "loaded" && matches.length > 0 ? (
					<div className="flex flex-col gap-3 border-y border-border/70 py-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-sm font-medium">Filtrar partidos</p>
							<p className="text-xs text-muted-foreground">
								Organiza la lista por el estado actual del encuentro.
							</p>
						</div>
						<Tabs
							value={statusFilter}
							onValueChange={handleStatusFilterChange}
							className="min-w-0"
						>
							<TabsList
								aria-label="Filtrar partidos por estado"
								className="w-full sm:w-auto"
							>
								<TabsTrigger value="all" className="min-w-0 px-2 text-xs sm:min-w-20 sm:text-sm">
									Todos
									<span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
										{matches.length}
									</span>
								</TabsTrigger>
								<TabsTrigger
									value="live"
									aria-label="Mostrar partidos en directo"
									className="min-w-0 px-2 text-xs sm:min-w-24 sm:text-sm"
								>
									<Radio className="size-3.5 text-red-500" />
									<span className="sm:hidden">En vivo</span>
									<span className="hidden sm:inline">En directo</span>
									<span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
										{liveMatches.length}
									</span>
								</TabsTrigger>
								<TabsTrigger
									value="finished"
									aria-label="Mostrar partidos finalizados"
									className="min-w-0 px-2 text-xs sm:min-w-24 sm:text-sm"
								>
									<CheckCircle2 className="size-3.5 text-slate-500" />
									<span className="sm:hidden">Final</span>
									<span className="hidden sm:inline">Finalizados</span>
									<span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
										{finishedMatches.length}
									</span>
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				) : null}

				{loadStatus === "loading" || loadStatus === "idle" ? (
					<div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
						<LoaderCircle className="size-4 animate-spin" />
						Cargando partidos disponibles...
					</div>
				) : null}

				{loadStatus === "error" ? (
					<Alert variant="destructive">
						<CircleAlert />
						<AlertTitle>Partidos no disponibles todavía</AlertTitle>
						<AlertDescription className="flex flex-col items-start gap-3">
							<span>{error}</span>
							<span>LiveBall volverá a intentarlo automáticamente.</span>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => void loadAvailableMatches(true)}
							>
								<RefreshCw />
								Reintentar ahora
							</Button>
						</AlertDescription>
					</Alert>
				) : null}

				{loadStatus === "loaded" && error ? (
					<Alert variant="destructive">
						<CircleAlert />
						<AlertTitle>No se pudieron actualizar los estados</AlertTitle>
						<AlertDescription>
							{error} Se mantiene la última lista de partidos disponible.
						</AlertDescription>
					</Alert>
				) : null}

				{loadStatus === "loaded" && matches.length === 0 && !isRefreshing ? (
					<Card>
						<CardContent className="p-6 text-sm text-muted-foreground">
							El feed F42 no contiene ningún MatchData disponible.
						</CardContent>
					</Card>
				) : null}

				{loadStatus === "loaded" && matches.length > 0 && hasVisibleMatches ? (
					<div className="flex flex-col gap-7">
						{(statusFilter === "all" || statusFilter === "live") &&
						liveMatches.length > 0 ? (
							<MatchListSection
								title="Partidos en directo"
								icon={<Radio className="size-4 text-red-500" />}
								matches={liveMatches}
								selectedGameId={selectedGameId}
								onSelect={handleSelect}
							/>
						) : null}

						{(statusFilter === "all" || statusFilter === "finished") &&
						finishedMatches.length > 0 ? (
							<MatchListSection
								title="Partidos finalizados"
								icon={<CheckCircle2 className="size-4 text-slate-500" />}
								matches={finishedMatches}
								selectedGameId={selectedGameId}
								onSelect={handleSelect}
								className="border-t border-border/70 pt-6"
							/>
						) : null}

						{statusFilter === "all" && otherMatches.length > 0 ? (
							<MatchListSection
								title="Próximos y otros estados"
								icon={<Clock3 className="size-4" />}
								matches={otherMatches}
								selectedGameId={selectedGameId}
								onSelect={handleSelect}
								className="border-t border-border/70 pt-6"
							/>
						) : null}
					</div>
				) : null}

				{loadStatus === "loaded" && matches.length > 0 && !hasVisibleMatches ? (
					<div className="border border-dashed p-6 text-center text-sm text-muted-foreground">
						No hay partidos {statusFilter === "live" ? "en directo" : "finalizados"}.
					</div>
				) : null}
			</section>
		</div>
	);
}
