import React from "react";
import PassArrow from "./PassArrow";
import useOptaPitchConfigStore from "@/store/optaPitchConfigStore";

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
  // Subscribe to orientation so the component re-renders on layout changes;
  // transformOptaToSvg reads state via get() at call time.
  useOptaPitchConfigStore((s) => s.orientation);
  const transformOptaToSvg = useOptaPitchConfigStore((s) => s.transformOptaToSvg);

  // Filter and prepare events that will actually be rendered
  const renderableEvents = events
    .map((event, originalIndex) => ({ event, originalIndex }))
    .filter(({ event }) => {
      const { type_id, x, y, qualifiers } = event;
      if (x == null || y == null) return false;
      
      // Only include passes with valid end coordinates
      if (type_id === "1") {
        const endXQ = qualifiers.find((q) => q.qualifier_id === "140");
        const endYQ = qualifiers.find((q) => q.qualifier_id === "141");
        return endXQ && endYQ;
      }
      
      return false; // For now, only passes are rendered
    });

  return (
    <>
      {renderableEvents.map(({ event }, renderIndex) => {
        const { type_id, x, y, outcome, team_id, qualifiers } = event;

        const { x: svgX1, y: svgY1 } = transformOptaToSvg(x!, y!);
        const color =
          team_id && teamColors[team_id] ? teamColors[team_id] : "#ffffff";

        // ── Pass (type_id = "1") ──────────────────────────────────────
        if (type_id === "1") {
          const endXQ = qualifiers.find((q) => q.qualifier_id === "140")!;
          const endYQ = qualifiers.find((q) => q.qualifier_id === "141")!;

          const { x: svgX2, y: svgY2 } = transformOptaToSvg(
            parseFloat(endXQ.value),
            parseFloat(endYQ.value),
          );

          return (
            <PassArrow
              key={event.id}
              x1={svgX1}
              y1={svgY1}
              x2={svgX2}
              y2={svgY2}
              sequence={renderIndex + 1}
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
