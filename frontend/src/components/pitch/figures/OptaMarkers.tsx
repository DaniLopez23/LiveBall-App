import React from "react";
import { AnimatePresence, motion } from "motion/react";
import PassArrow from "./PassArrow";
import CarryFigure from "./CarryFigure";
import BallOutFigure, { type FieldEdge } from "./BallOutFigure";
import LinkFigure from "./LinkFigure";
import ShotFigure from "./ShotFigure";
import FoulFigure from "./FoulFigure";
import DefensiveFigure from "./DefensiveFigure";
import TakeOnFigure from "./TakeOnFigure";
import useOptaPitchConfigStore, {
  type Orientation,
  transformOptaToSvgPure,
  VB_LONG,
  VB_SHORT,
} from "@/store/optaPitchConfigStore";
import {
  formatEventTime,
  getActionLabel,
} from "@/components/pitch/eventsPitch/eventDisplay";
import { getShotTargetOptaCoordinate } from "@/lib/eventPitchCoordinates";
import {
  type PitchEvent,
  isDefensiveEvent,
  isFoulEvent,
  isOutEvent,
  isPassEvent,
  isShotEvent,
  isTakeOnEvent,
} from "@/types/event";

/** Pitch-renderable events only. */
export type OptaEvent = PitchEvent;
export type MarkerPresentationMode = "live" | "sequences" | "all";

interface MarkerVisualState {
  isLive: boolean;
  isActive: boolean;
  isHighlighted: boolean;
  hideSequenceLabel: boolean;
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
  /** Optional orientation override. Must match the pitch it is rendered inside. */
  orientation?: Orientation;
  /** When true, events animate in/out as the visible live window changes. */
  animated?: boolean;
  /** Show connector figures (carry/link) between consecutive events. */
  showConnectors?: boolean;
  /** Multiplies marker size while keeping coordinates untouched. */
  markerScaleMultiplier?: number;
  /** Event id that should stand out inside a selected sequence. */
  highlightedEventId?: string | null;
  /** Away team id, used to orient relative shot goal-mouth coordinates. */
  awayTeamId?: string | null;
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

function getEventLabel(event: OptaEvent): string {
  return getActionLabel(event.type_id);
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
  scale = 1,
): { x: number; y: number; width: number; height: number } {
  const fontSize = 4.4 * scale;
  const paddingX = 4.2 * scale;
  const paddingY = 3.4 * scale;
  const lineHeight = 6.2 * scale;
  const gap = 7 * scale;
  const longestLine = Math.max(...lines.map((line) => line.length));
  const width = clamp(longestLine * fontSize * 0.55 + paddingX * 2, 46 * scale, 118 * scale);
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
  scale = 1,
}: {
  anchorX: number;
  anchorY: number;
  color: string;
  lines: string[];
  viewBoxWidth: number;
  viewBoxHeight: number;
  scale?: number;
}) {
  const box = getTooltipBox(anchorX, anchorY, lines, viewBoxWidth, viewBoxHeight, scale);
  const linkX = clamp(anchorX, box.x, box.x + box.width);
  const linkY = clamp(anchorY, box.y, box.y + box.height);
  const sideBarWidth = 2.6 * scale;
  const textX = box.x + 5.8 * scale;

  return (
    <g pointerEvents="none">
      <line
        x1={anchorX}
        y1={anchorY}
        x2={linkX}
        y2={linkY}
        stroke="#0f172a"
        strokeOpacity={0.45}
        strokeWidth={0.6 * scale}
      />
      <circle
        cx={anchorX}
        cy={anchorY}
        r={5.2 * scale}
        fill="none"
        stroke="#0f172a"
        strokeOpacity={0.42}
        strokeWidth={1.4 * scale}
      />
      <circle
        cx={anchorX}
        cy={anchorY}
        r={4.2 * scale}
        fill="none"
        stroke={color}
        strokeOpacity={0.95}
        strokeWidth={0.85 * scale}
      />
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        rx={3.5 * scale}
        fill="#111827"
        fillOpacity={0.95}
        stroke="rgba(255,255,255,0.22)"
        strokeWidth={0.5 * scale}
      />
      <rect
        x={box.x}
        y={box.y}
        width={sideBarWidth}
        height={box.height}
        rx={1.3 * scale}
        fill={color}
      />
      <text
        x={textX}
        y={box.y + 7.2 * scale}
        fontSize={4.4 * scale}
        fill="#f8fafc"
        style={{ userSelect: "none" }}
      >
        {lines.map((line, index) => (
          <tspan
            key={`${line}-${index}`}
            x={textX}
            dy={index === 0 ? 0 : 6.2 * scale}
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
  orientation: orientationProp,
  animated = false,
  showConnectors = true,
  markerScaleMultiplier = 1,
  highlightedEventId,
  awayTeamId,
}) => {
  const storeOrientation = useOptaPitchConfigStore((s) => s.orientation);
  const orientation = orientationProp ?? storeOrientation;
  const transformOptaToSvg = React.useCallback(
    (optaX: number, optaY: number) => transformOptaToSvgPure(optaX, optaY, orientation),
    [orientation],
  );
  const [hoveredEventId, setHoveredEventId] = React.useState<string | null>(null);
  const viewBoxWidth = orientation === "vertical" ? VB_SHORT : VB_LONG;
  const viewBoxHeight = orientation === "vertical" ? VB_LONG : VB_SHORT;
  const safeMarkerScaleMultiplier = clamp(markerScaleMultiplier, 0.75, 1.8);
  const tooltipScale = clamp(markerScaleMultiplier, 1, 1.45);

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
    const playerDorsal = event.player?.dorsal?.trim() || "-";
    const playerName = event.player?.name?.trim() || "-";
    const endCoordinates = isPassEvent(event)
      ? { x: event.end_x, y: event.end_y }
      : { x: null, y: null };
    const hasEndCoordinates =
      endCoordinates.x != null &&
      endCoordinates.y != null &&
      Number.isFinite(endCoordinates.x) &&
      Number.isFinite(endCoordinates.y);

    const lines = [
      `${sequence}. ${getEventLabel(event)} - ${formatEventTime(event.min, event.sec)}`,
      `Dorsal ${playerDorsal} - ${playerName}`,
      `Coordenadas inicio (${formatCoord(event.x)}, ${formatCoord(event.y)})`,
    ];

    if (hasEndCoordinates) {
      lines.push(
        `Coordenadas fin (${formatCoord(endCoordinates.x)}, ${formatCoord(endCoordinates.y)})`,
      );
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
        {visualState.isHighlighted ? (
          <g pointerEvents="none">
            <motion.circle
              cx={anchorX}
              cy={anchorY}
              r={8.5}
              fill="none"
              stroke="#ffffff"
              strokeWidth={1.2}
              strokeOpacity={0.92}
              initial={{ opacity: 0.78, r: 8.5 }}
              animate={{ opacity: [0.78, 0.18, 0.78], r: [8.5, 15.5, 8.5] }}
              transition={{ duration: 1.65, ease: "easeOut", repeat: Infinity }}
            />
            <circle
              cx={anchorX}
              cy={anchorY}
              r={7.4}
              fill={color}
              fillOpacity={0.18}
              stroke="#ffffff"
              strokeOpacity={0.96}
              strokeWidth={1.25}
            />
          </g>
        ) : null}
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

      if (isTakeOnEvent(event) || isFoulEvent(event) || isDefensiveEvent(event)) {
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
    const isHighlighted = highlightedEventId === event.id;

    if (presentationMode !== "live") {
      return {
        isLive: false,
        isActive: false,
        isHighlighted,
        hideSequenceLabel: presentationMode === "all",
        opacity: 1,
        markerScale: (isHighlighted ? 1.46 : 1) * safeMarkerScaleMultiplier,
        hitRadius: (isHighlighted ? 15 : 7) * safeMarkerScaleMultiplier,
      };
    }

    const isActive = activeLiveEventIds.has(event.id);

    return {
      isLive: true,
      isActive,
      isHighlighted,
      hideSequenceLabel: isActive,
      opacity: isActive ? 1 : 0.42,
      markerScale: (isActive ? 1.18 : 1) * (isHighlighted ? 1.3 : 1) * safeMarkerScaleMultiplier,
      hitRadius: (isActive ? 12 : isHighlighted ? 15 : 8) * safeMarkerScaleMultiplier,
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
              showSequenceLabel={!visualState.hideSequenceLabel}
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
              showSequenceLabel={!visualState.hideSequenceLabel}
            />,
          )}
        </>
      ));
    }

    if (isTakeOnEvent(event)) {
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
            <TakeOnFigure
              x={svgX1}
              y={svgY1}
              sequence={sequence}
              markerLabel={markerLabel}
              markerScale={visualState.markerScale}
              outcome={typeof outcome === "number" ? outcome : 0}
              color={color}
              showSequenceLabel={!visualState.hideSequenceLabel}
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
              showSequenceLabel={!visualState.hideSequenceLabel}
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
              showSequenceLabel={!visualState.hideSequenceLabel}
            />,
          )}
        </>
      ));
    }

    if (isShotEvent(event)) {
      const { x: goalOptaX, y: goalOptaY } = getShotTargetOptaCoordinate(
        event,
        awayTeamId,
      );
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
              showSequenceLabel={!visualState.hideSequenceLabel}
            />,
          )}
        </>
      ));
    }

    return null;
  });

  const hoveredEventTooltip = (() => {
    if (!hoveredEventId) return null;

    const hoveredIndex = renderableEvents.findIndex(
      ({ event }) => event.id === hoveredEventId,
    );
    if (hoveredIndex < 0) return null;

    const event = renderableEvents[hoveredIndex].event;
    const { x, y } = transformOptaToSvg(event.x!, event.y!);
    const color =
      eventColors[event.id] ??
      (event.team_id && teamColors[event.team_id]
        ? teamColors[event.team_id]
        : "#ffffff");

    return (
      <EventTooltip
        anchorX={x}
        anchorY={y}
        color={color}
        lines={getTooltipLines(event, hoveredIndex + 1)}
        viewBoxWidth={viewBoxWidth}
        viewBoxHeight={viewBoxHeight}
        scale={tooltipScale}
      />
    );
  })();

  return (
    <>
      {animated ? <AnimatePresence>{markers}</AnimatePresence> : markers}
      {hoveredEventTooltip}
    </>
  );
};

export default OptaMarkers;
