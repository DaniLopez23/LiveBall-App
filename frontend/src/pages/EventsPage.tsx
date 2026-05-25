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
import { type EventsFilters } from "@/components/pitch/eventsPitch/EventsPitchFilters";
import {
  buildEventSequences,
  EVENT_SEQUENCE_END_REASONS,
  type EventSequence,
} from "@/components/pitch/eventsPitch/eventSequences";
import { cn } from "@/lib/utils";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import { isPitchEvent, type PitchEvent } from "@/types/event";
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
  sequenceEndReasons: EVENT_SEQUENCE_END_REASONS,
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

  const teamColors = useMemo(() => {
    if (!game) return {};

    return {
      [game.home_team.team_id]: "#3b82f6",
      [game.away_team.team_id]: "#ef4444",
    };
  }, [game]);

  const pitchEvents = useMemo(() => events.filter(isPitchEvent), [events]);
  const eventSequences = useMemo(() => buildEventSequences(pitchEvents), [pitchEvents]);
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

  const sequenceMatchesFilters = useCallback(
    (sequence: EventSequence, activeFilters: EventsFilters) => {
      if (activeFilters.team !== "both" && game) {
        const teamId =
          activeFilters.team === "home"
            ? game.home_team.team_id
            : game.away_team.team_id;
        if (sequence.teamId !== teamId) return false;
      }

      if (!activeFilters.sequenceEndReasons.includes(sequence.endReason)) {
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

  const filteredSequences = useMemo(
    () =>
      eventSequences.filter((sequence) =>
        sequenceMatchesFilters(sequence, displayFilters),
      ),
    [eventSequences, displayFilters, sequenceMatchesFilters],
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
    if (displayFilters.mode === "live") {
      return pitchEvents.slice(-displayFilters.lastCount);
    }

    if (displayFilters.mode === "sequences") {
      return selectedSequence?.events ?? [];
    }

    let result = pitchEvents;

    if (displayFilters.team !== "both" && game) {
      const teamId =
        displayFilters.team === "home"
          ? game.home_team.team_id
          : game.away_team.team_id;
      result = result.filter((event: PitchEvent) => event.team_id === teamId);
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
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-bold">Real Time Events</h1>
        </div>

        <div className="shrink-0 ml-4">
          <NewEventsAlert key={game?.game_id ?? "no-game"} />
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsMobilePanelOpen(true)}
          className="ml-auto xl:hidden"
        >
          <SlidersHorizontal className="size-4" />
          Filtros
        </Button>
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
