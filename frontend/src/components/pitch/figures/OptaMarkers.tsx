import React from "react";
import { AnimatePresence, motion } from "motion/react";
import PassArrow from "./PassArrow";
import BallOutFigure, { type FieldEdge } from "./BallOutFigure";
import ShotFigure from "./ShotFigure";
import FoulFigure from "./FoulFigure";
import DefensiveFigure from "./DefensiveFigure";
import useOptaPitchConfigStore, { type Orientation } from "@/store/optaPitchConfigStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type PitchEvent, isDefensiveEvent, isFoulEvent, isPassEvent, isOutEvent, isShotEvent } from "@/types/event";

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

  // If feed coordinates are still inside [0,100], infer side by nearest boundary.
  // This avoids misclassifying Out events as left/right when they are actually
  // near the top/bottom touchline.
  if (xOut === 0 && yOut === 0) {
    const dXMin = optaX;
    const dXMax = 100 - optaX;
    const dYMin = optaY;
    const dYMax = 100 - optaY;
    const minD = Math.min(dXMin, dXMax, dYMin, dYMax);

    if (orientation === "vertical") {
      if (minD === dXMin) return "bottom";
      if (minD === dXMax) return "top";
      if (minD === dYMin) return "right";
      return "left";
    }

    // Horizontal: Opta-X -> SVG-X, Opta-Y -> SVG-Y (inverted)
    if (minD === dXMin) return "left";
    if (minD === dXMax) return "right";
    if (minD === dYMin) return "bottom";
    return "top";
  }

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

/** Pitch-renderable events only. */
export type OptaEvent = PitchEvent;

export interface OptaMarkersProps {
  events: OptaEvent[];
  /** Map of teamId → hex/css color string */
  teamColors?: Record<string, string>;
  /** Optional per-event color override, keyed by event.id */
  eventColors?: Record<string, string>;
  /** When true, events animate in/out sequentially (used in "last" mode) */
  animated?: boolean;
}

const OptaMarkers: React.FC<OptaMarkersProps> = ({
  events,
  teamColors = {},
  eventColors = {},
  animated = false,
}) => {
  /**
   * Wraps each marker. When `skipEnterFade=true` the wrapper starts already
   * visible — used for PassArrow which manages its own entry animation.
   */
  const wrap = (key: string, content: React.ReactNode, skipEnterFade = false) =>
    animated ? (
      <motion.g
        key={key}
        initial={{ opacity: skipEnterFade ? 1 : 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.g>
    ) : (
      <React.Fragment key={key}>{content}</React.Fragment>
    );
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

      if (isShotEvent(event)) {
        return true;
      }

      if (isFoulEvent(event) || isDefensiveEvent(event)) {
        return true;
      }

      return false;
    });

  const markers = renderableEvents.map(({ event }, renderIndex) => {
        const { x, y, outcome, team_id } = event;

        const { x: svgX1, y: svgY1 } = transformOptaToSvg(x!, y!);
        const color =
          eventColors[event.id] ??
          (team_id && teamColors[team_id] ? teamColors[team_id] : "#ffffff");

        // ── Pass ──────────────────────────────────────────────────────
        if (isPassEvent(event)) {
          const { x: svgX2, y: svgY2 } = transformOptaToSvg(
            event.end_x!,
            event.end_y!,
          );

          return wrap(event.id, (
            <Tooltip>
              <TooltipTrigger asChild>
                <g>
                  <PassArrow
                    x1={svgX1}
                    y1={svgY1}
                    x2={svgX2}
                    y2={svgY2}
                    sequence={renderIndex + 1}
                    outcome={typeof outcome === "number" ? outcome : 0}
                    color={color}
                    animated={animated}
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
          ), animated); // PassArrow handles its own enter animation
        }

        // ── Ball Out ──────────────────────────────────────────────────
        if (isOutEvent(event)) {
          const edge = deriveFieldEdge(x!, y!, orientation);
          return wrap(event.id, (
            <Tooltip>
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
          ));
        }

        // ── Foul ────────────────────────────────────────────────────────
        if (isFoulEvent(event)) {
          return wrap(event.id, (
            <Tooltip>
              <TooltipTrigger asChild>
                <g>
                  <FoulFigure
                    x={svgX1}
                    y={svgY1}
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
          ));
        }

        // ── Defensive (Tackle/Interception/Duel/Clearance/Ball Recovery) ─
        if (isDefensiveEvent(event)) {
          return wrap(event.id, (
            <Tooltip>
              <TooltipTrigger asChild>
                <g>
                  <DefensiveFigure
                    x={svgX1}
                    y={svgY1}
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
          ));
        }

        // ── Shot ──────────────────────────────────────────────────
        if (isShotEvent(event)) {
          // Determine goal-line endpoint:
          // shots with x > 50 attack toward x=100, otherwise x=0.
          const goalOptaX = (event.x ?? 50) > 50 ? 100 : 0;
          const goalOptaY = event.goal_mouth_y ?? event.y ?? 50;
          const { x: svgX2, y: svgY2 } = transformOptaToSvg(goalOptaX, goalOptaY);

          return wrap(event.id, (
            <Tooltip>
              <TooltipTrigger asChild>
                <g>
                  <ShotFigure
                    x1={svgX1}
                    y1={svgY1}
                    x2={svgX2}
                    y2={svgY2}
                    sequence={renderIndex + 1}
                    outcome={event.outcome ?? "Miss"}
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
          ));
        }

        // Additional event types can be added here as new cases
        return null;
      });

  return (
    <TooltipProvider delayDuration={80}>
      {animated ? <AnimatePresence>{markers}</AnimatePresence> : markers}
    </TooltipProvider>
  );
};

export default OptaMarkers;
