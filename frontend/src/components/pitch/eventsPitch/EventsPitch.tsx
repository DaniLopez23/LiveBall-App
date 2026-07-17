import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
const SEQUENCE_EVENT_STEP_MS = 1450;
const SEQUENCE_REPLAY_PAUSE_MS = 1300;

function EventsPitchAttackDirectionFooter({ game }: { game?: Game | null }) {
  const homeTeamName = game?.home_team.team_name ?? "Local";
  const awayTeamName = game?.away_team.team_name ?? "Visitante";

  return (
    <div
      className="w-full shrink-0 border-t border-border/50 px-3 py-1.5"
      aria-label="Dirección de ataque de los equipos"
    >
      <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        DIRECCIÓN DE ATAQUE
      </p>
      <div className="mt-1 grid w-full grid-cols-2 gap-3 text-xs font-semibold">
        <p className="min-w-0 truncate text-blue-600 dark:text-blue-300">
          {homeTeamName}
        </p>
        <p className="min-w-0 truncate text-right text-red-600 dark:text-red-300">
          {awayTeamName}
        </p>
      </div>
      <svg
        className="block h-8 w-full"
        viewBox="0 0 100 16"
        preserveAspectRatio="none"
        role="img"
        aria-label={`${homeTeamName} ataca hacia la derecha. ${awayTeamName} ataca hacia la izquierda.`}
      >
        <polygon
          points="0,4.5 42,4.5 42,2 49,8 42,14 42,11.5 0,11.5"
          fill="#3b82f6"
          fillOpacity="0.32"
        />
        <polygon
          points="100,4.5 58,4.5 58,2 51,8 58,14 58,11.5 100,11.5"
          fill="#ef4444"
          fillOpacity="0.32"
        />
      </svg>
      <div className="sr-only">
        <span>
          {homeTeamName} ataca de izquierda a derecha. {awayTeamName} ataca de derecha a izquierda.
        </span>
      </div>
    </div>
  );
}

interface EventsPitchProps {
  events: OptaEvent[];
  /** Controls marker presentation. Live always animates incremental updates. */
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
  /** Optional marker scale multiplier for compact embeds such as dashboard widgets. */
  markerScaleMultiplier?: number;
  /** Event id that should be highlighted inside a selected sequence. */
  highlightedEventId?: string | null;
  /** Reveals provided events one by one. Intended for event/sequence detail modals. */
  animateSequence?: boolean;
  /** Replays the sequence animation after it reaches the final event. */
  loopSequenceAnimation?: boolean;
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
  markerScaleMultiplier,
  highlightedEventId,
  animateSequence = false,
  loopSequenceAnimation = false,
  game,
}) => {
  const animated = mode === "live" || animateSequence;
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const [liveEvents, setLiveEvents] = useState<OptaEvent[]>(events);
  const [sequenceEventCount, setSequenceEventCount] = useState(events.length);
  const liveQueueRef = useRef<OptaEvent[]>([]);
  const liveTimerRef = useRef<number | null>(null);
  const latestLiveSourceRef = useRef<OptaEvent[]>(events);
  const isLiveInitializedRef = useRef(false);
  const sequenceEventsKey = events.map((event) => event.id).join("|");
  const shouldShowSequenceRestart =
    mode === "sequences" &&
    animateSequence &&
    events.length > 1 &&
    !loadingMessage &&
    !noDataMessage;

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
    if (!animateSequence) {
      setSequenceEventCount(events.length);
      return;
    }

    setSequenceEventCount(events.length > 0 ? 1 : 0);
  }, [animateSequence, events.length, sequenceEventsKey]);

  useEffect(() => {
    if (!animateSequence || events.length <= 1) return;

    const isComplete = sequenceEventCount >= events.length;
    if (isComplete && !loopSequenceAnimation) return;

    const timeoutId = window.setTimeout(
      () => {
        setSequenceEventCount((currentCount) => {
          if (currentCount >= events.length) {
            return loopSequenceAnimation ? 1 : currentCount;
          }

          return Math.min(events.length, currentCount + 1);
        });
      },
      isComplete ? SEQUENCE_REPLAY_PAUSE_MS : SEQUENCE_EVENT_STEP_MS,
    );

    return () => window.clearTimeout(timeoutId);
  }, [
    animateSequence,
    events.length,
    loopSequenceAnimation,
    sequenceEventCount,
    sequenceEventsKey,
  ]);

  const restartSequenceAnimation = useCallback(() => {
    setSequenceEventCount(events.length > 0 ? 1 : 0);
  }, [events.length]);

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

  const displayedEvents =
    mode === "live"
      ? liveEvents
      : animateSequence
        ? events.slice(0, sequenceEventCount)
        : events;
  const boardMode = mode ?? "all";
  const renderSequenceRestartControl = () =>
    shouldShowSequenceRestart ? (
      <div className="flex shrink-0 justify-center border-t border-border/50 px-3 py-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={restartSequenceAnimation}
        >
          Reiniciar animacion de secuencia
        </Button>
      </div>
    ) : null;

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
          markerScaleMultiplier={markerScaleMultiplier}
          highlightedEventId={highlightedEventId}
          awayTeamId={game?.away_team.team_id}
        />
        {loadingMessage ? <EventsPitchLoadingOverlay message={loadingMessage} /> : null}
        {!loadingMessage && noDataMessage ? (
          <PassNetworkNoDataOverlay message={noDataMessage} />
        ) : null}
      </div>
      {renderSequenceRestartControl()}
      <EventsPitchAttackDirectionFooter game={game} />

      {isFullscreenOpen && typeof document !== "undefined" ? createPortal(
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
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="relative min-h-0 flex-1 bg-slate-100 p-4 dark:bg-slate-800">
                <EventsPitchBoard
                  events={displayedEvents}
                  animated={animated}
                  mode={boardMode}
                  teamColors={teamColors}
                  eventColors={eventColors}
                  orientation={orientation}
                  fieldColor={fieldColor}
                  markerScaleMultiplier={markerScaleMultiplier}
                  highlightedEventId={highlightedEventId}
                  awayTeamId={game?.away_team.team_id}
                />
                {loadingMessage ? <EventsPitchLoadingOverlay message={loadingMessage} /> : null}
                {!loadingMessage && noDataMessage ? (
                  <PassNetworkNoDataOverlay message={noDataMessage} />
                ) : null}
              </div>
              {renderSequenceRestartControl()}
              <EventsPitchAttackDirectionFooter game={game} />
            </div>
          </div>
        </div>,
        document.body,
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
