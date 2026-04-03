import { useEffect, useState, useMemo } from "react";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import EventsPitch from "@/components/pitch/eventsPitch/EventsPitch";
import EventsPitchTabs from "@/components/pitch/eventsPitch/EventsPitchTabs";
import EventsPitchTable from "@/components/pitch/eventsPitch/EventsPitchTable";
import { type EventsFilters } from "@/components/pitch/eventsPitch/EventsPitchFilters";
import {
  OUTCOME_OPTIONS_BY_TYPE,
  EVENT_SUBTYPE_OPTIONS_FLAT,
  EVENT_SUBTYPE_OPTIONS_BY_TYPE,
  eventMatchesOutcome,
  eventMatchesSubtype,
} from "@/types/outcomeOptions";
import { isPitchEvent } from "@/types/event";
import { cn } from "@/lib/utils";

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
    () => Array.from(new Set(pitchEvents.map((e) => e.type_id))),
    [pitchEvents],
  );

  // Seed outcomes and subtypes on first data load so all checkboxes start checked
  useEffect(() => {
    if (availableTypeIds.length === 0) return;

    const availableOutcomes = OUTCOME_OPTIONS_BY_TYPE.all.filter((opt) =>
      (availableTypeIds as string[]).includes(opt.typeId),
    );
    const availableSubtypes = EVENT_SUBTYPE_OPTIONS_FLAT.filter((opt) =>
      opt.typeIds.some((id) => (availableTypeIds as string[]).includes(id)),
    );

    setFilters((prev) => {
      if (prev.selectedOutcomes.length > 0 || prev.selectedSubtypes.length > 0) {
        return prev;
      }
      return {
        ...prev,
        selectedOutcomes: availableOutcomes.map((o) => o.id),
        selectedSubtypes: availableSubtypes.map((o) => o.id),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTypeIds]);

  const filteredEvents = useMemo(() => {
    let result = pitchEvents;

    if (filters.team !== "both" && game) {
      const teamId =
        filters.team === "home"
          ? game.home_team.team_id
          : game.away_team.team_id;
      result = result.filter((e) => e.team_id === teamId);
    }

    const selectedOutcomeOptions = OUTCOME_OPTIONS_BY_TYPE[filters.selectedEventType].filter((opt) =>
      filters.selectedOutcomes.includes(opt.id),
    );
    result = result.filter((event) =>
      selectedOutcomeOptions.some((opt) => eventMatchesOutcome(event, opt)),
    );

    const selectedSubtypeOptions = EVENT_SUBTYPE_OPTIONS_BY_TYPE[filters.selectedEventType].filter((opt) =>
      filters.selectedSubtypes.includes(opt.id),
    );
    if (EVENT_SUBTYPE_OPTIONS_BY_TYPE[filters.selectedEventType].length > 0) {
      result = result.filter((event) =>
        selectedSubtypeOptions.some((opt) => eventMatchesSubtype(event, opt)),
      );
    }

    const [minMin, maxMin] = filters.minuteRange;
    result = result.filter((e) => {
      const m = e.min ?? 0;
      return m >= minMin && m <= maxMin;
    });

    if (filters.mode === "last") {
      result = result.slice(-filters.lastCount);
    }

    return result;
  }, [pitchEvents, filters, game]);

  return (
    <div className="flex flex-col p-4 gap-4 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Eventos en Tiempo Real</h1>
      </div>

      {/* Main area: pitch + filters — fixed height so it doesn't shrink */}
      <div className="flex gap-2 h-[620px]">
        {/* Pitch: ~2/3 */}
        <div
          className={cn(
            "flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg p-2 transition-all duration-300",
            showFilters ? "flex-2" : "flex-1",
          )}
        >
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium">Esperando eventos...</p>
              <p className="text-sm mt-2">
                Los eventos se mostrarán aquí en tiempo real
              </p>
            </div>
          ) : (
            <EventsPitch
              events={filteredEvents}
              mode={filters.mode}
              teamColors={teamColors}
              orientation="horizontal"
            />
          )}
        </div>

        {/* Filters panel: ~1/3 */}
        <div
          className={cn(
            "bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden transition-all duration-300 flex flex-col",
            showFilters ? "flex-1" : "w-10",
          )}
        >
          <EventsPitchTabs
            filters={filters}
            onFiltersChange={setFilters}
            homeTeamName={game?.home_team.team_name}
            awayTeamName={game?.away_team.team_name}
            isOpen={showFilters}
            onToggle={() => setShowFilters((v) => !v)}
            availableTypeIds={availableTypeIds}
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
        <h2 className="text-sm font-semibold mb-3">Tabla de eventos</h2>
        <EventsPitchTable events={filteredEvents} sequenceEvents={pitchEvents} game={game} />
      </div>
    </div>
  );
};

export default EventsPage;
