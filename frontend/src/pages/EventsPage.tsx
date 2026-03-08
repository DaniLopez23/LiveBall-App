import React from "react";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import EventsPitch from "@/components/pitch/eventsPitch/EventsPitch";
import EventsPitchFilters, {
  type EventsFilters,
} from "@/components/pitch/eventsPitch/EventsPitchFilters";
import { OUTCOME_OPTIONS_FLAT } from "@/types/outcomeOptions";
import { isPitchEvent } from "@/types/event";
import { cn } from "@/lib/utils";

const DEFAULT_FILTERS: EventsFilters = {
  mode: "all",
  lastCount: 20,
  team: "both",
  selectedEventType: "all",
  selectedOutcomes: [],
};

const EventsPage: React.FC = () => {
  const game = useGameStore((state) => state.game);
  const events = useEventsStore((state) => state.events);
  const [filters, setFilters] = React.useState<EventsFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = React.useState(true);

  const teamColors = React.useMemo(() => {
    if (!game) return {};
    return {
      [game.home_team.team_id]: "#3b82f6",
      [game.away_team.team_id]: "#ef4444",
    };
  }, [game]);

  const availableTypeIds = React.useMemo(
    () => Array.from(new Set(events.filter(isPitchEvent).map((e) => e.type_id))),
    [events]
  );

  // Seed outcomes on first data load so all checkboxes start checked
  React.useEffect(() => {
    if (availableTypeIds.length > 0 && filters.selectedOutcomes.length === 0) {
      const options = OUTCOME_OPTIONS_FLAT.filter((opt) =>
        (availableTypeIds as string[]).includes(opt.typeId)
      );
      setFilters((prev) => ({ ...prev, selectedOutcomes: options.map((o) => o.id) }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTypeIds]);

  const filteredEvents = React.useMemo(() => {
    let result = events.filter(isPitchEvent);

    if (filters.team !== "both" && game) {
      const teamId =
        filters.team === "home"
          ? game.home_team.team_id
          : game.away_team.team_id;
      result = result.filter((e) => e.team_id === teamId);
    }

    result = result.filter((e) =>
      OUTCOME_OPTIONS_FLAT.some(
        (opt) =>
          filters.selectedOutcomes.includes(opt.id) &&
          opt.typeId === e.type_id &&
          (opt.outcome === undefined || Number(e.outcome) === opt.outcome)
      )
    );

    if (filters.mode === "last") {
      result = result.slice(-filters.lastCount);
    }

    return result;
  }, [events, filters, game]);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div>
        <div>
          <h1 className="text-2xl font-bold">Eventos en Tiempo Real</h1>
          {game && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="font-semibold">{game.home_team.team_name}</span>
                {" vs "}
                <span className="font-semibold">{game.away_team.team_name}</span>
              </p>
              <p>
                {game.competition_name} • {game.season_name}
                {game.matchday && ` • Jornada ${game.matchday}`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main area: pitch + filters */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Pitch: ~2/3 */}
        <div
          className={cn(
            "flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg p-4 transition-all duration-300",
            showFilters ? "flex-2" : "flex-1"
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
            <div className="w-full h-full flex items-center justify-center">
              <EventsPitch
                events={filteredEvents}
                teamColors={teamColors}
                orientation="horizontal"
              />
            </div>
          )}
        </div>

        {/* Filters: ~1/3 */}
        <div
          className={cn(
            "bg-slate-100 dark:bg-slate-800 rounded-lg min-h-0 overflow-hidden transition-all duration-300",
            showFilters ? "flex-1 p-4" : "w-10 p-2"
          )}
        >
          <EventsPitchFilters
            filters={filters}
            onChange={setFilters}
            homeTeamName={game?.home_team.team_name}
            awayTeamName={game?.away_team.team_name}
            isOpen={showFilters}
            onToggle={() => setShowFilters((v) => !v)}
            availableTypeIds={availableTypeIds}
          />
        </div>
      </div>
    </div>
  );
};

export default EventsPage;
