import { useMemo, useState } from "react";
import { Crosshair } from "lucide-react";

import MapShotPitch, { GoalShotMap } from "@/components/pitch/MapShotPitch";
import {
	formatEventTime,
	formatPlayerLabel,
	getOutcomeLabel,
	getTeamName,
} from "@/components/pitch/eventsPitch/eventDisplay";
import { Badge } from "@/components/ui/badge";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import { isShotEvent, type ShotEvent } from "@/types/event";
import type { TeamSide } from "@/types/stats";
import type {
	WidgetComponentProps,
	WidgetPanelProps,
} from "@/features/dashboard/types/dashboard.types";
import {
	CheckboxList,
	MinuteRangeField,
	SelectField,
	SectionTitle,
} from "@/features/dashboard/widgets/widgetControls";

type ShotMapViewMode = "both" | "field" | "goal";
type ShotMapOutcome = "miss" | "post" | "saved" | "goal";

export type ShotMapConfig = {
	viewMode: ShotMapViewMode;
};

export type ShotMapFilters = {
	team: "home" | "away" | "both";
	playerId: string;
	outcomes: ShotMapOutcome[];
	minuteRange: [number, number];
};

export const DEFAULT_SHOT_MAP_CONFIG: ShotMapConfig = {
	viewMode: "both",
};

export const DEFAULT_SHOT_MAP_FILTERS: ShotMapFilters = {
	team: "both",
	playerId: "all",
	outcomes: ["miss", "post", "saved", "goal"],
	minuteRange: [0, 90],
};

const UNKNOWN_PLAYER_ID = "__unknown_player__";
const TEAM_COLORS: Record<TeamSide, string> = {
	home: "#3b82f6",
	away: "#f43f5e",
};
const SHOT_OUTCOME_OPTIONS: Array<{ value: ShotMapOutcome; label: string }> = [
	{ value: "miss", label: "Fallo" },
	{ value: "post", label: "Poste" },
	{ value: "saved", label: "Disparo parado" },
	{ value: "goal", label: "Gol" },
];
const VIEW_MODE_OPTIONS = [
	{ value: "both", label: "2D y campo" },
	{ value: "field", label: "Solo campo" },
	{ value: "goal", label: "Solo porteria 2D" },
];

function normalizeShotMapFilters(filters: Partial<ShotMapFilters>): ShotMapFilters {
	return {
		...DEFAULT_SHOT_MAP_FILTERS,
		...filters,
		outcomes: filters.outcomes ?? DEFAULT_SHOT_MAP_FILTERS.outcomes,
		minuteRange: filters.minuteRange ?? DEFAULT_SHOT_MAP_FILTERS.minuteRange,
	};
}

function getShotOutcome(shot: ShotEvent): ShotMapOutcome {
	if (shot.type_id === "16" || shot.outcome === "Goal") return "goal";
	if (shot.type_id === "15" || shot.outcome === "Attempt Saved") return "saved";
	if (shot.type_id === "14" || shot.outcome === "Post") return "post";
	return "miss";
}

function getShotPlayerId(shot: ShotEvent): string {
	return shot.player_id ?? shot.player?.id ?? UNKNOWN_PLAYER_ID;
}

function getMaxMinute(shots: ShotEvent[]) {
	return shots.reduce((maxMinute, shot) => Math.max(maxMinute, shot.min ?? 0), 0);
}

function clampMinuteRange(
	minuteRange: [number, number],
	maxMinute: number,
): [number, number] {
	const boundedMaxMinute = Math.max(0, Math.floor(maxMinute));
	const start = Math.min(Math.max(0, minuteRange[0]), boundedMaxMinute);
	const end = Math.max(start, Math.min(Math.max(0, minuteRange[1]), boundedMaxMinute));
	return [start, end];
}

function sortShotsByTime(shots: ShotEvent[]) {
	return [...shots].sort((a, b) => {
		const aValue = (a.period_id ?? 0) * 10_000 + (a.min ?? 0) * 60 + (a.sec ?? 0);
		const bValue = (b.period_id ?? 0) * 10_000 + (b.min ?? 0) * 60 + (b.sec ?? 0);

		if (aValue !== bValue) return aValue - bValue;
		return String(a.event_id ?? a.id).localeCompare(String(b.event_id ?? b.id));
	});
}

function filterShots(
	shots: ShotEvent[],
	filters: ShotMapFilters,
	maxMinute: number,
	homeTeamId?: string,
	awayTeamId?: string,
) {
	const [startMinute, endMinute] = clampMinuteRange(filters.minuteRange, maxMinute);
	const teamId =
		filters.team === "home" ? homeTeamId : filters.team === "away" ? awayTeamId : undefined;

	return sortShotsByTime(
		shots.filter((shot) => {
			const minute = shot.min ?? 0;
			if (minute < startMinute || minute > endMinute) return false;
			if (teamId && shot.team_id !== teamId) return false;
			if (filters.playerId !== "all" && getShotPlayerId(shot) !== filters.playerId) {
				return false;
			}
			return filters.outcomes.includes(getShotOutcome(shot));
		}),
	);
}

function getPlayerOptions(shots: ShotEvent[]) {
	const players = new Map<string, string>();

	for (const shot of shots) {
		const playerId = getShotPlayerId(shot);
		if (!players.has(playerId)) {
			players.set(
				playerId,
				playerId === UNKNOWN_PLAYER_ID ? "Jugador sin identificar" : formatPlayerLabel(shot),
			);
		}
	}

	return [
		{ value: "all", label: "Todos" },
		...[...players.entries()]
			.sort(([, left], [, right]) => left.localeCompare(right, "es-ES"))
			.map(([value, label]) => ({ value, label })),
	];
}

function EmptyShotMapState({ message }: { message: string }) {
	return (
		<div className="flex h-full min-h-[10rem] items-center justify-center rounded-md border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground">
			{message}
		</div>
	);
}

function ShotMapSurface({
	type,
	shots,
	selectedShotId,
	homeTeamId,
	awayTeamId,
	onSelectShot,
}: {
	type: "field" | "goal";
	shots: ShotEvent[];
	selectedShotId: string | null;
	homeTeamId: string;
	awayTeamId: string;
	onSelectShot: (shotId: string) => void;
}) {
	return (
		<div className="min-h-0 overflow-hidden rounded-md border bg-emerald-950">
			{shots.length > 0 ? (
				type === "field" ? (
					<MapShotPitch
						shots={shots}
						selectedShotId={selectedShotId}
						homeTeamId={homeTeamId}
						awayTeamId={awayTeamId}
						onSelectShot={onSelectShot}
						teamColors={TEAM_COLORS}
					/>
				) : (
					<GoalShotMap
						shots={shots}
						selectedShotId={selectedShotId}
						homeTeamId={homeTeamId}
						awayTeamId={awayTeamId}
						onSelectShot={onSelectShot}
						teamColors={TEAM_COLORS}
					/>
				)
			) : (
				<EmptyShotMapState message="Sin tiros para los filtros" />
			)}
		</div>
	);
}

export function ShotMapWidget({
	config,
	filters,
}: WidgetComponentProps<ShotMapConfig, ShotMapFilters>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
	const shots = useMemo(() => events.filter(isShotEvent), [events]);
	const normalizedFilters = normalizeShotMapFilters(filters);
	const maxMinute = getMaxMinute(shots);
	const filteredShots = filterShots(
		shots,
		normalizedFilters,
		maxMinute,
		game?.home_team.team_id,
		game?.away_team.team_id,
	);
	const selectedShot =
		filteredShots.find((shot) => shot.id === selectedShotId) ?? filteredShots[0] ?? null;
	const activeShotId = selectedShot?.id ?? null;
	const homeTeamId = game?.home_team.team_id ?? "";
	const awayTeamId = game?.away_team.team_id ?? "";
	const showField = config.viewMode === "both" || config.viewMode === "field";
	const showGoal = config.viewMode === "both" || config.viewMode === "goal";

	if (!game) {
		return <EmptyShotMapState message="Sin partido cargado para pintar el mapa de tiros." />;
	}

	return (
		<div className="flex h-full min-h-0 flex-col gap-2">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<Crosshair className="size-4 shrink-0 text-muted-foreground" />
					<span className="truncate text-xs font-semibold text-muted-foreground">
						Mapa de tiros
					</span>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Badge variant="outline" className="rounded-md">
						{filteredShots.length} tiros
					</Badge>
					<Badge variant="secondary" className="rounded-md">
						{VIEW_MODE_OPTIONS.find((option) => option.value === config.viewMode)?.label}
					</Badge>
				</div>
			</div>

			<div
				className={
					config.viewMode === "both"
						? "grid min-h-0 flex-1 grid-rows-[minmax(0,0.78fr)_minmax(0,1.22fr)] gap-2"
						: "grid min-h-0 flex-1 gap-2"
				}
			>
				{showGoal ? (
					<ShotMapSurface
						type="goal"
						shots={filteredShots}
						selectedShotId={activeShotId}
						homeTeamId={homeTeamId}
						awayTeamId={awayTeamId}
						onSelectShot={setSelectedShotId}
					/>
				) : null}
				{showField ? (
					<ShotMapSurface
						type="field"
						shots={filteredShots}
						selectedShotId={activeShotId}
						homeTeamId={homeTeamId}
						awayTeamId={awayTeamId}
						onSelectShot={setSelectedShotId}
					/>
				) : null}
			</div>

			{selectedShot ? (
				<div className="rounded-md border bg-muted/25 px-3 py-2 text-xs">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="truncate font-semibold text-foreground">
								{formatPlayerLabel(selectedShot)}
							</p>
							<p className="mt-0.5 truncate text-muted-foreground">
								{getTeamName(game, selectedShot.team_id)} - {formatEventTime(selectedShot.min, selectedShot.sec)}
							</p>
						</div>
						<Badge variant="secondary" className="rounded-md">
							{getOutcomeLabel(selectedShot.type_id, selectedShot.outcome)}
						</Badge>
					</div>
				</div>
			) : null}
		</div>
	);
}

export function ShotMapWidgetConfig({
	value,
	onChange,
}: WidgetPanelProps<ShotMapConfig>) {
	return (
		<div className="grid gap-3">
			<SectionTitle>Vista</SectionTitle>
			<SelectField
				label="Mostrar"
				value={value.viewMode}
				onChange={(viewMode) => {
					if (viewMode === "both" || viewMode === "field" || viewMode === "goal") {
						onChange({ ...value, viewMode });
					}
				}}
				options={VIEW_MODE_OPTIONS}
			/>
		</div>
	);
}

export function ShotMapWidgetFilters({
	value,
	onChange,
}: WidgetPanelProps<ShotMapFilters>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const shots = useMemo(() => events.filter(isShotEvent), [events]);
	const filters = normalizeShotMapFilters(value);
	const maxMinute = getMaxMinute(shots);
	const playerOptions = useMemo(() => getPlayerOptions(shots), [shots]);

	return (
		<div className="grid gap-3">
			<div className="grid gap-3">
				<SelectField
					label="Equipo"
					value={filters.team}
					onChange={(team) => {
						if (team === "home" || team === "away" || team === "both") {
							onChange({ ...filters, team });
						}
					}}
					options={[
						{ value: "both", label: "Ambos" },
						{ value: "home", label: game?.home_team.team_name ?? "Local" },
						{ value: "away", label: game?.away_team.team_name ?? "Visitante" },
					]}
				/>
				<SelectField
					label="Jugador"
					value={filters.playerId}
					onChange={(playerId) => onChange({ ...filters, playerId })}
					options={playerOptions}
				/>
			</div>
			<SectionTitle>Resultado</SectionTitle>
			<CheckboxList
				options={SHOT_OUTCOME_OPTIONS}
				value={filters.outcomes}
				onChange={(outcomes) =>
					onChange({
						...filters,
						outcomes: outcomes as ShotMapOutcome[],
					})
				}
			/>
			<MinuteRangeField
				label="Rango de minutos"
				value={filters.minuteRange}
				maxMinute={maxMinute}
				onChange={(minuteRange) => onChange({ ...filters, minuteRange })}
			/>
		</div>
	);
}
