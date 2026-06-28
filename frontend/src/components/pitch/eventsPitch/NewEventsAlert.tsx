import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Clock3, UserRound, Zap } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getActionLabel } from "@/components/pitch/eventsPitch/eventDisplay";
import useEventsStore from "@/store/eventsStore";
import usePassNetworksStore from "@/store/passNetworksStore";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/event";

function formatClock(min?: number | null, sec?: number | null): string {
  if (min == null && sec == null) {
    return "--:--";
  }

  const minute = String(min ?? 0).padStart(2, "0");
  const second = String(sec ?? 0).padStart(2, "0");
  return `${minute}:${second}`;
}

function getEventLabel(typeId: string): string {
  const actionLabel = getActionLabel(typeId);
  return actionLabel === typeId ? `Evento ${typeId}` : actionLabel;
}

function resolvePlayerName(
  playerId: string | null | undefined,
  teamId: string | null | undefined,
  passNetworksByTeamId: Record<string, { nodes: { player_id: string; player_name: string }[] }>,
): string {
  if (!playerId) {
    return "Jugador desconocido";
  }

  const teamNetwork = teamId ? passNetworksByTeamId[String(teamId)] : undefined;
  const matchedPlayer = teamNetwork?.nodes.find((node) => node.player_id === playerId);
  return matchedPlayer?.player_name?.trim() || `Jugador ${playerId}`;
}

function formatLivePlayerLabel(
  event: Event,
  passNetworksByTeamId: Record<string, { nodes: { player_id: string; player_name: string }[] }>,
): string {
  const dorsal = event.player?.dorsal?.trim();
  const playerName = event.player?.name?.trim();
  const fallbackName = resolvePlayerName(
    event.player_id,
    event.team_id,
    passNetworksByTeamId,
  );
  const name = playerName || fallbackName;

  if (dorsal && name) return `${dorsal} - ${name}`;
  if (dorsal) return dorsal;
  return name;
}

const NewEventsAlert = () => {
  const events = useEventsStore((state) => state.events);
  const passNetworksByTeamId = usePassNetworksStore((state) => state.byTeamId);

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;
  const [latestBatchNewEvents, setLatestBatchNewEvents] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const previousCountRef = useRef(0);
  const isInitializedRef = useRef(false);

  const currentMatchState = useMemo(() => {
    for (let i = events.length - 1; i >= 0; i -= 1) {
      const state = events[i]?.match_state;
      if (state) return state;
    }
    return null;
  }, [events]);

  const isMatchFinished =
    currentMatchState === "match_finished" || currentMatchState === "end";

  useEffect(() => {
    if (!isInitializedRef.current) {
      previousCountRef.current = events.length;
      isInitializedRef.current = true;
      return;
    }

    const previousCount = previousCountRef.current;
    const currentCount = events.length;

    if (currentCount > previousCount && latestEvent) {
      setLatestBatchNewEvents(currentCount - previousCount);
      setIsPulsing(true);

      const timeoutId = window.setTimeout(() => {
        setIsPulsing(false);
      }, 700);

      previousCountRef.current = currentCount;

      return () => window.clearTimeout(timeoutId);
    }

    if (currentCount < previousCount) {
      setLatestBatchNewEvents(0);
    }

    previousCountRef.current = currentCount;
  }, [events.length, latestEvent]);

  const newEventsLabel = latestBatchNewEvents === 1 ? "nuevo" : "nuevos";

  const alertDetails = useMemo(() => {
    if (!latestEvent) {
      return null;
    }

    return {
      eventLabel: getEventLabel(latestEvent.type_id),
      playerLabel: formatLivePlayerLabel(latestEvent, passNetworksByTeamId),
      timeLabel: formatClock(latestEvent.min, latestEvent.sec),
    };
  }, [latestEvent, passNetworksByTeamId]);

  if (isMatchFinished) {
    return null;
  }

  return (
    <Alert
      className={cn(
        "flex w-full min-w-0 items-start gap-2 border-border/70 bg-background/90 px-2.5 py-2 shadow-sm backdrop-blur transition-all duration-300 supports-backdrop-filter:bg-background/80 sm:w-fit sm:max-w-full sm:items-center sm:gap-3 sm:px-3",
        isPulsing && "scale-[1.015] border-primary/40 bg-primary/5 shadow-md shadow-primary/10",
      )}
    >
      <BellRing className="mt-0.5 shrink-0 text-primary sm:mt-0" />
      <div className="grid min-w-0 flex-1 gap-1 sm:flex sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <AlertTitle className="mb-0 shrink-0 text-xs font-semibold sm:text-sm">
            Eventos en directo
          </AlertTitle>
          <Badge variant="secondary" className="shrink-0 gap-1.5">
            <Zap className="size-3" />
            {latestBatchNewEvents} {newEventsLabel}
          </Badge>
        </div>

        {alertDetails ? (
          <AlertDescription className="grid min-w-0 gap-1 text-xs leading-snug sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1 sm:text-sm">
            <span className="min-w-0 truncate font-medium text-foreground">
              {alertDetails.eventLabel}
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <UserRound className="size-3.5 shrink-0" />
              <span className="min-w-0 truncate">{alertDetails.playerLabel}</span>
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5 tabular-nums text-muted-foreground">
              <Clock3 className="size-3.5 shrink-0" />
              {alertDetails.timeLabel}
            </span>
          </AlertDescription>
        ) : (
          <AlertDescription>
            Esperando los primeros eventos en directo.
          </AlertDescription>
        )}
      </div>
    </Alert>
  );
};

export default NewEventsAlert;
