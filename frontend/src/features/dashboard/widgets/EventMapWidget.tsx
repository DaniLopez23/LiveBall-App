import EventsPitch from "@/components/pitch/eventsPitch/EventsPitch";
import type { EventsMode } from "@/components/pitch/eventsPitch/EventsPitchFilters";
import { Badge } from "@/components/ui/badge";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import { isPitchEvent, type PitchEvent } from "@/types/event";
import {
	PITCH_EVENT_TYPES_CONFIG,
	type PitchEventType,
} from "@/types/outcomeOptions";
import type {
	WidgetComponentProps,
	WidgetPanelProps,
} from "@/features/dashboard/types/dashboard.types";
import {
	MinuteRangeField,
	SelectField,
	SectionTitle,
} from "@/features/dashboard/widgets/widgetControls";

export type EventMapConfig = {
	mode: EventsMode;
};

export type EventMapFilters = {
	team: "home" | "away" | "both";
	playerId: string;
	eventType: PitchEventType | "all";
	minuteRange: [number, number];
};

export const DEFAULT_EVENT_MAP_CONFIG: EventMapConfig = {
	mode: "all",
};

export const DEFAULT_EVENT_MAP_FILTERS: EventMapFilters = {
	team: "both",
	playerId: "all",
	eventType: "all",
	minuteRange: [0, 90],
};

const EVENT_MODE_OPTIONS = [
	{ value: "live", label: "Live" },
	{ value: "sequences", label: "Secuencia" },
	{ value: "all", label: "Todo" },
];

function getMaxMinute(events: PitchEvent[]) {
	return events.reduce((maxMinute, event) => Math.max(maxMinute, event.min ?? 0), 90);
}

function getPlayerName(event: PitchEvent) {
	const dorsal = event.player?.dorsal?.trim();
	const name = event.player?.name?.trim();

	if (dorsal && name) return `${dorsal} - ${name}`;
	if (name) return name;
	if (dorsal) return dorsal;
	return event.player_id ? `Jugador ${event.player_id}` : "Jugador sin identificar";
}

function filterPitchEvents(
	events: PitchEvent[],
	filters: EventMapFilters,
	config: EventMapConfig,
	homeTeamId?: string,
	awayTeamId?: string,
) {
	let result = events;

	if (filters.team !== "both") {
		const teamId = filters.team === "home" ? homeTeamId : awayTeamId;
		if (teamId) {
			result = result.filter((event) => event.team_id === teamId);
		}
	}

	if (filters.playerId !== "all") {
		result = result.filter((event) => event.player_id === filters.playerId);
	}

	if (filters.eventType !== "all") {
		const typeIds =
			PITCH_EVENT_TYPES_CONFIG.find((item) => item.value === filters.eventType)?.typeIds ??
			[];
		result = result.filter((event) => typeIds.includes(event.type_id));
	}

	const [startMinute, endMinute] = filters.minuteRange;
	result = result.filter((event) => {
		const minute = event.min ?? 0;
		return minute >= startMinute && minute <= endMinute;
	});

	if (config.mode === "live") {
		return result.slice(-12);
	}

	return result;
}

export function EventMapWidget({
	config,
	filters,
}: WidgetComponentProps<EventMapConfig, EventMapFilters>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const pitchEvents = events.filter(isPitchEvent);
	const filteredEvents = filterPitchEvents(
		pitchEvents,
		filters,
		config,
		game?.home_team.team_id,
		game?.away_team.team_id,
	);
	const teamColors = game
		? {
				[game.home_team.team_id]: "#3b82f6",
				[game.away_team.team_id]: "#f43f5e",
			}
		: {};

	return (
		<div className="flex h-full min-h-0 flex-col gap-2">
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<Badge variant="outline" className="rounded-md">
					{filteredEvents.length} eventos
				</Badge>
				<Badge variant="secondary" className="rounded-md">
					{EVENT_MODE_OPTIONS.find((item) => item.value === config.mode)?.label}
				</Badge>
			</div>
			<div className="min-h-0 flex-1 overflow-hidden rounded-md bg-slate-100 p-2 dark:bg-slate-800">
				<EventsPitch
					events={filteredEvents}
					mode={config.mode}
					teamColors={teamColors}
					orientation="horizontal"
					showHeader={false}
					noDataMessage={filteredEvents.length === 0 ? "Sin eventos para los filtros" : undefined}
					game={game}
				/>
			</div>
		</div>
	);
}

export function EventMapWidgetConfig({
	value,
	onChange,
}: WidgetPanelProps<EventMapConfig>) {
	return (
		<div className="space-y-4">
			<SectionTitle>Visualizacion</SectionTitle>
			<SelectField
				label="Modo a mostrar"
				value={value.mode}
				onChange={(mode) => {
					if (mode === "live" || mode === "sequences" || mode === "all") {
						onChange({ ...value, mode });
					}
				}}
				options={EVENT_MODE_OPTIONS}
			/>
		</div>
	);
}

export function EventMapWidgetFilters({
	value,
	onChange,
}: WidgetPanelProps<EventMapFilters>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const pitchEvents = events.filter(isPitchEvent);
	const maxMinute = getMaxMinute(pitchEvents);
	const playersById = new Map<string, string>();

	for (const event of pitchEvents) {
		if (!event.player_id) continue;
		if (!playersById.has(event.player_id)) {
			playersById.set(event.player_id, getPlayerName(event));
		}
	}

	const playerOptions = [
		{ value: "all", label: "Todos" },
		...[...playersById.entries()]
			.sort(([, aName], [, bName]) => aName.localeCompare(bName, "es-ES"))
			.map(([playerId, label]) => ({ value: playerId, label })),
	];
	const eventTypeOptions = PITCH_EVENT_TYPES_CONFIG.map((item) => ({
		value: item.value,
		label: item.label,
	}));

	return (
		<div className="grid gap-3">
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
					label="Tipo de evento"
					value={value.eventType}
					onChange={(eventType) =>
						onChange({ ...value, eventType: eventType as PitchEventType | "all" })
					}
					options={eventTypeOptions}
				/>
			</div>
			<SelectField
				label="Jugador"
				value={value.playerId}
				onChange={(playerId) => onChange({ ...value, playerId })}
				options={playerOptions}
			/>
			<MinuteRangeField
				label="Rango de minutos"
				value={value.minuteRange}
				maxMinute={maxMinute}
				onChange={(minuteRange) => onChange({ ...value, minuteRange })}
			/>
		</div>
	);
}
