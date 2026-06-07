import { useEffect, useMemo, useRef } from "react";

import EventsPitch from "@/components/pitch/eventsPitch/EventsPitch";
import type {
	EventsMode,
	SequenceEndTypeOption,
	SequencePassCountMode,
} from "@/components/pitch/eventsPitch/EventsPitchFilters";
import {
	buildEventSequences,
	type EventSequence,
	type EventSequenceEndReason,
} from "@/components/pitch/eventsPitch/eventSequences";
import { getActionLabel } from "@/components/pitch/eventsPitch/eventDisplay";
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
	sequenceEndTypeIds: string[];
	sequenceEndReasons?: EventSequenceEndReason[];
	sequencePassCountMode: SequencePassCountMode;
	sequencePassCount: number;
	selectedEventType: PitchEventType | "all";
	selectedOutcomes: string[];
	selectedSubtypes: string[];
	minuteRange: [number, number];
	selectedSequenceId: string | null;
};

const DEFAULT_SEQUENCE_END_TYPE_IDS = [
	"pass",
	"take-on",
	"foul",
	"out",
	"tackle",
	"interception",
	"clearance",
	"shot",
	"duel",
	"ball-recovery",
];

export const DEFAULT_EVENT_MAP_CONFIG: EventMapConfig = {
	mode: "all",
};

export const DEFAULT_EVENT_MAP_FILTERS: EventMapFilters = {
	lastCount: 10,
	team: "both",
	sequenceEndTypeIds: DEFAULT_SEQUENCE_END_TYPE_IDS,
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

const LEGACY_SEQUENCE_END_REASON_TYPE_IDS: Record<EventSequenceEndReason, string[]> = {
	shot: ["shot"],
	foul: ["foul"],
	out: ["out"],
	opponent: DEFAULT_SEQUENCE_END_TYPE_IDS,
};

const LEGACY_SEQUENCE_END_REASONS: EventSequenceEndReason[] = [
	"shot",
	"foul",
	"out",
	"opponent",
];

function normalizeEventMapFilters(filters: Partial<EventMapFilters>): EventMapFilters {
	return {
		...DEFAULT_EVENT_MAP_FILTERS,
		...filters,
		sequenceEndTypeIds: getNormalizedSequenceEndTypeIds(filters),
		selectedOutcomes: filters.selectedOutcomes ?? [],
		selectedSubtypes: filters.selectedSubtypes ?? [],
		minuteRange: filters.minuteRange ?? DEFAULT_EVENT_MAP_FILTERS.minuteRange,
		selectedSequenceId: filters.selectedSequenceId ?? null,
	};
}

function getNormalizedSequenceEndTypeIds(filters: Partial<EventMapFilters>) {
	if (Array.isArray(filters.sequenceEndTypeIds)) {
		return filters.sequenceEndTypeIds;
	}

	if (Array.isArray(filters.sequenceEndReasons)) {
		return Array.from(
			new Set(
				filters.sequenceEndReasons.flatMap(
					(reason) => LEGACY_SEQUENCE_END_REASON_TYPE_IDS[reason] ?? [],
				),
			),
		);
	}

	return DEFAULT_EVENT_MAP_FILTERS.sequenceEndTypeIds;
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

const getSequenceEndEvent = (sequence: EventSequence): PitchEvent | null =>
	sequence.events[sequence.events.length - 1] ?? null;

const getSequenceEndTypeOption = (event: PitchEvent): SequenceEndTypeOption => {
	const typeId = event.type_id;

	switch (typeId) {
		case "1":
		case "2":
			return { id: "pass", label: "Pase", typeIds: ["1", "2"] };
		case "3":
			return { id: "take-on", label: "Regate", typeIds: ["3"] };
		case "4":
			return { id: "foul", label: "Falta", typeIds: ["4"] };
		case "5":
			return { id: "out", label: "Fuera del campo", typeIds: ["5"] };
		case "7":
			return { id: "tackle", label: "Entradas", typeIds: ["7"] };
		case "8":
			return { id: "interception", label: "Intercepciones", typeIds: ["8"] };
		case "12":
			return { id: "clearance", label: "Despejes", typeIds: ["12"] };
		case "13":
		case "14":
		case "15":
		case "16":
			return { id: "shot", label: "Tiro", typeIds: ["13", "14", "15", "16"] };
		case "44":
		case "67":
			return { id: "duel", label: "Duelo", typeIds: ["44", "67"] };
		case "49":
			return { id: "ball-recovery", label: "Recuperacion de balon", typeIds: ["49"] };
		default:
			return {
				id: `event-${typeId}`,
				label: getActionLabel(typeId),
				typeIds: [typeId],
			};
	}
};

function getSequenceEndTypeOptions(sequences: EventSequence[]) {
	const optionsById = new Map<string, SequenceEndTypeOption>();

	for (const sequence of sequences) {
		const endEvent = getSequenceEndEvent(sequence);
		if (!endEvent?.type_id) continue;

		const option = getSequenceEndTypeOption(endEvent);
		if (!optionsById.has(option.id)) {
			optionsById.set(option.id, option);
		}
	}

	return Array.from(optionsById.values()).sort(
		(left, right) =>
			left.label.localeCompare(right.label, "es", { sensitivity: "base" }) ||
			left.id.localeCompare(right.id),
	);
}

function selectionsMatch(selectedIds: string[], availableIds: string[]) {
	return (
		selectedIds.length === availableIds.length &&
		selectedIds.every((id) => availableIds.includes(id))
	);
}

function getActiveSequenceEndTypeIds(
	selectedSequenceEndTypeIds: string[],
	availableSequenceEndTypes: SequenceEndTypeOption[],
) {
	const availableIds = availableSequenceEndTypes.map((option) => option.id);
	const validSelectedIds = selectedSequenceEndTypeIds.filter((id) =>
		availableIds.includes(id),
	);

	if (DEFAULT_SEQUENCE_END_TYPE_IDS.every((id) => selectedSequenceEndTypeIds.includes(id))) {
		return availableIds;
	}

	return validSelectedIds;
}

function getSelectedSequenceEndRawTypeIds(
	filters: EventMapFilters,
	availableSequenceEndTypes: SequenceEndTypeOption[],
) {
	const activeSequenceEndTypeIds = getActiveSequenceEndTypeIds(
		filters.sequenceEndTypeIds,
		availableSequenceEndTypes,
	);

	return new Set(
		availableSequenceEndTypes
			.filter((option) => activeSequenceEndTypeIds.includes(option.id))
			.flatMap((option) => option.typeIds),
	);
}

function sequenceMatchesFilters(
	sequence: EventSequence,
	filters: EventMapFilters,
	selectedSequenceEndRawTypeIds: Set<string>,
	homeTeamId?: string,
	awayTeamId?: string,
) {
	const teamId = getTeamId(filters.team, homeTeamId, awayTeamId);
	if (teamId && sequence.teamId !== teamId) return false;

	const endEvent = getSequenceEndEvent(sequence);
	if (!endEvent || !selectedSequenceEndRawTypeIds.has(endEvent.type_id)) {
		return false;
	}

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
				markerScaleMultiplier={1.55}
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
	const eventSequences = useMemo(() => buildEventSequences(events), [events]);
	const sequenceEndTypeOptions = useMemo(
		() => getSequenceEndTypeOptions(eventSequences),
		[eventSequences],
	);
	const selectedSequenceEndRawTypeIds = useMemo(
		() => getSelectedSequenceEndRawTypeIds(filters, sequenceEndTypeOptions),
		[filters, sequenceEndTypeOptions],
	);
	const sequences = eventSequences.filter((sequence) =>
		sequenceMatchesFilters(
			sequence,
			filters,
			selectedSequenceEndRawTypeIds,
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
						const endEvent = getSequenceEndEvent(sequence);
						const endLabel = endEvent ? getSequenceEndTypeOption(endEvent).label : "Final";

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
									{sequence.passCount} pases - {endLabel}
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
	const pitchEvents = useMemo(() => events.filter(isPitchEvent), [events]);
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
	const hasExplicitSequenceEndTypeIds = Array.isArray(value.sequenceEndTypeIds);
	const hasExplicitLegacySequenceEndReasons = Array.isArray(value.sequenceEndReasons);
	const hasStoredSequenceEndSelection =
		hasExplicitSequenceEndTypeIds || hasExplicitLegacySequenceEndReasons;
	const mode = config?.mode ?? "all";
	const pitchEvents = useMemo(() => events.filter(isPitchEvent), [events]);
	const eventSequences = useMemo(() => buildEventSequences(pitchEvents), [pitchEvents]);
	const availableSequenceEndTypes = useMemo(
		() => getSequenceEndTypeOptions(eventSequences),
		[eventSequences],
	);
	const availableSequenceEndTypeIds = useMemo(
		() => availableSequenceEndTypes.map((option) => option.id),
		[availableSequenceEndTypes],
	);
	const previousSequenceEndTypeIdsRef = useRef<string[]>([]);
	const selectedSequenceEndTypeIdsKey = filters.sequenceEndTypeIds.join("|");
	const availableSequenceEndTypeIdsKey = availableSequenceEndTypeIds.join("|");
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
	const validSelectedSequenceEndTypeIds = filters.sequenceEndTypeIds.filter((id) =>
		availableSequenceEndTypeIds.includes(id),
	);

	useEffect(() => {
		const previousIds = previousSequenceEndTypeIdsRef.current;
		const validSelectedIds = filters.sequenceEndTypeIds.filter((id) =>
			availableSequenceEndTypeIds.includes(id),
		);
		const selectedAllKnownDefaults = DEFAULT_SEQUENCE_END_TYPE_IDS.every((id) =>
			filters.sequenceEndTypeIds.includes(id),
		);
		const selectedAllAvailable = availableSequenceEndTypeIds.every((id) =>
			filters.sequenceEndTypeIds.includes(id),
		);
		const selectedAllLegacyReasons =
			hasExplicitLegacySequenceEndReasons &&
			LEGACY_SEQUENCE_END_REASONS.every((reason) =>
				value.sequenceEndReasons?.includes(reason),
			);
		const selectedAllPrevious =
			previousIds.length === 0
				? !hasStoredSequenceEndSelection ||
					selectedAllKnownDefaults ||
					selectedAllAvailable ||
					selectedAllLegacyReasons
				: previousIds.every((id) => filters.sequenceEndTypeIds.includes(id));
		const nextSequenceEndTypeIds =
			availableSequenceEndTypeIds.length === 0
				? []
				: filters.sequenceEndTypeIds.length === 0 &&
						previousIds.length === 0 &&
						!hasStoredSequenceEndSelection
					? availableSequenceEndTypeIds
					: selectedAllPrevious
						? availableSequenceEndTypeIds
						: validSelectedIds;

		if (!selectionsMatch(filters.sequenceEndTypeIds, nextSequenceEndTypeIds)) {
			onChange({
				...filters,
				sequenceEndTypeIds: nextSequenceEndTypeIds,
				selectedSequenceId: null,
			});
		}

		previousSequenceEndTypeIdsRef.current = availableSequenceEndTypeIds;
	}, [
		availableSequenceEndTypeIds,
		availableSequenceEndTypeIdsKey,
		filters,
		hasExplicitSequenceEndTypeIds,
		hasExplicitLegacySequenceEndReasons,
		hasStoredSequenceEndSelection,
		onChange,
		selectedSequenceEndTypeIdsKey,
		value.sequenceEndReasons,
	]);

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
					options={availableSequenceEndTypes.map((option) => ({
						value: option.id,
						label: option.label,
					}))}
					value={validSelectedSequenceEndTypeIds}
					onChange={(sequenceEndTypeIds) =>
						onChange({
							...filters,
							sequenceEndTypeIds,
							selectedSequenceId: null,
						})
					}
				/>
				{availableSequenceEndTypes.length === 0 ? (
					<p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
						No hay finales de secuencia disponibles.
					</p>
				) : null}
				<div className="grid gap-3">
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
