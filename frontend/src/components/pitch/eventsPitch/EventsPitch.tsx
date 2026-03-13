import React, { useEffect, useRef, useState } from "react";
import OptaPitch from "@/components/pitch/OptaPitch";
import OptaMarkers, {
  type OptaEvent,
} from "@/components/pitch/figures/OptaMarkers";
import type { Orientation } from "@/store/optaPitchConfigStore";
import { EventsPitchHeader } from "./EventsPitchHeader";
import { Separator } from "@/components/ui/separator";

/** ms between each event appearing */
const STEP_MS = 1000;
/** ms to pause when all events are shown before resetting */
const PAUSE_MS = 5000;
/** ms to wait for exit animations to finish before restarting */
const EXIT_MS = 400;

interface EventsPitchProps {
  events: OptaEvent[];
  /** 'last' = animate events sequentially; 'all' = show all at once */
  mode?: "last" | "all";
  /** Optional map of teamId → color to distinguish teams visually */
  teamColors?: Record<string, string>;
  /** Pitch orientation: 'vertical' (default) or 'horizontal'. */
  orientation?: Orientation;
  /** Pitch surface color (default: #2d7a3a). */
  fieldColor?: string;
}

const EventsPitch: React.FC<EventsPitchProps> = ({
  events,
  mode,
  teamColors,
  orientation,
  fieldColor,
}) => {
  const [cycleEvents, setCycleEvents] = useState<OptaEvent[]>(events);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const pendingEventsRef = useRef<OptaEvent[] | null>(null);

  // In "last" mode, keep rendering the current cycle and apply updates at cycle boundaries.
  useEffect(() => {
    if (mode !== "last") {
      setCycleEvents(events);
      pendingEventsRef.current = null;
      return;
    }

    if (cycleEvents.length === 0 && visibleCount === 0 && !isExiting) {
      setCycleEvents(events);
      return;
    }

    if (events !== cycleEvents) {
      pendingEventsRef.current = events;
    }
  }, [events, mode, cycleEvents, visibleCount, isExiting]);

  // Sequential animation cycle — only active in "last" mode
  useEffect(() => {
    if (mode !== "last" || cycleEvents.length === 0) return;

    if (isExiting) {
      // Wait for exit animations to finish, then restart
      const t = setTimeout(() => {
        if (pendingEventsRef.current) {
          setCycleEvents(pendingEventsRef.current);
          pendingEventsRef.current = null;
        }
        setIsExiting(false);
        setVisibleCount(0);
      }, EXIT_MS);
      return () => clearTimeout(t);
    }

    if (visibleCount >= cycleEvents.length) {
      // All events shown — pause then trigger exit
      const t = setTimeout(() => setIsExiting(true), PAUSE_MS);
      return () => clearTimeout(t);
    }

    // Reveal next event
    const t = setTimeout(() => setVisibleCount((v) => v + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [mode, cycleEvents.length, visibleCount, isExiting]);

  const displayedEvents =
    mode === "last"
      ? isExiting
        ? []
        : cycleEvents.slice(0, visibleCount)
      : events;

  return (
    <div className="flex flex-col w-full h-full">
      <EventsPitchHeader />
      <div className="pb-4">
        <Separator />
      </div>
      <div className="flex-1 min-h-0">
        <OptaPitch orientation={orientation} fieldColor={fieldColor}>
          <OptaMarkers
            events={displayedEvents}
            animated={mode === "last"}
            teamColors={teamColors}
          />
        </OptaPitch>
      </div>
    </div>
  );
};

export default EventsPitch;
