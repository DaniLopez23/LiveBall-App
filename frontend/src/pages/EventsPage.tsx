import { useMemo, useState } from "react";

import EventsPitch from "@/components/pitch/eventsPitch/EventsPitch";
import EventsPitchTabs from "@/components/pitch/eventsPitch/EventsPitchTabs";
import EventsPitchTable from "@/components/pitch/eventsPitch/EventsPitchTable";
import NewEventsAlert from "@/components/pitch/eventsPitch/NewEventsAlert";
import { type EventsFilters } from "@/components/pitch/eventsPitch/EventsPitchFilters";
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
  mode: "last",
  lastCount: 10,
  team: "both",
  selectedEventType: "all",
  selectedOutcomes: [],
  selectedSubtypes: [],
  minuteRange: [0, 90],
};

const EventsPage: React.FC = () => {
  const game = useGameStore((state) => state.game);
  const events = useEventsStore((state) => state.events);
  const [filters, setFilters] = useState<EventsFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(true);

  const teamColors = useMemo(() => {
    if (!game) return {};

    return {
      [game.home_team.team_id]: "#3b82f6",
      [game.away_team.team_id]: "#ef4444",
    };
  }, [game]);

  const pitchEvents = useMemo(() => events.filter(isPitchEvent), [events]);

  const availableTypeIds = useMemo(
    () => Array.from(new Set(pitchEvents.map((event) => event.type_id))) as string[],
    [pitchEvents],
  );

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

  const effectiveFilters = useMemo(() => {
    if (
      filters.selectedOutcomes.length === 0 &&
      filters.selectedSubtypes.length === 0 &&
      seededFilters
    ) {
      return {
        ...filters,
        selectedOutcomes: seededFilters.selectedOutcomes,
        selectedSubtypes: seededFilters.selectedSubtypes,
      };
    }

    return filters;
  }, [filters, seededFilters]);

  const filteredEvents = useMemo(() => {
    let result = pitchEvents;

    if (effectiveFilters.team !== "both" && game) {
      const teamId =
        effectiveFilters.team === "home"
          ? game.home_team.team_id
          : game.away_team.team_id;
      result = result.filter((event: PitchEvent) => event.team_id === teamId);
    }

    const selectedOutcomeOptions = OUTCOME_OPTIONS_BY_TYPE[
      effectiveFilters.selectedEventType
    ].filter((option) => effectiveFilters.selectedOutcomes.includes(option.id));
    result = result.filter((event) =>
      selectedOutcomeOptions.some((option) => eventMatchesOutcome(event, option)),
    );

    const selectedSubtypeOptions = EVENT_SUBTYPE_OPTIONS_BY_TYPE[
      effectiveFilters.selectedEventType
    ].filter((option) => effectiveFilters.selectedSubtypes.includes(option.id));
    if (EVENT_SUBTYPE_OPTIONS_BY_TYPE[effectiveFilters.selectedEventType].length > 0) {
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

    const [minMinute, maxMinute] = effectiveFilters.minuteRange;
    result = result.filter((event) => {
      const minute = event.min ?? 0;
      return minute >= minMinute && minute <= maxMinute;
    });

    if (effectiveFilters.mode === "last") {
      result = result.slice(-effectiveFilters.lastCount);
    }

    return result;
  }, [pitchEvents, effectiveFilters, game]);

  return (
    <div className="flex min-h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-bold">Real Time Events</h1>
        </div>

        <div className="shrink-0 ml-4">
          <NewEventsAlert key={game?.game_id ?? "no-game"} />
        </div>
      </div>

      <div className="flex h-155 gap-2">
        <div
          className={cn(
            "flex items-center justify-center rounded-lg bg-slate-100 p-2 transition-all duration-300 dark:bg-slate-800",
            showFilters ? "flex-2" : "flex-1",
          )}
        >
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">Esperando eventos...</p>
              <p className="mt-2 text-sm">Los eventos se mostrarán aquí en tiempo real</p>
            </div>
          ) : (
            <EventsPitch
              events={filteredEvents}
              mode={effectiveFilters.mode}
              teamColors={teamColors}
              orientation="horizontal"
            />
          )}
        </div>

        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-lg bg-slate-100 transition-all duration-300 dark:bg-slate-800",
            showFilters ? "flex-1" : "w-10",
          )}
        >
          <EventsPitchTabs
            filters={effectiveFilters}
            onFiltersChange={setFilters}
            homeTeamName={game?.home_team.team_name}
            awayTeamName={game?.away_team.team_name}
            isOpen={showFilters}
            onToggle={() => setShowFilters((value) => !value)}
            availableTypeIds={availableTypeIds}
          />
        </div>
      </div>

      <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
        <h2 className="mb-3 text-sm font-semibold">Tabla de eventos</h2>
        <EventsPitchTable events={filteredEvents} sequenceEvents={pitchEvents} game={game} />
      </div>
    </div>
  );
};

export default EventsPage;
