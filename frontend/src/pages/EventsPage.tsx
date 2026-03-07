import React from "react";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import EventsPitch from "@/components/pitch/EventsPitch";

const EventsPage: React.FC = () => {
  const game = useGameStore((state) => state.game);
  const events = useEventsStore((state) => state.events);

  const teamColors = React.useMemo(() => {
    if (!game) return {};
    return {
      [game.home_team.team_id]: "#3b82f6",
      [game.away_team.team_id]: "#ef4444",
    };
  }, [game]);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
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

      <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
        {events.length > 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <EventsPitch
              events={events}
              teamColors={teamColors}
              orientation="horizontal"
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">Esperando eventos...</p>
            <p className="text-sm mt-2">Los eventos se mostrarán aquí en tiempo real</p>
          </div>
        )}
      </div>

      {game && (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Estadísticas</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{game.home_team.score ?? 0}</p>
              <p className="text-xs text-muted-foreground">{game.home_team.team_short || game.home_team.team_name}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{game.total_events ?? events.length}</p>
              <p className="text-xs text-muted-foreground">Eventos totales</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{game.away_team.score ?? 0}</p>
              <p className="text-xs text-muted-foreground">{game.away_team.team_short || game.away_team.team_name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
