import EventsPitch from "@/components/pitch/eventsPitch/EventsPitch";
import type {
	EventsMode,
	SequencePassCountMode,
} from "@/components/pitch/eventsPitch/EventsPitchFilters";
import {
	buildEventSequences,
	EVENT_SEQUENCE_END_REASONS,
	type EventSequence,
	type EventSequenceEndReason,
} from "@/components/pitch/eventsPitch/eventSequences";
import { NumberInput } from "@/components/ui/number-input";
import { Badge } from "@/components/ui/badge";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import { isPitchEvent, type PitchEvent } from "@/types/event";
import {
	EVENT_SUBTYPE_OPTIONS_BY_TYPE,
	EVENT_SUBTYPE_OPTIONS_FLAT,
	OUTCOME_OPTIONS_BY_TYPE,
	PITCH_EVENT_TYPES_CONFIG,
	eventMatchesOutcome,
	eventMatchesSubtype,
	type PitchEventType,
} from "@/types/outcomeOptions";
import type {
	WidgetComponentProps,
	WidgetPanelProps,
} from "@/features/dashboard/types/dashboard.types";
import {
	CheckboxList,
	Field,
	MinuteRangeField,
	SelectField,
	SectionTitle,
} from "@/features/dashboard/widgets/widgetControls";

export type EventMapConfig = {
	mode: EventsMode;
};

export type EventMapFilters = {
	lastCount: number;
	team: "home" | "away" | "both";
	sequenceEndReasons: EventSequenceEndReason[];
	sequencePassCountMode: SequencePassCountMode;
	sequencePassCount: number;
	selectedEventType: PitchEventType | "all";
	selectedOutcomes: string[];
	selectedSubtypes: string[];
	minuteRange: [number, number];
	selectedSequenceId: string | null;
};

export const DEFAULT_EVENT_MAP_CONFIG: EventMapConfig = {
	mode: "all",
};

export const DEFAULT_EVENT_MAP_FILTERS: EventMapFilters = {
	lastCount: 10,
	team: "both",
	sequenceEndReasons: EVENT_SEQUENCE_END_REASONS,
	sequencePassCountMode: "any",
	sequencePassCount: 3,
	selectedEventType: "all",
	selectedOutcomes: [],
	selectedSubtypes: [],
	minuteRange: [0, 90],
	selectedSequenceId: null,
};

const EVENT_MODE_OPTIONS = [
	{ value: "live", label: "Live" },
	{ value: "sequences", label: "Secuencia" },
	{ value: "all", label: "Todo" },
];

const SEQUENCE_END_REASON_LABELS: Record<EventSequenceEndReason, string> = {
	shot: "Tiro",
	foul: "Falta",
	out: "Fuera",
	opponent: "Otro equipo",
};

function normalizeEventMapFilters(filters: Partial<EventMapFilters>): EventMapFilters {
	return {
		...DEFAULT_EVENT_MAP_FILTERS,
		...filters,
		sequenceEndReasons:
			filters.sequenceEndReasons ?? DEFAULT_EVENT_MAP_FILTERS.sequenceEndReasons,
		selectedOutcomes: filters.selectedOutcomes ?? [],
		selectedSubtypes: filters.selectedSubtypes ?? [],
		minuteRange: filters.minuteRange ?? DEFAULT_EVENT_MAP_FILTERS.minuteRange,
		selectedSequenceId: filters.selectedSequenceId ?? null,
	};
}

function getMaxMinute(events: PitchEvent[]) {
	return events.reduce((maxMinute, event) => Math.max(maxMinute, event.min ?? 0), 0);
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

function getTeamId(
	team: EventMapFilters["team"],
	homeTeamId?: string,
	awayTeamId?: string,
) {
	if (team === "home") return homeTeamId;
	if (team === "away") return awayTeamId;
	return undefined;
}

function sequenceMatchesFilters(
	sequence: EventSequence,
	filters: EventMapFilters,
	homeTeamId?: string,
	awayTeamId?: string,
) {
	const teamId = getTeamId(filters.team, homeTeamId, awayTeamId);
	if (teamId && sequence.teamId !== teamId) return false;
	if (!filters.sequenceEndReasons.includes(sequence.endReason)) return false;

	if (filters.sequencePassCountMode === "more") {
		return sequence.passCount > filters.sequencePassCount;
	}

	if (filters.sequencePassCountMode === "less") {
		return sequence.passCount < filters.sequencePassCount;
	}

	return true;
}

function filterAllEvents(
	events: PitchEvent[],
	filters: EventMapFilters,
	maxMinute: number,
	homeTeamId?: string,
	awayTeamId?: string,
) {
	let result = events;
	const teamId = getTeamId(filters.team, homeTeamId, awayTeamId);
	const [startMinute, endMinute] = clampMinuteRange(filters.minuteRange, maxMinute);

	if (teamId) {
		result = result.filter((event) => event.team_id === teamId);
	}

	if (filters.selectedEventType !== "all") {
		const typeIds =
			PITCH_EVENT_TYPES_CONFIG.find((item) => item.value === filters.selectedEventType)
				?.typeIds ?? [];
		result = result.filter((event) => typeIds.includes(event.type_id));
	}

	if (filters.selectedOutcomes.length > 0) {
		const selectedOutcomeOptions =
			OUTCOME_OPTIONS_BY_TYPE[filters.selectedEventType]?.filter((option) =>
				filters.selectedOutcomes.includes(option.id),
			) ?? [];
		result = result.filter((event) =>
			selectedOutcomeOptions.some((option) => eventMatchesOutcome(event, option)),
		);
	}

	if (filters.selectedSubtypes.length > 0) {
		const selectedSubtypeOptions =
			EVENT_SUBTYPE_OPTIONS_BY_TYPE[filters.selectedEventType]?.filter((option) =>
				filters.selectedSubtypes.includes(option.id),
			) ?? [];
		result = result.filter((event) => {
			const eventHasSubtypeOptions = EVENT_SUBTYPE_OPTIONS_FLAT.some((option) =>
				option.typeIds.includes(event.type_id),
			);

			if (!eventHasSubtypeOptions) return true;
			return selectedSubtypeOptions.some((option) => eventMatchesSubtype(event, option));
		});
	}

	return result.filter((event) => {
		const minute = event.min ?? 0;
		return minute >= startMinute && minute <= endMinute;
	});
}

function getTeamColors(game: ReturnType<typeof useGameStore.getState>["game"]) {
	return game
		? {
				[game.home_team.team_id]: "#3b82f6",
				[game.away_team.team_id]: "#f43f5e",
			}
		: {};
}

function EventPitchSurface({
	events,
	mode,
	noDataMessage,
}: {
	events: PitchEvent[];
	mode: EventsMode;
	noDataMessage?: string;
}) {
	const game = useGameStore((state) => state.game);

	return (
		<div className="min-h-0 flex-1 overflow-hidden rounded-md bg-slate-100 p-2 dark:bg-slate-800">
			<EventsPitch
				events={events}
				mode={mode}
				teamColors={getTeamColors(game)}
				orientation="horizontal"
				showHeader={false}
				noDataMessage={noDataMessage}
				markerScaleMultiplier={1.28}
				game={game}
			/>
		</div>
	);
}

function LiveEventMap({ events, filters }: { events: PitchEvent[]; filters: EventMapFilters }) {
	const visibleEvents = events.slice(-Math.max(1, filters.lastCount));

	return (
		<div className="flex h-full min-h-0 flex-col gap-2">
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<Badge variant="outline" className="rounded-md">
					{visibleEvents.length} eventos
				</Badge>
				<Badge variant="secondary" className="rounded-md">
					Live
				</Badge>
			</div>
			<EventPitchSurface
				events={visibleEvents}
				mode="live"
				noDataMessage={visibleEvents.length === 0 ? "Sin eventos live" : undefined}
			/>
		</div>
	);
}

function SequenceEventMap({
	events,
	filters,
	onFiltersChange,
}: {
	events: PitchEvent[];
	filters: EventMapFilters;
	onFiltersChange?: (filters: EventMapFilters) => void;
}) {
	const game = useGameStore((state) => state.game);
	const sequences = buildEventSequences(events).filter((sequence) =>
		sequenceMatchesFilters(
			sequence,
			filters,
			game?.home_team.team_id,
			game?.away_team.team_id,
		),
	);
	const selectedSequence =
		sequences.find((sequence) => sequence.id === filters.selectedSequenceId) ?? null;

	return (
		<div className="grid h-full min-h-0 gap-2 md:grid-cols-[minmax(0,1fr)_14rem]">
			<div className="flex min-h-0 flex-col gap-2">
				<div className="flex flex-wrap items-center gap-2 text-xs">
					<Badge variant="outline" className="rounded-md">
						{sequences.length} secuencias
					</Badge>
					<Badge variant="secondary" className="rounded-md">
						{selectedSequence ? `${selectedSequence.passCount} pases` : "Selecciona"}
					</Badge>
				</div>
				<EventPitchSurface
					events={selectedSequence?.events ?? []}
					mode="sequences"
					noDataMessage={
						selectedSequence ? undefined : "Selecciona una secuencia en la lista"
					}
				/>
			</div>
			<div className="min-h-0 overflow-hidden rounded-md border bg-background">
				<div className="border-b px-3 py-2 text-xs font-semibold text-muted-foreground">
					Secuencias
				</div>
				<div className="grid max-h-full gap-1 overflow-auto p-2">
					{sequences.length === 0 ? (
						<p className="px-2 py-4 text-center text-xs text-muted-foreground">
							Sin secuencias para los filtros
						</p>
					) : null}
					{sequences.map((sequence, index) => {
						const active = sequence.id === selectedSequence?.id;
						const startMinute = sequence.events[0]?.min ?? 0;

						return (
							<button
								key={sequence.id}
								type="button"
								onClick={() =>
									onFiltersChange?.({
										...filters,
										selectedSequenceId: sequence.id,
									})
								}
								className="rounded-md border px-2 py-2 text-left text-xs transition-colors data-[active=true]:border-primary data-[active=true]:bg-primary/10 hover:bg-muted/50"
								data-active={active}
							>
								<span className="block font-semibold">
									#{index + 1} - Min {startMinute}'
								</span>
								<span className="mt-0.5 block text-muted-foreground">
									{sequence.passCount} pases - {SEQUENCE_END_REASON_LABELS[sequence.endReason]}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

function AllEventMap({
	events,
	filters,
	maxMinute,
}: {
	events: PitchEvent[];
	filters: EventMapFilters;
	maxMinute: number;
}) {
	const game = useGameStore((state) => state.game);
	const visibleEvents = filterAllEvents(
		events,
		filters,
		maxMinute,
		game?.home_team.team_id,
		game?.away_team.team_id,
	);

	return (
		<div className="flex h-full min-h-0 flex-col gap-2">
			<div className="flex flex-wrap items-center gap-2 text-xs">
				<Badge variant="outline" className="rounded-md">
					{visibleEvents.length} eventos
				</Badge>
				<Badge variant="secondary" className="rounded-md">
					Todo
				</Badge>
			</div>
			<EventPitchSurface
				events={visibleEvents}
				mode="all"
				noDataMessage={visibleEvents.length === 0 ? "Sin eventos para los filtros" : undefined}
			/>
		</div>
	);
}

export function EventMapWidget({
	config,
	filters,
	onFiltersChange,
}: WidgetComponentProps<EventMapConfig, EventMapFilters>) {
	const events = useEventsStore((state) => state.events);
	const pitchEvents = events.filter(isPitchEvent);
	const normalizedFilters = normalizeEventMapFilters(filters);
	const maxMinute = getMaxMinute(pitchEvents);

	if (config.mode === "live") {
		return <LiveEventMap events={pitchEvents} filters={normalizedFilters} />;
	}

	if (config.mode === "sequences") {
		return (
			<SequenceEventMap
				events={pitchEvents}
				filters={normalizedFilters}
				onFiltersChange={onFiltersChange}
			/>
		);
	}

	return (
		<AllEventMap events={pitchEvents} filters={normalizedFilters} maxMinute={maxMinute} />
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
	config,
}: WidgetPanelProps<EventMapFilters, EventMapConfig>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const filters = normalizeEventMapFilters(value);
	const mode = config?.mode ?? "all";
	const pitchEvents = events.filter(isPitchEvent);
	const maxMinute = getMaxMinute(pitchEvents);
	const availableTypeIds: string[] = Array.from(
		new Set(pitchEvents.map((event) => String(event.type_id))),
	);
	const availablePitchTypes = PITCH_EVENT_TYPES_CONFIG.filter(
		(type) => type.value === "all" || type.typeIds.some((id) => availableTypeIds.includes(id)),
	);
	const availableOutcomeOptions =
		OUTCOME_OPTIONS_BY_TYPE[filters.selectedEventType]?.filter((option) =>
			availableTypeIds.includes(option.typeId),
		) ?? [];
	const availableSubtypeOptions =
		EVENT_SUBTYPE_OPTIONS_BY_TYPE[filters.selectedEventType]?.filter((option) =>
			option.typeIds.some((id) => availableTypeIds.includes(id)),
		) ?? [];

	if (mode === "live") {
		return (
			<div className="grid gap-3">
				<SectionTitle>Live</SectionTitle>
				<Field label="Ultimos eventos">
					<NumberInput
						value={filters.lastCount}
						min={1}
						max={500}
						onChange={(lastCount) => onChange({ ...filters, lastCount })}
					/>
				</Field>
			</div>
		);
	}

	if (mode === "sequences") {
		return (
			<div className="grid gap-3">
				<SectionTitle>Secuencias</SectionTitle>
				<SelectField
					label="Equipo"
					value={filters.team}
					onChange={(team) => {
						if (team === "home" || team === "away" || team === "both") {
							onChange({ ...filters, team, selectedSequenceId: null });
						}
					}}
					options={[
						{ value: "both", label: "Ambos" },
						{ value: "home", label: game?.home_team.team_name ?? "Local" },
						{ value: "away", label: game?.away_team.team_name ?? "Visitante" },
					]}
				/>
				<CheckboxList
					options={EVENT_SEQUENCE_END_REASONS.map((reason) => ({
						value: reason,
						label: SEQUENCE_END_REASON_LABELS[reason],
					}))}
					value={filters.sequenceEndReasons}
					onChange={(sequenceEndReasons) =>
						onChange({
							...filters,
							sequenceEndReasons: sequenceEndReasons as EventSequenceEndReason[],
							selectedSequenceId: null,
						})
					}
				/>
				<div className="grid gap-3 sm:grid-cols-[1fr_auto]">
					<SelectField
						label="Numero de pases"
						value={filters.sequencePassCountMode}
						onChange={(sequencePassCountMode) => {
							if (
								sequencePassCountMode === "any" ||
								sequencePassCountMode === "more" ||
								sequencePassCountMode === "less"
							) {
								onChange({
									...filters,
									sequencePassCountMode,
									selectedSequenceId: null,
								});
							}
						}}
						options={[
							{ value: "any", label: "Todos" },
							{ value: "more", label: "Mas de" },
							{ value: "less", label: "Menos de" },
						]}
					/>
					<Field label="Pases">
						<NumberInput
							value={filters.sequencePassCount}
							min={0}
							max={100}
							disabled={filters.sequencePassCountMode === "any"}
							onChange={(sequencePassCount) =>
								onChange({
									...filters,
									sequencePassCount,
									selectedSequenceId: null,
								})
							}
						/>
					</Field>
				</div>
			</div>
		);
	}

	return (
		<div className="grid gap-3">
			<SectionTitle>Todos los eventos</SectionTitle>
			<div className="grid gap-3 sm:grid-cols-2">
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
					label="Tipo de evento"
					value={filters.selectedEventType}
					onChange={(selectedEventType) => {
						const eventType = selectedEventType as PitchEventType | "all";
						const nextOutcomes =
							OUTCOME_OPTIONS_BY_TYPE[eventType]
								?.filter((option) => availableTypeIds.includes(option.typeId))
								.map((option) => option.id) ?? [];
						const nextSubtypes =
							EVENT_SUBTYPE_OPTIONS_BY_TYPE[eventType]
								?.filter((option) =>
									option.typeIds.some((id) => availableTypeIds.includes(id)),
								)
								.map((option) => option.id) ?? [];

						onChange({
							...filters,
							selectedEventType: eventType,
							selectedOutcomes: nextOutcomes,
							selectedSubtypes: nextSubtypes,
						});
					}}
					options={availablePitchTypes.map((item) => ({
						value: item.value,
						label: item.label,
					}))}
				/>
			</div>
			{availableSubtypeOptions.length > 0 ? (
				<CheckboxList
					options={availableSubtypeOptions.map((option) => ({
						value: option.id,
						label: option.label,
					}))}
					value={filters.selectedSubtypes}
					onChange={(selectedSubtypes) => onChange({ ...filters, selectedSubtypes })}
				/>
			) : null}
			{availableOutcomeOptions.length > 0 ? (
				<CheckboxList
					options={availableOutcomeOptions.map((option) => ({
						value: option.id,
						label: option.label,
					}))}
					value={filters.selectedOutcomes}
					onChange={(selectedOutcomes) => onChange({ ...filters, selectedOutcomes })}
				/>
			) : null}
			<MinuteRangeField
				label="Rango de minutos"
				value={filters.minuteRange}
				maxMinute={maxMinute}
				onChange={(minuteRange) => onChange({ ...filters, minuteRange })}
			/>
		</div>
	);
}
