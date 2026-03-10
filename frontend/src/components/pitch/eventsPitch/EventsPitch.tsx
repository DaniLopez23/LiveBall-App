import React from "react";
import OptaPitch from "@/components/pitch/OptaPitch";
import OptaMarkers, {
  type OptaEvent,
} from "@/components/pitch/figures/OptaMarkers";
import type { Orientation } from "@/store/optaPitchConfigStore";
import { EventsPitchHeader } from "./EventsPitchHeader";
import { Separator } from "@/components/ui/separator";

interface EventsPitchProps {
  events: OptaEvent[];
  /** Optional map of teamId → color to distinguish teams visually */
  teamColors?: Record<string, string>;
  /** Pitch orientation: 'vertical' (default) or 'horizontal'. */
  orientation?: Orientation;
  /** Pitch surface color (default: #2d7a3a). */
  fieldColor?: string;
}

const EventsPitch: React.FC<EventsPitchProps> = ({
  events,
  teamColors,
  orientation,
  fieldColor,
}) => {
  return (
    <div className="flex flex-col w-full h-full">
      <EventsPitchHeader />
      <div className="pb-4">
        <Separator />
      </div>
      <div className="flex-1 min-h-0">
        <OptaPitch orientation={orientation} fieldColor={fieldColor}>
          <OptaMarkers events={events} teamColors={teamColors} />
        </OptaPitch>
      </div>
    </div>
  );
};

export default EventsPitch;
