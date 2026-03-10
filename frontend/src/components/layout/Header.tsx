import { useCallback, useEffect, useState } from "react";
import { Wifi, WifiOff, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import useGameStore from "@/store/gameStore";
import useEventsStore from "@/store/eventsStore";
import useWebsocketStore from "@/store/websocketStore";

function extractSeasonYear(seasonName: string): string {
  const match = seasonName.match(/\d{4}\/\d{4}/);
  return match ? match[0] : seasonName;
}

function getPeriodLabel(periodId: number | null | undefined): string {
  if (periodId === 1) return "1ª Parte";
  if (periodId === 2) return "2ª Parte";
  return "";
}

const WS_STATUS_LABELS: Record<string, string> = {
  connected: "Conectado",
  connecting: "Conectando…",
  disconnected: "Desconectado",
  error: "Error de conexión",
  idle: "Sin actividad",
};

export function Header() {
  const game = useGameStore((s) => s.game);
  const eventsById = useEventsStore((s) => s.eventsById);
  const lastEventId = useEventsStore((s) => s.lastEventId);
  const wsStatus = useWebsocketStore((s) => s.status);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const lastEvent = lastEventId ? eventsById[lastEventId] : null;
  console.log("Último evento:", lastEventId);
  const periodLabel = getPeriodLabel(lastEvent?.period_id);
  const minute = lastEvent?.min != null ? `${lastEvent.min}'` : null;

  const homeScore = game?.home_team.score ?? "-";
  const awayScore = game?.away_team.score ?? "-";
  const seasonYear = game ? extractSeasonYear(game.season_name) : "";

  const wsConnected = wsStatus === "connected";
  const wsConnecting = wsStatus === "connecting";
  const wsStatusLabel = WS_STATUS_LABELS[wsStatus] ?? wsStatus;

  return (
    <header className="flex items-center justify-between px-4 h-14 border-b bg-background shrink-0">

      {/* Left: Competition logo + season */}
      <div className="flex items-center gap-2 w-56">
        <img
          src="/LaLigaLogo.png"
          alt="LaLiga"
          className="h-7 w-auto object-contain"
        />
        {seasonYear && (
          <span className="text-sm font-medium text-muted-foreground">{seasonYear}</span>
        )}
      </div>

      {/* Center: Score block */}
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-center gap-2 text-sm font-semibold leading-tight">
          <span className="truncate max-w-[130px] text-right">
            {game?.home_team.team_name ?? "—"}
          </span>
          <div className="flex items-center gap-1 font-bold text-base tabular-nums">
            <span>{homeScore}</span>
            <span className="text-muted-foreground font-normal">:</span>
            <span>{awayScore}</span>
          </div>
          <span className="truncate max-w-[130px] text-left">
            {game?.away_team.team_name ?? "—"}
          </span>
        </div>

        {(periodLabel || minute) && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {periodLabel && <span>{periodLabel}</span>}
            {periodLabel && minute && <span className="opacity-50">·</span>}
            {minute && <span>{minute}</span>}
          </div>
        )}
      </div>

      {/* Right: WS status + fullscreen */}
      <div className="flex items-center gap-1 w-56 justify-end">
        <Button
          variant="ghost"
          size="icon"
          className={[
            "size-8",
            wsConnected
              ? "text-green-500 hover:text-green-600"
              : wsConnecting
              ? "text-yellow-500 hover:text-yellow-600 animate-pulse"
              : "text-destructive hover:text-destructive/80",
          ].join(" ")}
          title={wsStatusLabel}
          aria-label={`WebSocket: ${wsStatusLabel}`}
        >
          {wsConnected ? (
            <Wifi className="size-4" />
          ) : (
            <WifiOff className="size-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? (
            <Minimize2 className="size-4" />
          ) : (
            <Maximize2 className="size-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
