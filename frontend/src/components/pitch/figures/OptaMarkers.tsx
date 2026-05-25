import React from "react";
import { AnimatePresence, motion } from "motion/react";
import PassArrow from "./PassArrow";
import CarryFigure from "./CarryFigure";
import BallOutFigure, { type FieldEdge } from "./BallOutFigure";
import LinkFigure from "./LinkFigure";
import ShotFigure from "./ShotFigure";
import FoulFigure from "./FoulFigure";
import DefensiveFigure from "./DefensiveFigure";
import useOptaPitchConfigStore, {
  type Orientation,
  VB_LONG,
  VB_SHORT,
} from "@/store/optaPitchConfigStore";
import {
  type PitchEvent,
  isDefensiveEvent,
  isFoulEvent,
  isOutEvent,
  isPassEvent,
  isShotEvent,
} from "@/types/event";

/** Pitch-renderable events only. */
export type OptaEvent = PitchEvent;
export type MarkerPresentationMode = "live" | "sequences" | "all";

interface MarkerVisualState {
  isLive: boolean;
  isActive: boolean;
  opacity: number;
  markerScale: number;
  hitRadius: number;
}

export interface OptaMarkersProps {
  events: OptaEvent[];
  /** Map of teamId -> hex/css color string */
  teamColors?: Record<string, string>;
  /** Optional per-event color override, keyed by event.id */
  eventColors?: Record<string, string>;
  /** Mode-specific marker presentation; lets each event view style markers differently. */
  presentationMode?: MarkerPresentationMode;
  /** When true, events animate in/out as the visible live window changes. */
  animated?: boolean;
  /** Show connector figures (carry/link) between consecutive events. */
  showConnectors?: boolean;
}

/**
 * Determines which SVG viewport edge the ball crossed, derived from
 * raw (unclamped) Opta coordinates and the current pitch orientation.
 */
function deriveFieldEdge(optaX: number, optaY: number, orientation: Orientation): FieldEdge {
  const xOut = optaX < 0 ? -optaX : optaX > 100 ? optaX - 100 : 0;
  const yOut = optaY < 0 ? -optaY : optaY > 100 ? optaY - 100 : 0;

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

    if (minD === dXMin) return "left";
    if (minD === dXMax) return "right";
    if (minD === dYMin) return "bottom";
    return "top";
  }

  const useX = xOut >= yOut;

  if (orientation === "vertical") {
    if (useX) return optaX <= 50 ? "bottom" : "top";
    return optaY <= 50 ? "right" : "left";
  }

  if (useX) return optaX <= 50 ? "left" : "right";
  return optaY <= 50 ? "bottom" : "top";
}

function getDefensiveSubtypeLabel(typeId: string): string {
  switch (typeId) {
    case "7":
      return "Tackle";
    case "8":
      return "Interception";
    case "12":
      return "Clearance";
    case "49":
      return "Ball Recovery";
    case "44":
    case "67":
      return "Duel";
    default:
      return "Defensive";
  }
}

function getEventLabel(event: OptaEvent): string {
  if (isPassEvent(event)) return "Pass";
  if (isOutEvent(event)) return "Out";
  if (isShotEvent(event)) return "Shot";
  if (isFoulEvent(event)) return "Foul";
  if (isDefensiveEvent(event)) return getDefensiveSubtypeLabel(event.type_id);
  return "Event";
}

function getPlayerMarkerLabel(event: OptaEvent): string {
  const dorsal = event.player?.dorsal?.trim();
  if (dorsal) return dorsal;
  return "?";
}

function getLiveTagBox(
  anchorX: number,
  anchorY: number,
  label: string,
  viewBoxWidth: number,
  viewBoxHeight: number,
): { x: number; y: number; width: number; height: number } {
  const fontSize = 4.1;
  const paddingX = 3.2;
  const height = 7.2;
  const width = clamp(label.length * fontSize * 0.56 + paddingX * 2, 32, 90);
  const preferredY = anchorY + 8.5;
  const y = preferredY + height <= viewBoxHeight - 2
    ? preferredY
    : anchorY - height - 8.5;

  return {
    x: clamp(anchorX - width / 2, 2, viewBoxWidth - width - 2),
    y: clamp(y, 2, viewBoxHeight - height - 2),
    width,
    height,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getTooltipBox(
  anchorX: number,
  anchorY: number,
  lines: string[],
  viewBoxWidth: number,
  viewBoxHeight: number,
): { x: number; y: number; width: number; height: number } {
  const fontSize = 4.4;
  const paddingX = 4.2;
  const paddingY = 3.4;
  const lineHeight = 6.2;
  const gap = 7;
  const longestLine = Math.max(...lines.map((line) => line.length));
  const width = clamp(longestLine * fontSize * 0.55 + paddingX * 2, 46, 118);
  const height = paddingY * 2 + lines.length * lineHeight;
  const opensRight = anchorX + gap + width <= viewBoxWidth - 2;
  const opensTop = anchorY - gap - height >= 2;
  const rawX = opensRight ? anchorX + gap : anchorX - width - gap;
  const rawY = opensTop ? anchorY - height - gap : anchorY + gap;

  return {
    x: clamp(rawX, 2, viewBoxWidth - width - 2),
    y: clamp(rawY, 2, viewBoxHeight - height - 2),
    width,
    height,
  };
}

function EventTooltip({
  anchorX,
  anchorY,
  color,
  lines,
  viewBoxWidth,
  viewBoxHeight,
}: {
  anchorX: number;
  anchorY: number;
  color: string;
  lines: string[];
  viewBoxWidth: number;
  viewBoxHeight: number;
}) {
  const box = getTooltipBox(anchorX, anchorY, lines, viewBoxWidth, viewBoxHeight);
  const linkX = clamp(anchorX, box.x, box.x + box.width);
  const linkY = clamp(anchorY, box.y, box.y + box.height);

  return (
    <g pointerEvents="none">
      <line
        x1={anchorX}
        y1={anchorY}
        x2={linkX}
        y2={linkY}
        stroke="#0f172a"
        strokeOpacity={0.45}
        strokeWidth={0.6}
      />
      <circle
        cx={anchorX}
        cy={anchorY}
        r={5.2}
        fill="none"
        stroke="#0f172a"
        strokeOpacity={0.42}
        strokeWidth={1.4}
      />
      <circle
        cx={anchorX}
        cy={anchorY}
        r={4.2}
        fill="none"
        stroke={color}
        strokeOpacity={0.95}
        strokeWidth={0.85}
      />
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={3.5}
        fill="#111827"
        fillOpacity={0.95}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={0.5}
      />
      <rect x={box.x} y={box.y} width={2.6} height={box.height} rx={1.3} fill={color} />
      <text
        x={box.x + 5.8}
        y={box.y + 7.2}
        fontSize={4.4}
        fill="#f8fafc"
        style={{ userSelect: "none" }}
      >
        {lines.map((line, index) => (
          <tspan
            key={`${line}-${index}`}
            x={box.x + 5.8}
            dy={index === 0 ? 0 : 6.2}
            fontWeight={index === 0 ? 700 : 500}
            fill={index === 0 ? "#ffffff" : "#d1d5db"}
          >
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function LiveEventTag({
  anchorX,
  anchorY,
  color,
  label,
  viewBoxWidth,
  viewBoxHeight,
}: {
  anchorX: number;
  anchorY: number;
  color: string;
  label: string;
  viewBoxWidth: number;
  viewBoxHeight: number;
}) {
  const box = getLiveTagBox(anchorX, anchorY, label, viewBoxWidth, viewBoxHeight);

  return (
    <motion.g
      pointerEvents="none"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{ transformOrigin: `${anchorX}px ${anchorY}px` }}
    >
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={2}
        fill="#0f172a"
        fillOpacity={0.92}
        stroke={color}
        strokeOpacity={0.96}
        strokeWidth={0.65}
      />
      <text
        x={box.x + box.width / 2}
        y={box.y + box.height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={4.1}
        fontWeight={800}
        fill="#ffffff"
        style={{ userSelect: "none", fontFamily: "system-ui, sans-serif" }}
      >
        {label}
      </text>
    </motion.g>
  );
}

const OptaMarkers: React.FC<OptaMarkersProps> = ({
  events,
  teamColors = {},
  eventColors = {},
  presentationMode = "all",
  animated = false,
  showConnectors = true,
}) => {
  const orientation = useOptaPitchConfigStore((s) => s.orientation);
  const transformOptaToSvg = useOptaPitchConfigStore((s) => s.transformOptaToSvg);
  const [hoveredEventId, setHoveredEventId] = React.useState<string | null>(null);
  const viewBoxWidth = orientation === "vertical" ? VB_SHORT : VB_LONG;
  const viewBoxHeight = orientation === "vertical" ? VB_LONG : VB_SHORT;

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

  const formatCoord = (value: number | null | undefined) =>
    value == null ? "-" : Number(value.toFixed(1)).toString();

  const getTooltipLines = (event: OptaEvent, sequence: number): string[] => {
    const lines = [`${sequence}. ${getEventLabel(event)}`];
    const minute =
      event.min != null
        ? `Min ${event.min}${event.sec != null ? `:${String(event.sec).padStart(2, "0")}` : ""}`
        : null;

    if (minute) lines.push(minute);
    if (event.player?.dorsal) lines.push(`Dorsal ${event.player.dorsal}`);
    lines.push(`Inicio X ${formatCoord(event.x)} | Y ${formatCoord(event.y)}`);

    if (isPassEvent(event)) {
      lines.push(`Fin X ${formatCoord(event.end_x)} | Y ${formatCoord(event.end_y)}`);
    }

    return lines;
  };

  const renderHoverMarker = (
    event: OptaEvent,
    sequence: number,
    anchorX: number,
    anchorY: number,
    color: string,
    visualState: MarkerVisualState,
    content: React.ReactNode,
  ) => {
    const markerContent = visualState.isLive ? (
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: visualState.opacity }}
        transition={{
          opacity: { duration: 0.35, ease: "easeOut" },
        }}
      >
        {content}
      </motion.g>
    ) : (
      content
    );

    return (
      <g
        onMouseEnter={() => setHoveredEventId(event.id)}
        onMouseLeave={() => setHoveredEventId((current) => (current === event.id ? null : current))}
        cursor="help"
      >
        {visualState.isLive && visualState.isActive ? (
          <motion.circle
            cx={anchorX}
            cy={anchorY}
            r={4.5}
            fill="none"
            stroke={color}
            strokeWidth={0.75}
            initial={{ opacity: 0.85, r: 4.5 }}
            animate={{ opacity: 0, r: 13 }}
            transition={{ duration: 2.1, ease: "easeOut" }}
          />
        ) : null}
        {markerContent}
        {visualState.isLive && visualState.isActive ? (
          <LiveEventTag
            anchorX={anchorX}
            anchorY={anchorY}
            color={color}
            label={`${sequence} - ${getEventLabel(event).toUpperCase()}`}
            viewBoxWidth={viewBoxWidth}
            viewBoxHeight={viewBoxHeight}
          />
        ) : null}
        <circle
          cx={anchorX}
          cy={anchorY}
          r={visualState.hitRadius}
          fill="transparent"
          pointerEvents="all"
        />
        {hoveredEventId === event.id ? (
          <EventTooltip
            anchorX={anchorX}
            anchorY={anchorY}
            color={color}
            lines={getTooltipLines(event, sequence)}
            viewBoxWidth={viewBoxWidth}
            viewBoxHeight={viewBoxHeight}
          />
        ) : null}
      </g>
    );
  };

  const getEventPoint = (event: OptaEvent) => {
    if (isPassEvent(event) && event.end_x != null && event.end_y != null) {
      return transformOptaToSvg(event.end_x, event.end_y);
    }

    return transformOptaToSvg(event.x!, event.y!);
  };

  const getConnector = (previousEvent: OptaEvent, currentEvent: OptaEvent) => {
    const previousPoint = getEventPoint(previousEvent);
    const currentPoint = transformOptaToSvg(currentEvent.x!, currentEvent.y!);

    if (
      isPassEvent(previousEvent) &&
      isPassEvent(currentEvent) &&
      previousEvent.team_id != null &&
      previousEvent.team_id === currentEvent.team_id
    ) {
      return (
        <CarryFigure
          x1={previousPoint.x}
          y1={previousPoint.y}
          x2={currentPoint.x}
          y2={currentPoint.y}
        />
      );
    }

    return (
      <LinkFigure
        x1={previousPoint.x}
        y1={previousPoint.y}
        x2={currentPoint.x}
        y2={currentPoint.y}
      />
    );
  };

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

  const activeLiveEventIds = new Set<string>(
    presentationMode === "live" && renderableEvents.length > 0
      ? [renderableEvents[renderableEvents.length - 1].event.id]
      : [],
  );

  const getMarkerVisualState = (event: OptaEvent): MarkerVisualState => {
    if (presentationMode !== "live") {
      return {
        isLive: false,
        isActive: false,
        opacity: 1,
        markerScale: 1,
        hitRadius: 7,
      };
    }

    const isActive = activeLiveEventIds.has(event.id);

    return {
      isLive: true,
      isActive,
      opacity: isActive ? 1 : 0.42,
      markerScale: isActive ? 1.18 : 1,
      hitRadius: isActive ? 12 : 8,
    };
  };

  const markers = renderableEvents.map(({ event }, renderIndex) => {
    const { x, y, outcome, team_id } = event;
    const sequence = renderIndex + 1;
    const markerLabel = getPlayerMarkerLabel(event);
    const visualState = getMarkerVisualState(event);
    const { x: svgX1, y: svgY1 } = transformOptaToSvg(x!, y!);
    const color =
      eventColors[event.id] ??
      (team_id && teamColors[team_id] ? teamColors[team_id] : "#ffffff");
    const connector =
      showConnectors && renderIndex > 0
        ? getConnector(renderableEvents[renderIndex - 1].event, event)
        : null;

    if (isPassEvent(event)) {
      const { x: svgX2, y: svgY2 } = transformOptaToSvg(event.end_x!, event.end_y!);

      return wrap(event.id, (
        <>
          {connector}
          {renderHoverMarker(
            event,
            sequence,
            svgX1,
            svgY1,
            color,
            visualState,
            <PassArrow
              x1={svgX1}
              y1={svgY1}
              x2={svgX2}
              y2={svgY2}
              sequence={sequence}
              markerLabel={markerLabel}
              markerScale={visualState.markerScale}
              outcome={typeof outcome === "number" ? outcome : 0}
              color={color}
              animated={animated}
            />,
          )}
        </>
      ), animated);
    }

    if (isOutEvent(event)) {
      const edge = deriveFieldEdge(x!, y!, orientation);

      return wrap(event.id, (
        <>
          {connector}
          {renderHoverMarker(
            event,
            sequence,
            svgX1,
            svgY1,
            color,
            visualState,
            <BallOutFigure
              svgX={svgX1}
              svgY={svgY1}
              edge={edge}
              sequence={sequence}
              markerLabel={markerLabel}
              markerScale={visualState.markerScale}
              color={color}
            />,
          )}
        </>
      ));
    }

    if (isFoulEvent(event)) {
      return wrap(event.id, (
        <>
          {connector}
          {renderHoverMarker(
            event,
            sequence,
            svgX1,
            svgY1,
            color,
            visualState,
            <FoulFigure
              x={svgX1}
              y={svgY1}
              sequence={sequence}
              markerLabel={markerLabel}
              markerScale={visualState.markerScale}
              color={color}
            />,
          )}
        </>
      ));
    }

    if (isDefensiveEvent(event)) {
      return wrap(event.id, (
        <>
          {connector}
          {renderHoverMarker(
            event,
            sequence,
            svgX1,
            svgY1,
            color,
            visualState,
            <DefensiveFigure
              x={svgX1}
              y={svgY1}
              sequence={sequence}
              markerLabel={markerLabel}
              markerScale={visualState.markerScale}
              color={color}
            />,
          )}
        </>
      ));
    }

    if (isShotEvent(event)) {
      const goalOptaX = (event.x ?? 50) > 50 ? 100 : 0;
      const goalOptaY = event.goal_mouth_y ?? event.y ?? 50;
      const { x: svgX2, y: svgY2 } = transformOptaToSvg(goalOptaX, goalOptaY);

      return wrap(event.id, (
        <>
          {connector}
          {renderHoverMarker(
            event,
            sequence,
            svgX1,
            svgY1,
            color,
            visualState,
            <ShotFigure
              x1={svgX1}
              y1={svgY1}
              x2={svgX2}
              y2={svgY2}
              sequence={sequence}
              markerLabel={markerLabel}
              markerScale={visualState.markerScale}
              outcome={event.outcome ?? "Miss"}
              color={color}
            />,
          )}
        </>
      ));
    }

    return null;
  });

  return animated ? <AnimatePresence>{markers}</AnimatePresence> : markers;
};

export default OptaMarkers;
