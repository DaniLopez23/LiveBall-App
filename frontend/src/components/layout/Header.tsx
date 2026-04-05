import { useCallback, useEffect, useMemo, useState } from "react";
import { HelpCircle, Wifi, WifiOff, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function parseDateSafe(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatKickoffTime(raw: string | null | undefined): string {
  const date = parseDateSafe(raw);
  if (!date) return "PRE";
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatKickoffDateTime(raw: string | null | undefined): string {
  const date = parseDateSafe(raw);
  if (!date) return "";
  const datePart = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${datePart} ${timePart}`;
}

type HeaderMatchState =
  | "pre_match"
  | "first_period_active"
  | "first_period_finished"
  | "second_period_active"
  | "match_finished"
  | null;

const WS_STATUS_LABELS: Record<string, string> = {
  connected: "Conectado",
  connecting: "Conectando…",
  disconnected: "Desconectado",
  error: "Error de conexión",
  idle: "Sin actividad",
};

export function Header() {
  const game = useGameStore((s) => s.game);
  const events = useEventsStore((s) => s.events);
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

  const currentMatchState = useMemo<HeaderMatchState>(() => {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const state = events[i]?.match_state;
      if (
        state === "pre_match" ||
        state === "first_period_active" ||
        state === "first_period_finished" ||
        state === "second_period_active" ||
        state === "match_finished"
      ) {
        return state;
      }
    }
    return null;
  }, [events]);

  const hasMatchStarted =
    currentMatchState === "first_period_active" ||
    currentMatchState === "first_period_finished" ||
    currentMatchState === "second_period_active" ||
    currentMatchState === "match_finished";

  const isLiveState =
    currentMatchState === "first_period_active" ||
    currentMatchState === "second_period_active";

  const badgeLabel =
    currentMatchState === "pre_match" || currentMatchState === null
      ? formatKickoffTime(game?.game_date)
      : currentMatchState === "first_period_finished"
      ? "HT"
      : currentMatchState === "match_finished"
      ? "FIN"
      : "LIVE";

  const badgeClassName = isLiveState
    ? "rounded px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-red-500 text-white leading-none"
    : "rounded px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground leading-none";

  const shouldShowTimeline = isLiveState;
  const periodLabel = shouldShowTimeline ? getPeriodLabel(lastEvent?.period_id) : "";
  const eventClock =
    shouldShowTimeline && lastEvent?.min != null
      ? `${String(lastEvent.min).padStart(2, "0")}:${String(lastEvent.sec ?? 0).padStart(2, "0")}`
      : null;

  const homeScore = hasMatchStarted ? game?.home_team.score ?? "0" : "0";
  const awayScore = hasMatchStarted ? game?.away_team.score ?? "0" : "0";
  const seasonYear = game ? extractSeasonYear(game.season_name) : "";
  const kickoffDateTime = formatKickoffDateTime(game?.game_date);

  const wsConnected = wsStatus === "connected";
  const wsConnecting = wsStatus === "connecting";
  const wsStatusLabel = WS_STATUS_LABELS[wsStatus] ?? wsStatus;

  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2 sm:px-4 sm:py-3 border-b bg-background shrink-0">

      {/* Left: Competition logo + matchday */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <img
          src="/LaLigaLogo.png"
          alt="LaLiga"
          className="h-5 w-auto sm:h-7 object-contain"
        />
        <div className="flex flex-col leading-tight">
          {seasonYear && (
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">{seasonYear}</span>
          )}
          {game?.matchday != null && (
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">
              Jornada {game.matchday}
              {kickoffDateTime ? ` · ${kickoffDateTime}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Center: Score block */}
      <div className="flex flex-col items-center gap-0.5">

        {/* Score row */}
        <div className="flex items-center text-xs sm:text-sm font-semibold leading-tight">
          {/* Home team */}
          <div className="flex items-center justify-end gap-1 sm:gap-1.5 w-[70px] sm:w-[130px] md:w-[150px]">
            <span
              className="size-1.5 sm:size-2 rounded-full shrink-0"
              style={{ backgroundColor: "#3b82f6" }}
            />
            <span className="truncate text-right">{game?.home_team.team_name ?? "—"}</span>
          </div>

          {/* Score */}
          <div
            className={[
              "flex items-center gap-1 px-2 sm:px-4 font-bold text-sm sm:text-base tabular-nums",
              hasMatchStarted ? "" : "opacity-40 text-muted-foreground",
            ].join(" ")}
          >
            <span>{homeScore}</span>
            <span className="text-muted-foreground font-normal">:</span>
            <span>{awayScore}</span>
          </div>

          {/* Away team */}
          <div className="flex items-center justify-start gap-1 sm:gap-1.5 w-[70px] sm:w-[130px] md:w-[150px]">
            <span className="truncate text-left">{game?.away_team.team_name ?? "—"}</span>
            <span
              className="size-1.5 sm:size-2 rounded-full shrink-0"
              style={{ backgroundColor: "#ef4444" }}
            />
          </div>
        </div>

        {/* LIVE + period/minute */}
        {(badgeLabel || periodLabel || eventClock) && (
          <div className="flex flex-col items-center gap-0.5">
            <Badge className={badgeClassName}>{badgeLabel}</Badge>
            {shouldShowTimeline && (periodLabel || eventClock) && (
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                {periodLabel && <span>{periodLabel}</span>}
                {periodLabel && eventClock && <span className="opacity-40">·</span>}
                {eventClock && <span>{eventClock}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: help + WS status + fullscreen */}
      <div className="flex items-center gap-0.5 sm:gap-1 justify-end">
        <button
          type="button"
          className="flex items-center justify-center size-7 sm:size-8 rounded-md opacity-40 hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Más información"
        >
          <HelpCircle className="size-3.5 sm:size-4" />
        </button>

        <Button
          variant="ghost"
          size="icon"
          className={[
            "size-7 sm:size-8",
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
            <Wifi className="size-3.5 sm:size-4" />
          ) : (
            <WifiOff className="size-3.5 sm:size-4" />
          )}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="size-7 sm:size-8"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
          aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen ? (
            <Minimize2 className="size-3.5 sm:size-4" />
          ) : (
            <Maximize2 className="size-3.5 sm:size-4" />
          )}
        </Button>
      </div>
    </header>
  );
}
