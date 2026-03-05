import React from "react";
import useOptaCoordinates from "@/hooks/useOptaCoordinates.ts";
import PassArrow from "./PassArrow";

// Must match OptaPitch viewBox constants
const VB_WIDTH = 200;
const VB_HEIGHT = 300;
const MARGIN = 5;

export interface OptaQualifier {
  qualifier_id: string;
  qualifier_name: string;
  value: string;
}

export interface OptaEvent {
  id: string;
  event_id: string;
  type_id: string;
  event_name: string;
  x?: number | null;
  y?: number | null;
  outcome?: number | null;
  team_id?: string | null;
  player_id?: string | null;
  qualifiers: OptaQualifier[];
}

export interface OptaMarkersProps {
  events: OptaEvent[];
  /** Map of teamId → hex/css color string */
  teamColors?: Record<string, string>;
}

const OptaMarkers: React.FC<OptaMarkersProps> = ({ events, teamColors = {} }) => {
  const { transformX, transformY } = useOptaCoordinates(VB_WIDTH, VB_HEIGHT, MARGIN);

  return (
    <>
      {events.map((event, index) => {
        const { type_id, x, y, outcome, team_id, qualifiers } = event;

        if (x == null || y == null) return null;

        const svgX1 = transformX(x);
        const svgY1 = transformY(y);
        const color =
          team_id && teamColors[team_id] ? teamColors[team_id] : "#ffffff";

        // ── Pass (type_id = "1") ──────────────────────────────────────
        if (type_id === "1") {
          const endXQ = qualifiers.find((q) => q.qualifier_id === "140");
          const endYQ = qualifiers.find((q) => q.qualifier_id === "141");

          if (!endXQ || !endYQ) return null;

          const svgX2 = transformX(parseFloat(endXQ.value));
          const svgY2 = transformY(parseFloat(endYQ.value));

          return (
            <PassArrow
              key={event.id}
              x1={svgX1}
              y1={svgY1}
              x2={svgX2}
              y2={svgY2}
              sequence={index + 1}
              outcome={outcome ?? 0}
              color={color}
            />
          );
        }

        // Additional event types can be added here as new cases
        return null;
      })}
    </>
  );
};

export default OptaMarkers;
