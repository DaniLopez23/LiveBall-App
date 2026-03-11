import React from "react";
import useGameStore from "@/store/gameStore";
import usePassNetworksStore from "@/store/passNetworksStore";
import PassNetworkPitch from "@/components/pitch/passNetworkPitch/PassNetworkPitch";

const HOME_COLOR = "#3b82f6";
const AWAY_COLOR = "#ef4444";

const PassNetworkPage: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const byTeamId = usePassNetworksStore((s) => s.byTeamId);

  const homeNetwork = game ? byTeamId[game.home_team.team_id] : null;
  const awayNetwork = game ? byTeamId[game.away_team.team_id] : null;

  return (
    <div className="flex flex-col p-4 gap-4 min-h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Redes de Pases</h1>
      </div>

      {/* 3-column layout */}
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0 h-[600px]">

        {/* Column 1: Home team pass network */}
        <div className="flex flex-col bg-slate-100 dark:bg-slate-800 rounded-lg p-2 min-h-0">
          <p
            className="text-xs font-semibold mb-2 truncate"
            style={{ color: HOME_COLOR }}
          >
            {game?.home_team.team_name ?? "Equipo Local"}
          </p>
          <div className="flex-1 min-h-0">
            {homeNetwork && homeNetwork.nodes.length > 0 ? (
              <PassNetworkPitch
                nodes={homeNetwork.nodes}
                edges={homeNetwork.edges}
                color={HOME_COLOR}
                orientation="vertical"
                animated
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                <p className="text-sm">Sin datos de red de pases</p>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Stats / filters (placeholder) */}
        <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-lg p-4 gap-2 text-muted-foreground">
          <p className="text-sm font-medium">Estadísticas y filtros</p>
          <p className="text-xs">Próximamente</p>
        </div>

        {/* Column 3: Away team pass network */}
        <div className="flex flex-col bg-slate-100 dark:bg-slate-800 rounded-lg p-2 min-h-0">
          <p
            className="text-xs font-semibold mb-2 truncate"
            style={{ color: AWAY_COLOR }}
          >
            {game?.away_team.team_name ?? "Equipo Visitante"}
          </p>
          <div className="flex-1 min-h-0">
            {awayNetwork && awayNetwork.nodes.length > 0 ? (
              <PassNetworkPitch
                nodes={awayNetwork.nodes}
                edges={awayNetwork.edges}
                color={AWAY_COLOR}
                orientation="vertical"
                animated
              />
            ) : (
              <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                <p className="text-sm">Sin datos de red de pases</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default PassNetworkPage;