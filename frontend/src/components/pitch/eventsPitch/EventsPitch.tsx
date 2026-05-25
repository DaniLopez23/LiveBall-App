import React from "react";
import OptaPitch from "@/components/pitch/OptaPitch";
import OptaMarkers, {
  type OptaEvent,
} from "@/components/pitch/figures/OptaMarkers";
import type { Orientation } from "@/store/optaPitchConfigStore";
import { EventsPitchHeader } from "./EventsPitchHeader";
import { Separator } from "@/components/ui/separator";
import type { EventsMode } from "./EventsPitchFilters";

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
}

const EventsPitch: React.FC<EventsPitchProps> = ({
  events,
  mode,
  teamColors,
  eventColors,
  orientation,
  fieldColor,
  showHeader = true,
}) => {
  const animated = mode === "live";

  return (
    <div className="flex flex-col w-full h-full">
      {showHeader ? (
        <>
          <EventsPitchHeader />
          <div className="pb-4">
            <Separator />
          </div>
        </>
      ) : null}
      <div className="flex-1 min-h-0">
        <OptaPitch orientation={orientation} fieldColor={fieldColor}>
          <OptaMarkers
            events={events}
            animated={animated}
            presentationMode={mode ?? "all"}
            showConnectors={animated}
            teamColors={teamColors}
            eventColors={eventColors}
          />
        </OptaPitch>
      </div>
    </div>
  );
};

export default EventsPitch;
