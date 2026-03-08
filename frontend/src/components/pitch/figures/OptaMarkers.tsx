import React from "react";
import PassArrow from "./PassArrow";
import BallOutFigure, { type FieldEdge } from "./BallOutFigure";
import useOptaPitchConfigStore, { type Orientation } from "@/store/optaPitchConfigStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type Event, isPassEvent, isOutEvent } from "@/types/event";

/**
 * Determines which SVG viewport edge the ball crossed, derived from
 * raw (unclamped) Opta coordinates and the current pitch orientation.
 *
 * In Opta space x/y ∈ [0,100]. Values outside that range indicate the
 * side the ball exited from.
 *
 * Vertical pitch: Opta-X → SVG-Y (long axis), Opta-Y → SVG-X (short axis)
 * Horizontal pitch: Opta-X → SVG-X (long axis), Opta-Y → SVG-Y (short axis)
 */
function deriveFieldEdge(optaX: number, optaY: number, orientation: Orientation): FieldEdge {
  const xOut = optaX < 0 ? -optaX : optaX > 100 ? optaX - 100 : 0;
  const yOut = optaY < 0 ? -optaY : optaY > 100 ? optaY - 100 : 0;
  const useX = xOut >= yOut;

  if (orientation === "vertical") {
    // Opta X maps to SVG Y: low optaX → high SVG Y (bottom), high → top
    if (useX) return optaX <= 50 ? "bottom" : "top";
    // Opta Y maps to SVG X: low optaY → high SVG X (right), high → left
    return optaY <= 50 ? "right" : "left";
  } else {
    // Horizontal: Opta X maps to SVG X, Opta Y maps to SVG Y
    if (useX) return optaX <= 50 ? "left" : "right";
    return optaY <= 50 ? "bottom" : "top";
  }
}

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
  const orientation = useOptaPitchConfigStore((s) => s.orientation);
  const transformOptaToSvg = useOptaPitchConfigStore((s) => s.transformOptaToSvg);

  // Filter and prepare events that will actually be rendered
  const renderableEvents = events
    .map((event, originalIndex) => ({ event, originalIndex }))
    .filter(({ event }) => {
      if (event.x == null || event.y == null) return false;

      if (isPassEvent(event)) {
        return event.end_x != null && event.end_y != null;
      }

      if (isOutEvent(event)) {
        return true;
      }

      return false;
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

        // ── Ball Out ──────────────────────────────────────────────────
        if (isOutEvent(event)) {
          const edge = deriveFieldEdge(x!, y!, orientation);
          return (
            <Tooltip key={event.id}>
              <TooltipTrigger asChild>
                <g>
                  <BallOutFigure
                    svgX={svgX1}
                    svgY={svgY1}
                    edge={edge}
                    sequence={renderIndex + 1}
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
