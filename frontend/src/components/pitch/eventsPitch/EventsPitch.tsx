import React, { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { OptaEvent } from "@/components/pitch/figures/OptaMarkers";
import type { Orientation } from "@/store/optaPitchConfigStore";
import { EventsPitchHeader } from "./EventsPitchHeader";
import EventsPitchBoard from "./EventsPitchBoard";
import EventsPitchCaptureModal from "./EventsPitchCaptureModal";
import EventsPitchLoadingOverlay from "./EventsPitchLoadingOverlay";
import PassNetworkNoDataOverlay from "@/components/pitch/passNetworkPitch/PassNetworkNoDataOverlay";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import type { EventsMode } from "./EventsPitchFilters";
import type { Game } from "@/types/game";

const LIVE_EVENT_STEP_MS = 2200;

interface EventsPitchProps {
  events: OptaEvent[];
  /** 'live' animates incremental updates; other modes show selected events at once. */
  mode?: EventsMode;
  /** Optional map of teamId -> color to distinguish teams visually. */
  teamColors?: Record<string, string>;
  /** Optional map of eventId -> color to style specific events. */
  eventColors?: Record<string, string>;
  /** Pitch orientation: 'vertical' (default) or 'horizontal'. */
  orientation?: Orientation;
  /** Pitch surface color (default: #2d7a3a). */
  fieldColor?: string;
  /** Show header section above the pitch (default: true). */
  showHeader?: boolean;
  /** When provided, shows a dark overlay message over the pitch. */
  noDataMessage?: string;
  /** When provided, shows a loading overlay over the pitch. */
  loadingMessage?: string;
  game?: Game | null;
}

const EventsPitch: React.FC<EventsPitchProps> = ({
  events,
  mode,
  teamColors,
  eventColors,
  orientation,
  fieldColor,
  showHeader = true,
  noDataMessage,
  loadingMessage,
  game,
}) => {
  const animated = mode === "live";
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState<OptaEvent[]>(events);
  const liveQueueRef = useRef<OptaEvent[]>([]);
  const liveTimerRef = useRef<number | null>(null);
  const latestLiveSourceRef = useRef<OptaEvent[]>(events);
  const isLiveInitializedRef = useRef(false);

  const clearLiveTimer = useCallback(() => {
    if (liveTimerRef.current == null) return;
    window.clearTimeout(liveTimerRef.current);
    liveTimerRef.current = null;
  }, []);

  const revealNextLiveEvent = useCallback(() => {
    const nextEvent = liveQueueRef.current.shift();
    if (!nextEvent) {
      clearLiveTimer();
      return;
    }

    setLiveEvents((currentEvents) => {
      const sourceEvents = latestLiveSourceRef.current;
      const sourceIds = new Set(sourceEvents.map((event) => event.id));
      const visibleIds = new Set(
        [...currentEvents.filter((event) => sourceIds.has(event.id)), nextEvent].map(
          (event) => event.id,
        ),
      );

      return sourceEvents.filter((event) => visibleIds.has(event.id));
    });

    if (liveQueueRef.current.length > 0) {
      liveTimerRef.current = window.setTimeout(() => {
        liveTimerRef.current = null;
        revealNextLiveEvent();
      }, LIVE_EVENT_STEP_MS);
    }
  }, [clearLiveTimer]);

  useEffect(() => {
    latestLiveSourceRef.current = events;
  }, [events]);

  useEffect(() => {
    if (mode !== "live") {
      clearLiveTimer();
      liveQueueRef.current = [];
      isLiveInitializedRef.current = false;
      setLiveEvents(events);
      return;
    }

    if (!isLiveInitializedRef.current) {
      isLiveInitializedRef.current = true;
      liveQueueRef.current = [];
      setLiveEvents(events);
      return;
    }

    const sourceIds = new Set(events.map((event) => event.id));
    liveQueueRef.current = liveQueueRef.current.filter((event) => sourceIds.has(event.id));

    const visibleIds = new Set(liveEvents.map((event) => event.id));
    const queuedIds = new Set(liveQueueRef.current.map((event) => event.id));
    const incomingEvents = events.filter(
      (event) => !visibleIds.has(event.id) && !queuedIds.has(event.id),
    );

    if (incomingEvents.length > 0) {
      liveQueueRef.current.push(...incomingEvents);

      if (liveTimerRef.current == null) {
        revealNextLiveEvent();
      }

      return;
    }

    setLiveEvents((currentEvents) => {
      const nextEvents = currentEvents.filter((event) => sourceIds.has(event.id));
      const unchanged =
        nextEvents.length === currentEvents.length &&
        nextEvents.every((event, index) => event.id === currentEvents[index]?.id);

      return unchanged ? currentEvents : nextEvents;
    });
  }, [clearLiveTimer, events, liveEvents, mode, revealNextLiveEvent]);

  useEffect(() => clearLiveTimer, [clearLiveTimer]);

  useEffect(() => {
    if (!isFullscreenOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreenOpen(false);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isFullscreenOpen]);

  const displayedEvents = mode === "live" ? liveEvents : events;
  const boardMode = mode ?? "all";

  return (
    <div className="flex flex-col w-full h-full">
      {showHeader ? (
        <>
          <EventsPitchHeader
            canCapture={displayedEvents.length > 0 && !loadingMessage && !noDataMessage}
            onCaptureClick={() => setIsCaptureOpen(true)}
            onFullscreenClick={() => setIsFullscreenOpen(true)}
          />
          <div className="pb-4">
            <Separator />
          </div>
        </>
      ) : null}
      <div className="relative flex-1 min-h-0">
        <EventsPitchBoard
          events={displayedEvents}
          animated={animated}
          mode={boardMode}
          teamColors={teamColors}
          eventColors={eventColors}
          orientation={orientation}
          fieldColor={fieldColor}
        />
        {loadingMessage ? <EventsPitchLoadingOverlay message={loadingMessage} /> : null}
        {!loadingMessage && noDataMessage ? (
          <PassNetworkNoDataOverlay message={noDataMessage} />
        ) : null}
      </div>

      {isFullscreenOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Campograma en pantalla completa"
          onClick={() => setIsFullscreenOpen(false)}
        >
          <div
            className="flex h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h3 className="text-base font-semibold">Campograma de eventos</h3>
                <p className="text-xs text-muted-foreground">
                  Vista ampliada de lo que hay seleccionado en el modo actual.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreenOpen(false)}
              >
                <X className="size-4" />
                Salir
              </Button>
            </div>
            <div className="relative min-h-0 flex-1 bg-slate-100 p-4 dark:bg-slate-800">
              <EventsPitchBoard
                events={displayedEvents}
                animated={animated}
                mode={boardMode}
                teamColors={teamColors}
                eventColors={eventColors}
                orientation={orientation}
                fieldColor={fieldColor}
              />
              {loadingMessage ? <EventsPitchLoadingOverlay message={loadingMessage} /> : null}
              {!loadingMessage && noDataMessage ? (
                <PassNetworkNoDataOverlay message={noDataMessage} />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <EventsPitchCaptureModal
        open={isCaptureOpen}
        events={displayedEvents}
        mode={boardMode}
        teamColors={teamColors}
        eventColors={eventColors}
        orientation={orientation}
        fieldColor={fieldColor}
        game={game}
        onClose={() => setIsCaptureOpen(false)}
      />
    </div>
  );
};

export default EventsPitch;
