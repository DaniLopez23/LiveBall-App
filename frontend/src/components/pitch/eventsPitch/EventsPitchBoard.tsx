import OptaPitch from "@/components/pitch/OptaPitch";
import OptaMarkers, {
  type MarkerPresentationMode,
  type OptaEvent,
} from "@/components/pitch/figures/OptaMarkers";
import type { Orientation } from "@/store/optaPitchConfigStore";

interface EventsPitchBoardProps {
  events: OptaEvent[];
  mode?: MarkerPresentationMode;
  teamColors?: Record<string, string>;
  eventColors?: Record<string, string>;
  orientation?: Orientation;
  fieldColor?: string;
  animated?: boolean;
}

const EventsPitchBoard: React.FC<EventsPitchBoardProps> = ({
  events,
  mode = "all",
  teamColors,
  eventColors,
  orientation,
  fieldColor,
  animated = false,
}) => (
  <OptaPitch orientation={orientation} fieldColor={fieldColor}>
    <OptaMarkers
      events={events}
      animated={animated}
      presentationMode={mode}
      showConnectors={mode === "live" || mode === "sequences"}
      teamColors={teamColors}
      eventColors={eventColors}
    />
  </OptaPitch>
);

export default EventsPitchBoard;
