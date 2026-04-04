import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Clock3, UserRound, Zap } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import useEventsStore from "@/store/eventsStore";
import usePassNetworksStore from "@/store/passNetworksStore";
import { PITCH_EVENT_TYPES_CONFIG } from "@/types/outcomeOptions";
import { cn } from "@/lib/utils";

function formatClock(min?: number | null, sec?: number | null): string {
  if (min == null && sec == null) {
    return "--:--";
  }

  const minute = String(min ?? 0).padStart(2, "0");
  const second = String(sec ?? 0).padStart(2, "0");
  return `${minute}:${second}`;
}

function getEventLabel(typeId: string, eventName?: string | null): string {
  const fromRegistry = PITCH_EVENT_TYPES_CONFIG.find((item) => item.typeIds.includes(typeId));
  return eventName?.trim() || fromRegistry?.label || "Unknown event";
}

function resolvePlayerName(
  playerId: string | null | undefined,
  teamId: string | null | undefined,
  passNetworksByTeamId: Record<string, { nodes: { player_id: string; player_name: string }[] }>,
): string {
  if (!playerId) {
    return "Unknown player";
  }

  const teamNetwork = teamId ? passNetworksByTeamId[String(teamId)] : undefined;
  const matchedPlayer = teamNetwork?.nodes.find((node) => node.player_id === playerId);
  return matchedPlayer?.player_name?.trim() || `Player ${playerId}`;
}

const NewEventsAlert = () => {
  const events = useEventsStore((state) => state.events);
  const passNetworksByTeamId = usePassNetworksStore((state) => state.byTeamId);

  const latestEvent = events.length > 0 ? events[events.length - 1] : null;
  const [totalNewEvents, setTotalNewEvents] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const previousCountRef = useRef(0);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current) {
      previousCountRef.current = events.length;
      isInitializedRef.current = true;
      return;
    }

    const previousCount = previousCountRef.current;
    const currentCount = events.length;

    if (currentCount > previousCount && latestEvent) {
      setTotalNewEvents((value) => value + (currentCount - previousCount));
      setIsPulsing(true);

      const timeoutId = window.setTimeout(() => {
        setIsPulsing(false);
      }, 700);

      previousCountRef.current = currentCount;

      return () => window.clearTimeout(timeoutId);
    }

    previousCountRef.current = currentCount;
  }, [events.length, latestEvent]);

  const alertDetails = useMemo(() => {
    if (!latestEvent) {
      return null;
    }

    return {
      eventLabel: getEventLabel(latestEvent.type_id, latestEvent.event_name),
      playerLabel: resolvePlayerName(
        latestEvent.player_id,
        latestEvent.team_id,
        passNetworksByTeamId,
      ),
      timeLabel: formatClock(latestEvent.min, latestEvent.sec),
    };
  }, [latestEvent, passNetworksByTeamId]);

  return (
    <Alert
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-3 border-border/70 bg-background/90 px-3 py-2 backdrop-blur supports-backdrop-filter:bg-background/80 shadow-sm transition-all duration-300",
        isPulsing && "scale-[1.015] border-primary/40 bg-primary/5 shadow-md shadow-primary/10",
      )}
    >
      <BellRing className="text-primary" />
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <AlertTitle className="mb-0 text-sm font-semibold">Live event feed</AlertTitle>
          <Badge variant="secondary" className="gap-1.5">
            <Zap className="size-3" />
            {totalNewEvents} new
          </Badge>
        </div>

        {alertDetails ? (
          <AlertDescription className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="truncate font-medium text-foreground">{alertDetails.eventLabel}</span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <UserRound className="size-3.5" />
              <span className="truncate">{alertDetails.playerLabel}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 tabular-nums text-muted-foreground">
              <Clock3 className="size-3.5" />
              {alertDetails.timeLabel}
            </span>
          </AlertDescription>
        ) : (
          <AlertDescription>
            Waiting for the first live events to arrive.
          </AlertDescription>
        )}
      </div>
    </Alert>
  );
};

export default NewEventsAlert;