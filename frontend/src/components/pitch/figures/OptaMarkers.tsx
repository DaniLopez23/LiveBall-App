import React from "react";
import PassArrow from "./PassArrow";
import useOptaPitchConfigStore from "@/store/optaPitchConfigStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type Event, isPassEvent } from "@/types/event";

/** Alias so other components can import OptaEvent from this file as before. */
export type OptaEvent = Event;

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
      if (event.x == null || event.y == null) return false;

      if (isPassEvent(event)) {
        return event.end_x != null && event.end_y != null;
      }

      return false; // For now, only passes are rendered
    });

  return (
    <TooltipProvider delayDuration={80}>
      {renderableEvents.map(({ event }, renderIndex) => {
        const { x, y, outcome, team_id } = event;

        const { x: svgX1, y: svgY1 } = transformOptaToSvg(x!, y!);
        const color =
          team_id && teamColors[team_id] ? teamColors[team_id] : "#ffffff";

        // ── Pass ──────────────────────────────────────────────────────
        if (isPassEvent(event)) {
          const { x: svgX2, y: svgY2 } = transformOptaToSvg(
            event.end_x!,
            event.end_y!,
          );

          return (
            <Tooltip key={event.id}>
              <TooltipTrigger asChild>
                <g>
                  <PassArrow
                    x1={svgX1}
                    y1={svgY1}
                    x2={svgX2}
                    y2={svgY2}
                    sequence={renderIndex + 1}
                    outcome={outcome ?? 0}
                    color={color}
                  />
                </g>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={2}>
                <div className="space-y-0.5">
                  <div>ID {event.id}</div>
                  {x != null && y != null ? <div>X: {x} | Y: {y}</div> : null}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        }

        // Additional event types can be added here as new cases
        return null;
      })}
    </TooltipProvider>
  );
};

export default OptaMarkers;
