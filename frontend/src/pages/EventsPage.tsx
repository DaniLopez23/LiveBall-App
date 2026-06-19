import { useCallback, useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import { SlidersHorizontal } from "lucide-react";

import EventsPitch from "@/components/pitch/eventsPitch/EventsPitch";
import EventsPitchSequencesTable from "@/components/pitch/eventsPitch/EventsPitchSequencesTable";
import EventsPitchTabs from "@/components/pitch/eventsPitch/EventsPitchTabs";
import EventsPitchTable from "@/components/pitch/eventsPitch/EventsPitchTable";
import NewEventsAlert from "@/components/pitch/eventsPitch/NewEventsAlert";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  type EventsFilters,
  type PlayerFilterOption,
  type SequenceEndTypeOption,
} from "@/components/pitch/eventsPitch/EventsPitchFilters";
import {
  buildEventSequences,
  type EventSequence,
} from "@/components/pitch/eventsPitch/eventSequences";
import { getActionLabel } from "@/components/pitch/eventsPitch/eventDisplay";
import { cn } from "@/lib/utils";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import { isPitchEvent, type PitchEvent } from "@/types/event";
import type { Game } from "@/types/game";
import {
  eventMatchesOutcome,
  eventMatchesSubtype,
  EVENT_SUBTYPE_OPTIONS_BY_TYPE,
  EVENT_SUBTYPE_OPTIONS_FLAT,
  OUTCOME_OPTIONS_BY_TYPE,
} from "@/types/outcomeOptions";

const DEFAULT_FILTERS: EventsFilters = {
  mode: "live",
  lastCount: 10,
  team: "both",
  selectedPlayerIds: [],
  sequenceEndTypeIds: [],
  sequencePrecedingTypeIds: [],
  sequencePassCountMode: "any",
  sequencePassCount: 3,
  selectedEventType: "all",
  selectedOutcomes: [],
  selectedSubtypes: [],
  minuteRange: [0, 90],
};

const clampMinuteRange = (
  minuteRange: [number, number],
  maxMinute: number,
): [number, number] => {
  const boundedMaxMinute = Math.max(0, maxMinute);
  const start = Math.min(Math.max(0, minuteRange[0]), boundedMaxMinute);
  const end = Math.min(Math.max(start, minuteRange[1]), boundedMaxMinute);
  return [start, end];
};

const PITCH_MODE_READY_DELAY_MS = 320;

const getSequenceEndEvent = (sequence: EventSequence): PitchEvent | null =>
  sequence.events[sequence.events.length - 1] ?? null;

const getTeamIdForFilter = (
  teamFilter: EventsFilters["team"],
  game: Game | null | undefined,
): string | null => {
  if (!game || teamFilter === "both") return null;
  return teamFilter === "home" ? game.home_team.team_id : game.away_team.team_id;
};

const formatPlayerOptionLabel = (
  id: string,
  dorsal?: string | null,
  name?: string | null,
): string => {
  const safeDorsal = dorsal?.trim() || "S/D";
  const safeName = name?.trim() || `Jugador ${id}`;
  return `${safeDorsal}-${safeName}`;
};

const getEventPlayerIds = (event: PitchEvent): string[] => {
  const ids = [
    event.player?.id,
    event.player_id,
    event.player_receiver?.id,
    event.player_receiver_id,
  ]
    .map((id) => id?.trim())
    .filter((id): id is string => Boolean(id));

  return Array.from(new Set(ids));
};

const eventMatchesPlayerFilter = (
  event: PitchEvent,
  selectedPlayerIds: string[],
): boolean => {
  if (selectedPlayerIds.length === 0) return true;
  const selected = new Set(selectedPlayerIds);
  return getEventPlayerIds(event).some((id) => selected.has(id));
};

const buildPlayerOptions = (
  events: PitchEvent[],
  teamFilter: EventsFilters["team"],
  game: Game | null | undefined,
): PlayerFilterOption[] => {
  const selectedTeamId = getTeamIdForFilter(teamFilter, game);
  const playersById = new Map<string, PlayerFilterOption & { dorsalSort: number }>();

  for (const event of events) {
    if (selectedTeamId && event.team_id !== selectedTeamId) continue;

    const candidates = [
      {
        id: event.player?.id ?? event.player_id,
        dorsal: event.player?.dorsal,
        name: event.player?.name,
      },
      {
        id: event.player_receiver?.id ?? event.player_receiver_id,
        dorsal: event.player_receiver?.dorsal,
        name: event.player_receiver?.name,
      },
    ];

    for (const candidate of candidates) {
      const id = candidate.id?.trim();
      if (!id) continue;

      const dorsalSort = Number(candidate.dorsal);
      const option = {
        id,
        label: formatPlayerOptionLabel(id, candidate.dorsal, candidate.name),
        teamId: event.team_id,
        dorsalSort: Number.isFinite(dorsalSort) ? dorsalSort : Number.MAX_SAFE_INTEGER,
      };
      const current = playersById.get(id);

      if (!current || current.label.startsWith("S/D-")) {
        playersById.set(id, option);
      }
    }
  }

  return Array.from(playersById.values())
    .sort(
      (left, right) =>
        left.dorsalSort - right.dorsalSort ||
        left.label.localeCompare(right.label, "es", { sensitivity: "base" }),
    )
    .map(({ dorsalSort, ...option }) => option);
};

const getSequenceEndTypeOption = (event: PitchEvent): SequenceEndTypeOption => {
  const typeId: string = event.type_id;

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
      return { id: "ball-recovery", label: "Recuperación de balón", typeIds: ["49"] };
    default:
      return {
        id: `event-${typeId}`,
        label: getActionLabel(typeId),
        typeIds: [typeId],
      };
  }
};

const EventsPage: React.FC = () => {
  const game = useGameStore((state) => state.game);
  const events = useEventsStore((state) => state.events);
  const [filters, setFilters] = useState<EventsFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(true);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [isDefaultAllSelection, setIsDefaultAllSelection] = useState(true);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(null);
  const [isPitchModePreparing, setIsPitchModePreparing] = useState(false);
  const previousPitchModeRef = useRef<EventsFilters["mode"]>(filters.mode);
  const previousSequenceEndTypeIdsRef = useRef<string[]>([]);
  const previousSequencePrecedingTypeIdsRef = useRef<string[]>([]);

  const teamColors = useMemo(() => {
    if (!game) return {};

    return {
      [game.home_team.team_id]: "#3b82f6",
      [game.away_team.team_id]: "#ef4444",
    };
  }, [game]);

  const pitchEvents = useMemo(() => events.filter(isPitchEvent), [events]);
  const eventSequences = useMemo(() => buildEventSequences(pitchEvents), [pitchEvents]);
  const sequenceEndTypeOptions = useMemo<SequenceEndTypeOption[]>(() => {
    const optionsById = new Map<string, SequenceEndTypeOption>();

    for (const sequence of eventSequences) {
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
  }, [eventSequences]);
  const sequencePrecedingTypeOptions = useMemo<SequenceEndTypeOption[]>(() => {
    const optionsById = new Map<string, SequenceEndTypeOption>();

    for (const sequence of eventSequences) {
      const precedingEvent = sequence.precedingEvent;
      if (!precedingEvent?.type_id) continue;

      const option = getSequenceEndTypeOption(precedingEvent);
      if (!optionsById.has(option.id)) {
        optionsById.set(option.id, option);
      }
    }

    return Array.from(optionsById.values()).sort(
      (left, right) =>
        left.label.localeCompare(right.label, "es", { sensitivity: "base" }) ||
        left.id.localeCompare(right.id),
    );
  }, [eventSequences]);
  const currentMaxMinute = useMemo(
    () =>
      pitchEvents.reduce(
        (maxMinute, event) => Math.max(maxMinute, event.min ?? 0),
        0,
      ),
    [pitchEvents],
  );
  const hasSecondHalf = useMemo(
    () =>
      pitchEvents.some(
        (event) => event.period_id === 2 || (event.min ?? 0) >= 45,
      ),
    [pitchEvents],
  );

  const availableTypeIds = useMemo(
    () => Array.from(new Set(pitchEvents.map((event) => event.type_id))) as string[],
    [pitchEvents],
  );

  const allOutcomeIds = useMemo(
    () =>
      OUTCOME_OPTIONS_BY_TYPE.all
        .filter((option) => availableTypeIds.includes(option.typeId))
        .map((option) => option.id),
    [availableTypeIds],
  );

  const allSubtypeIds = useMemo(
    () =>
      EVENT_SUBTYPE_OPTIONS_FLAT
        .filter((option) => option.typeIds.some((typeId) => availableTypeIds.includes(typeId)))
        .map((option) => option.id),
    [availableTypeIds],
  );

  const selectionsMatch = (selectedIds: string[], availableIds: string[]) =>
    selectedIds.length === availableIds.length &&
    selectedIds.every((id) => availableIds.includes(id));

  const isAllEventSelection = (nextFilters: EventsFilters) =>
    nextFilters.selectedEventType === "all" &&
    selectionsMatch(nextFilters.selectedOutcomes, allOutcomeIds) &&
    selectionsMatch(nextFilters.selectedSubtypes, allSubtypeIds);

  useEffect(() => {
    const availableIds = sequenceEndTypeOptions.map((option) => option.id);
    const previousIds = previousSequenceEndTypeIdsRef.current;

    setFilters((currentFilters) => {
      const validSelectedIds = currentFilters.sequenceEndTypeIds.filter((id) =>
        availableIds.includes(id),
      );
      const selectedAllPrevious =
        previousIds.length === 0 ||
        previousIds.every((id) => currentFilters.sequenceEndTypeIds.includes(id));
      const nextSequenceEndTypeIds =
        availableIds.length === 0
          ? []
          : currentFilters.sequenceEndTypeIds.length === 0 && previousIds.length === 0
            ? availableIds
            : selectedAllPrevious
              ? availableIds
              : validSelectedIds;
      const unchanged = selectionsMatch(
        currentFilters.sequenceEndTypeIds,
        nextSequenceEndTypeIds,
      );

      return unchanged
        ? currentFilters
        : { ...currentFilters, sequenceEndTypeIds: nextSequenceEndTypeIds };
    });

    previousSequenceEndTypeIdsRef.current = availableIds;
  }, [sequenceEndTypeOptions]);

  useEffect(() => {
    const availableIds = sequencePrecedingTypeOptions.map((option) => option.id);
    const previousIds = previousSequencePrecedingTypeIdsRef.current;

    setFilters((currentFilters) => {
      const validSelectedIds = currentFilters.sequencePrecedingTypeIds.filter((id) =>
        availableIds.includes(id),
      );
      const selectedAllPrevious =
        previousIds.length === 0 ||
        previousIds.every((id) => currentFilters.sequencePrecedingTypeIds.includes(id));
      const nextSequencePrecedingTypeIds =
        availableIds.length === 0
          ? []
          : currentFilters.sequencePrecedingTypeIds.length === 0 && previousIds.length === 0
            ? availableIds
            : selectedAllPrevious
              ? availableIds
              : validSelectedIds;
      const unchanged = selectionsMatch(
        currentFilters.sequencePrecedingTypeIds,
        nextSequencePrecedingTypeIds,
      );

      return unchanged
        ? currentFilters
        : { ...currentFilters, sequencePrecedingTypeIds: nextSequencePrecedingTypeIds };
    });

    previousSequencePrecedingTypeIdsRef.current = availableIds;
  }, [sequencePrecedingTypeOptions]);

  const sequenceMatchesFilters = useCallback(
    (
      sequence: EventSequence,
      activeFilters: EventsFilters,
      selectedSequenceEndRawTypeIds: Set<string>,
      selectedSequencePrecedingRawTypeIds: Set<string>,
    ) => {
      if (activeFilters.team !== "both" && game) {
        const teamId =
          activeFilters.team === "home"
            ? game.home_team.team_id
            : game.away_team.team_id;
        if (sequence.teamId !== teamId) return false;
      }

      if (
        activeFilters.selectedPlayerIds.length > 0 &&
        !sequence.events.some((event) =>
          eventMatchesPlayerFilter(event, activeFilters.selectedPlayerIds),
        )
      ) {
        return false;
      }

      if (
        activeFilters.sequencePrecedingTypeIds.length > 0 &&
        (!sequence.precedingEvent ||
          !selectedSequencePrecedingRawTypeIds.has(sequence.precedingEvent.type_id))
      ) {
        return false;
      }

      const endEvent = getSequenceEndEvent(sequence);
      if (!endEvent || !selectedSequenceEndRawTypeIds.has(endEvent.type_id)) {
        return false;
      }

      if (activeFilters.sequencePassCountMode === "more") {
        return sequence.passCount > activeFilters.sequencePassCount;
      }

      if (activeFilters.sequencePassCountMode === "less") {
        return sequence.passCount < activeFilters.sequencePassCount;
      }

      return true;
    },
    [game],
  );

  const handleFiltersChange = (nextFilters: EventsFilters) => {
    const eventSelectionChanged =
      nextFilters.selectedEventType !== filters.selectedEventType ||
      !selectionsMatch(nextFilters.selectedOutcomes, filters.selectedOutcomes) ||
      !selectionsMatch(nextFilters.selectedSubtypes, filters.selectedSubtypes);

    setFilters(nextFilters);

    if (eventSelectionChanged) {
      setIsDefaultAllSelection(isAllEventSelection(nextFilters));
    }
  };

  const seededFilters = useMemo(() => {
    if (availableTypeIds.length === 0) return null;

    const availableOutcomes = OUTCOME_OPTIONS_BY_TYPE.all.filter((option) =>
      availableTypeIds.includes(option.typeId),
    );
    const availableSubtypes = EVENT_SUBTYPE_OPTIONS_FLAT.filter((option) =>
      option.typeIds.some((typeId) => availableTypeIds.includes(typeId)),
    );

    return {
      ...DEFAULT_FILTERS,
      selectedOutcomes: availableOutcomes.map((option) => option.id),
      selectedSubtypes: availableSubtypes.map((option) => option.id),
    };
  }, [availableTypeIds]);

  const displayFilters = useMemo(() => {
    if (isDefaultAllSelection && seededFilters) {
      return {
        ...filters,
        selectedOutcomes: seededFilters.selectedOutcomes,
        selectedSubtypes: seededFilters.selectedSubtypes,
        minuteRange: clampMinuteRange(filters.minuteRange, currentMaxMinute),
      };
    }

    return {
      ...filters,
      minuteRange: clampMinuteRange(filters.minuteRange, currentMaxMinute),
    };
  }, [filters, seededFilters, isDefaultAllSelection, currentMaxMinute]);

  const availablePlayers = useMemo(
    () => buildPlayerOptions(pitchEvents, displayFilters.team, game),
    [pitchEvents, displayFilters.team, game],
  );
  const availablePlayerIds = useMemo(
    () => availablePlayers.map((player) => player.id),
    [availablePlayers],
  );

  useEffect(() => {
    setFilters((currentFilters) => {
      if (currentFilters.selectedPlayerIds.length === 0) return currentFilters;

      const validSelectedPlayerIds = currentFilters.selectedPlayerIds.filter((id) =>
        availablePlayerIds.includes(id),
      );
      if (selectionsMatch(currentFilters.selectedPlayerIds, validSelectedPlayerIds)) {
        return currentFilters;
      }

      return { ...currentFilters, selectedPlayerIds: validSelectedPlayerIds };
    });
  }, [availablePlayerIds]);

  const filteredSequences = useMemo(
    () => {
      const selectedSequenceEndRawTypeIds = new Set(
        sequenceEndTypeOptions
          .filter((option) => displayFilters.sequenceEndTypeIds.includes(option.id))
          .flatMap((option) => option.typeIds),
      );
      const selectedSequencePrecedingRawTypeIds = new Set(
        sequencePrecedingTypeOptions
          .filter((option) => displayFilters.sequencePrecedingTypeIds.includes(option.id))
          .flatMap((option) => option.typeIds),
      );

      return eventSequences.filter((sequence) =>
        sequenceMatchesFilters(
          sequence,
          displayFilters,
          selectedSequenceEndRawTypeIds,
          selectedSequencePrecedingRawTypeIds,
        ),
      );
    },
    [
      eventSequences,
      displayFilters,
      sequenceEndTypeOptions,
      sequencePrecedingTypeOptions,
      sequenceMatchesFilters,
    ],
  );

  const selectedSequence = useMemo(
    () =>
      selectedSequenceId
        ? filteredSequences.find((sequence) => sequence.id === selectedSequenceId) ?? null
        : null,
    [filteredSequences, selectedSequenceId],
  );
  useEffect(() => {
    if (displayFilters.mode !== "sequences") return;
    if (selectedSequenceId && !selectedSequence) {
      setSelectedSequenceId(null);
    }
  }, [displayFilters.mode, selectedSequence, selectedSequenceId]);

  useEffect(() => {
    if (previousPitchModeRef.current === displayFilters.mode) return;

    previousPitchModeRef.current = displayFilters.mode;
    setIsPitchModePreparing(true);

    const timeoutId = window.setTimeout(() => {
      setIsPitchModePreparing(false);
    }, PITCH_MODE_READY_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [displayFilters.mode]);

  const filteredEvents = useMemo(() => {
    let result = pitchEvents;

    if (displayFilters.team !== "both" && game) {
      const teamId =
        displayFilters.team === "home"
          ? game.home_team.team_id
          : game.away_team.team_id;
      result = result.filter((event: PitchEvent) => event.team_id === teamId);
    }

    if (displayFilters.selectedPlayerIds.length > 0) {
      result = result.filter((event) =>
        eventMatchesPlayerFilter(event, displayFilters.selectedPlayerIds),
      );
    }

    if (displayFilters.mode === "live") {
      return result.slice(-displayFilters.lastCount);
    }

    if (displayFilters.mode === "sequences") {
      return selectedSequence?.events ?? [];
    }

    if (!isDefaultAllSelection) {
      const selectedOutcomeOptions = OUTCOME_OPTIONS_BY_TYPE[
        displayFilters.selectedEventType
      ].filter((option) => displayFilters.selectedOutcomes.includes(option.id));
      result = result.filter((event) =>
        selectedOutcomeOptions.some((option) => eventMatchesOutcome(event, option)),
      );

      const selectedSubtypeOptions = EVENT_SUBTYPE_OPTIONS_BY_TYPE[
        displayFilters.selectedEventType
      ].filter((option) => displayFilters.selectedSubtypes.includes(option.id));
      if (EVENT_SUBTYPE_OPTIONS_BY_TYPE[displayFilters.selectedEventType].length > 0) {
        result = result.filter((event) => {
          const eventHasSubtypeOptions = EVENT_SUBTYPE_OPTIONS_FLAT.some((option) =>
            option.typeIds.includes(event.type_id),
          );

          // Events without subtype taxonomy (e.g. Out, Shot) should not be excluded
          // just because "all" includes pass-specific subtype options.
          if (!eventHasSubtypeOptions) {
            return true;
          }

          return selectedSubtypeOptions.some((option) => eventMatchesSubtype(event, option));
        });
      }
    }

    const [minMinute, maxMinute] = displayFilters.minuteRange;
    result = result.filter((event) => {
      const minute = event.min ?? 0;
      return minute >= minMinute && minute <= maxMinute;
    });

    return result;
  }, [
    pitchEvents,
    displayFilters,
    game,
    isDefaultAllSelection,
    selectedSequence,
  ]);

  const tableResultCount =
    displayFilters.mode === "sequences" ? filteredSequences.length : filteredEvents.length;
  const shouldShowSequenceSelectionPrompt =
    displayFilters.mode === "sequences" && selectedSequence == null;
  const pitchLoadingMessage =
    events.length === 0 || isPitchModePreparing ? "Cargando eventos..." : undefined;

  return (
    <div className="flex min-h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start gap-x-2 gap-y-3">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-bold">Eventos en tiempo real</h1>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsMobilePanelOpen(true)}
          className="ml-auto shrink-0 xl:hidden"
        >
          <SlidersHorizontal className="size-4" />
          Filtros
        </Button>

        <div className="order-last w-full min-w-0 sm:order-none sm:ml-2 sm:w-auto sm:flex-1 xl:flex-none">
          <NewEventsAlert key={game?.game_id ?? "no-game"} />
        </div>
      </div>

      <div className="flex min-h-[46rem] gap-2 xl:h-[calc(100svh-8rem)] xl:min-h-[48rem]">
        <div
          className={cn(
            "flex items-center justify-center rounded-lg bg-slate-100 p-2 transition-all duration-300 dark:bg-slate-800",
            showFilters ? "xl:flex-2" : "xl:flex-1",
            "flex-1",
          )}
        >
          {pitchLoadingMessage ? (
            <EventsPitch
              events={events.length === 0 ? [] : filteredEvents}
              mode={displayFilters.mode}
              teamColors={teamColors}
              orientation="horizontal"
              loadingMessage={pitchLoadingMessage}
              game={game}
            />
          ) : shouldShowSequenceSelectionPrompt ? (
            <EventsPitch
              events={[]}
              mode={displayFilters.mode}
              teamColors={teamColors}
              orientation="horizontal"
              noDataMessage="Seleccione una secuencia en la Tabla para observarla en el campo"
              game={game}
            />
          ) : (
            <EventsPitch
              events={filteredEvents}
              mode={displayFilters.mode}
              teamColors={teamColors}
              orientation="horizontal"
              animateSequence={displayFilters.mode === "sequences"}
              game={game}
            />
          )}
        </div>

        <div
          className={cn(
            "hidden flex-col overflow-hidden rounded-lg bg-slate-100 transition-all duration-300 dark:bg-slate-800 xl:flex",
            showFilters ? "xl:flex-1" : "xl:w-10",
          )}
        >
          <EventsPitchTabs
            filters={displayFilters}
            onFiltersChange={handleFiltersChange}
            homeTeamName={game?.home_team.team_name}
            awayTeamName={game?.away_team.team_name}
            isOpen={showFilters}
            onToggle={() => setShowFilters((value) => !value)}
            availableTypeIds={availableTypeIds}
            availableSequenceEndTypes={sequenceEndTypeOptions}
            availableSequencePrecedingTypes={sequencePrecedingTypeOptions}
            availablePlayers={availablePlayers}
            maxMinute={currentMaxMinute}
            hasSecondHalf={hasSecondHalf}
          />
        </div>
      </div>

      <Sheet open={isMobilePanelOpen} onOpenChange={setIsMobilePanelOpen}>
        <SheetContent
          side="bottom"
          className="h-[92svh] max-h-[58rem] gap-0 rounded-t-lg p-0"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Panel de eventos</SheetTitle>
          </SheetHeader>
          <EventsPitchTabs
            filters={displayFilters}
            onFiltersChange={handleFiltersChange}
            homeTeamName={game?.home_team.team_name}
            awayTeamName={game?.away_team.team_name}
            isOpen
            showToggle={false}
            defaultValue="filters"
            onToggle={() => setIsMobilePanelOpen(false)}
            availableTypeIds={availableTypeIds}
            availableSequenceEndTypes={sequenceEndTypeOptions}
            availableSequencePrecedingTypes={sequencePrecedingTypeOptions}
            availablePlayers={availablePlayers}
            maxMinute={currentMaxMinute}
            hasSecondHalf={hasSecondHalf}
          />
        </SheetContent>
      </Sheet>

      <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">
            {displayFilters.mode === "sequences" ? "Tabla de secuencias" : "Tabla de eventos"}
          </h2>
          <span className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
            Numero de resultados - {tableResultCount}
          </span>
        </div>
        {displayFilters.mode === "sequences" ? (
          <EventsPitchSequencesTable
            sequences={filteredSequences}
            selectedSequenceId={selectedSequenceId}
            onSelectedSequenceIdChange={setSelectedSequenceId}
            game={game}
          />
        ) : (
          <EventsPitchTable events={filteredEvents} sequenceEvents={pitchEvents} game={game} />
        )}
      </div>
    </div>
  );
};

export default EventsPage;
