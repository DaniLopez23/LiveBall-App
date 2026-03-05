import React from "react";
import OptaPitch from "./OptaPitch";
import OptaMarkers, { type OptaEvent } from "./figures/OptaMarkers";

interface EventsPitchProps {
  events: OptaEvent[];
  /** Optional map of teamId → color to distinguish teams visually */
  teamColors?: Record<string, string>;
}

const EventsPitch: React.FC<EventsPitchProps> = ({ events, teamColors }) => {
  return (
    <OptaPitch>
      <OptaMarkers events={events} teamColors={teamColors} />
    </OptaPitch>
  );
};

export default EventsPitch;
