import React, { useEffect, useState } from "react";
import OptaPitch from "@/components/pitch/OptaPitch";
import OptaMarkers, {
  type OptaEvent,
} from "@/components/pitch/figures/OptaMarkers";
import type { Orientation } from "@/store/optaPitchConfigStore";
import { EventsPitchHeader } from "./EventsPitchHeader";
import { Separator } from "@/components/ui/separator";

/** ms between each event appearing */
const STEP_MS = 700;
/** ms to pause when all events are shown before resetting */
const PAUSE_MS = 1500;
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
  const [visibleCount, setVisibleCount] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  // Reset cycle whenever the events list changes
  useEffect(() => {
    setVisibleCount(0);
    setIsExiting(false);
  }, [events]);

  // Sequential animation cycle — only active in "last" mode
  useEffect(() => {
    if (mode !== "last" || events.length === 0) return;

    if (isExiting) {
      // Wait for exit animations to finish, then restart
      const t = setTimeout(() => {
        setIsExiting(false);
        setVisibleCount(0);
      }, EXIT_MS);
      return () => clearTimeout(t);
    }

    if (visibleCount >= events.length) {
      // All events shown — pause then trigger exit
      const t = setTimeout(() => setIsExiting(true), PAUSE_MS);
      return () => clearTimeout(t);
    }

    // Reveal next event
    const t = setTimeout(() => setVisibleCount((v) => v + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [mode, events.length, visibleCount, isExiting]);

  const displayedEvents =
    mode === "last"
      ? isExiting
        ? []
        : events.slice(0, visibleCount)
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
