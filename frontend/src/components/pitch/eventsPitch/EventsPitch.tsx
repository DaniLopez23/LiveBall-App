import React from "react";
import OptaPitch from "@/components/pitch/OptaPitch";
import OptaMarkers, { type OptaEvent } from "@/components/pitch/figures/OptaMarkers";
import type { Orientation } from "@/store/optaPitchConfigStore";

interface EventsPitchProps {
  events: OptaEvent[];
  /** Optional map of teamId → color to distinguish teams visually */
  teamColors?: Record<string, string>;
  /** Pitch orientation: 'vertical' (default) or 'horizontal'. */
  orientation?: Orientation;
  /** Pitch surface color (default: #2d7a3a). */
  fieldColor?: string;
}

const EventsPitch: React.FC<EventsPitchProps> = ({ events, teamColors, orientation, fieldColor }) => {
  return (
    <OptaPitch orientation={orientation} fieldColor={fieldColor}>
      <OptaMarkers events={events} teamColors={teamColors} />
    </OptaPitch>
  );
};

export default EventsPitch;
