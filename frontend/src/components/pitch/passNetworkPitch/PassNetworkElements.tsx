import React from "react";
import { motion } from "motion/react";
import {
  transformOptaToSvgPure,
  type Orientation,
  VB_LONG,
  VB_SHORT,
} from "@/store/optaPitchConfigStore";
import type { PassNetworkEdge, PassNetworkNode } from "@/types/passNetwork";

export interface PassNetworkElementsProps {
  nodes: PassNetworkNode[];
  edges: PassNetworkEdge[];
  /** Hex/css color for all elements (defaults to white) */
  color?: string;
  /** When true, elements animate in */
  animated?: boolean;
  /** Pitch orientation: must match the parent OptaPitch to position nodes correctly */
  orientation?: Orientation;
  /** Mirrors Opta X (length axis) to show the team on the opposite half */
  mirrorX?: boolean;
}

interface NodePosition {
  svgX: number;
  svgY: number;
  node: PassNetworkNode;
}

interface BoxLine {
  text: string;
  strong?: boolean;
}

interface WeightDomain {
  min: number;
  max: number;
}

const NODE_R_MIN = 6.8;
const NODE_R_MAX = 12.2;
const STROKE_MIN = 0.9;
const STROKE_MAX = 4.2;
const EDGE_CURVATURE = 14;
const CLOSE_EDGE_CURVATURE = 24;
const CLOSE_EDGE_GAP = 34;
const HIT_STROKE_MIN = 12;
const BOX_PADDING = 4;
const NODE_WEIGHT_CONTRAST = 0.56;
const EDGE_WEIGHT_CONTRAST = 0.66;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getWeightDomain(values: number[]): WeightDomain {
  if (values.length === 0) return { min: 0, max: 0 };

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function scaleWeight(
  value: number,
  domain: WeightDomain,
  outMin: number,
  outMax: number,
  contrast: number,
): number {
  const range = domain.max - domain.min;

  if (range <= 0) {
    return outMin + (outMax - outMin) * 0.5;
  }

  const ratio = clamp((value - domain.min) / range, 0, 1);
  const balancedRatio = clamp(0.5 + (ratio - 0.5) * contrast, 0, 1);

  return outMin + balancedRatio * (outMax - outMin);
}

function getNodeWeight(node: PassNetworkNode): number {
  const total = (node.passes_given ?? 0) + (node.passes_received ?? 0);
  return total > 0 ? total : node.pass_count;
}

function controlPoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number,
): { cpx: number; cpy: number } {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;

  return {
    cpx: mx - (dy / len) * curvature,
    cpy: my + (dx / len) * curvature,
  };
}

function getEffectiveEdgeCurvature(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  fromRadius: number,
  toRadius: number,
  isBidirectional: boolean,
): number {
  const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  const visibleGap = distance - fromRadius - toRadius;
  const closePressure = clamp((CLOSE_EDGE_GAP - visibleGap) / CLOSE_EDGE_GAP, 0, 1);
  const baseCurvature = isBidirectional ? EDGE_CURVATURE : 0;

  return baseCurvature + closePressure * CLOSE_EDGE_CURVATURE;
}

function getCompactPlayerName(playerName: string, fallback: string): string {
  const trimmedName = playerName.trim();
  if (!trimmedName) return fallback;

  const parts = trimmedName.split(/\s+/);
  const lastName = parts[parts.length - 1] ?? trimmedName;
  return lastName.length > 9 ? `${lastName.slice(0, 8)}.` : lastName;
}

function truncateText(value: string, maxLength = 30): string {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}.` : value;
}

function getReadableTextColor(backgroundColor: string): string {
  const normalized = backgroundColor.trim();
  const hex =
    normalized.length === 4 && normalized.startsWith("#")
      ? `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
      : normalized;

  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#111827";

  const red = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const green = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return luminance < 0.48 ? "#ffffff" : "#111827";
}

function getFloatingBoxPosition(
  anchorX: number,
  anchorY: number,
  width: number,
  height: number,
  viewBoxWidth: number,
  viewBoxHeight: number,
  gap = 8,
): { x: number; y: number } {
  const canOpenRight = anchorX + gap + width <= viewBoxWidth;
  const x = canOpenRight ? anchorX + gap : anchorX - width - gap;
  const y = anchorY - height / 2;

  return {
    x: clamp(x, 2, viewBoxWidth - width - 2),
    y: clamp(y, 2, viewBoxHeight - height - 2),
  };
}

function getTooltipBox(
  anchorX: number,
  anchorY: number,
  lines: BoxLine[],
  viewBoxWidth: number,
  viewBoxHeight: number,
): { x: number; y: number; width: number; height: number } {
  const fontSize = 5;
  const maxLineLength = Math.max(...lines.map((line) => line.text.length));
  const width = clamp(maxLineLength * fontSize * 0.62 + BOX_PADDING * 2, 42, 128);
  const height = BOX_PADDING * 2 + lines.length * 7;
  const x = clamp(anchorX - width / 2, 2, viewBoxWidth - width - 2);
  const y = clamp(anchorY - height - 9, 2, viewBoxHeight - height - 2);

  return { x, y, width, height };
}

function FloatingInfoBox({
  accentColor,
  lines,
  variant = "tooltip",
  x,
  y,
  width,
  height,
}: {
  accentColor: string;
  lines: BoxLine[];
  variant?: "tooltip" | "card";
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  const isCard = variant === "card";
  const fill = isCard ? "#ffffff" : "#111827";
  const stroke = isCard ? "rgba(15,23,42,0.18)" : "rgba(255,255,255,0.16)";
  const textFill = isCard ? "#111827" : "#ffffff";
  const secondaryFill = isCard ? "#475569" : "#d1d5db";

  return (
    <g pointerEvents="none">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={fill}
        fillOpacity={isCard ? 0.96 : 0.94}
        stroke={stroke}
        strokeWidth={0.6}
      />
      <rect x={x} y={y} width={2.5} height={height} rx={1.25} fill={accentColor} />
      <text x={x + BOX_PADDING + 2} y={y + BOX_PADDING + 5} fontSize={5} fill={textFill}>
        {lines.map((line, index) => (
          <tspan
            key={`${line.text}-${index}`}
            x={x + BOX_PADDING + 2}
            dy={index === 0 ? 0 : 7}
            fontWeight={line.strong ? 700 : 500}
            fill={line.strong ? textFill : secondaryFill}
          >
            {line.text}
          </tspan>
        ))}
      </text>
    </g>
  );
}

function getArrowPoints(
  tipX: number,
  tipY: number,
  directionX: number,
  directionY: number,
  size: number,
): string {
  const len = Math.sqrt(directionX * directionX + directionY * directionY) || 1;
  const ux = directionX / len;
  const uy = directionY / len;
  const px = -uy;
  const py = ux;
  const baseX = tipX - ux * size;
  const baseY = tipY - uy * size;
  const halfWidth = size * 0.48;

  return [
    `${tipX},${tipY}`,
    `${baseX + px * halfWidth},${baseY + py * halfWidth}`,
    `${baseX - px * halfWidth},${baseY - py * halfWidth}`,
  ].join(" ");
}

const PassNetworkElements: React.FC<PassNetworkElementsProps> = ({
  nodes,
  edges,
  color = "#ffffff",
  animated = false,
  orientation = "vertical",
  mirrorX = false,
}) => {
  const [hoveredNodeId, setHoveredNodeId] = React.useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = React.useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = React.useState<string | null>(null);

  const vW = orientation === "vertical" ? VB_SHORT : VB_LONG;
  const vH = orientation === "vertical" ? VB_LONG : VB_SHORT;
  const nodeTextColor = getReadableTextColor(color);

  const nodeMap = React.useMemo(() => {
    const map = new Map<string, NodePosition>();

    for (const node of nodes) {
      const optaX = mirrorX ? 100 - node.avg_position_total.x : node.avg_position_total.x;
      const { x: svgX, y: svgY } = transformOptaToSvgPure(
        optaX,
        node.avg_position_total.y,
        orientation,
      );

      map.set(node.player_id, { svgX, svgY, node });
    }

    return map;
  }, [nodes, orientation, mirrorX]);

  const nodeWeightDomain = React.useMemo(
    () => getWeightDomain(nodes.map(getNodeWeight)),
    [nodes],
  );
  const edgeWeightDomain = React.useMemo(
    () => getWeightDomain(edges.map((edge) => edge.pass_count)),
    [edges],
  );

  const edgeKeySet = React.useMemo(() => {
    const set = new Set<string>();
    for (const edge of edges) {
      set.add(`${edge.from_player_id}->${edge.to_player_id}`);
    }
    return set;
  }, [edges]);

  const nodeConnectionStats = React.useMemo(() => {
    const map = new Map<string, { inEdges: number; outEdges: number; inPasses: number; outPasses: number }>();

    for (const node of nodes) {
      map.set(node.player_id, { inEdges: 0, outEdges: 0, inPasses: 0, outPasses: 0 });
    }

    for (const edge of edges) {
      const fromStats = map.get(edge.from_player_id);
      if (fromStats) {
        fromStats.outEdges += 1;
        fromStats.outPasses += edge.pass_count;
      }

      const toStats = map.get(edge.to_player_id);
      if (toStats) {
        toStats.inEdges += 1;
        toStats.inPasses += edge.pass_count;
      }
    }

    return map;
  }, [nodes, edges]);

  const getNodeRadius = React.useCallback(
    (node: PassNetworkNode) =>
      scaleWeight(
        getNodeWeight(node),
        nodeWeightDomain,
        NODE_R_MIN,
        NODE_R_MAX,
        NODE_WEIGHT_CONTRAST,
      ),
    [nodeWeightDomain],
  );

  const hasBidirectional = React.useCallback(
    (from: string, to: string) => edgeKeySet.has(`${from}->${to}`) && edgeKeySet.has(`${to}->${from}`),
    [edgeKeySet],
  );

  const selectedNodePosition = selectedNodeId ? nodeMap.get(selectedNodeId) : null;

  return (
    <g>
      <rect
        x={0}
        y={0}
        width={vW}
        height={vH}
        fill="transparent"
        onClick={() => setSelectedNodeId(null)}
      />

      {edges.map((edge) => {
        const from = nodeMap.get(edge.from_player_id);
        const to = nodeMap.get(edge.to_player_id);
        if (!from || !to) return null;

        const { svgX: x1, svgY: y1 } = from;
        const { svgX: x2, svgY: y2 } = to;
        const fromRadius = getNodeRadius(from.node);
        const toRadius = getNodeRadius(to.node);
        const strokeWidth = scaleWeight(
          edge.pass_count,
          edgeWeightDomain,
          STROKE_MIN,
          STROKE_MAX,
          EDGE_WEIGHT_CONTRAST,
        );
        const baseOpacity = scaleWeight(
          edge.pass_count,
          edgeWeightDomain,
          0.34,
          0.78,
          EDGE_WEIGHT_CONTRAST,
        );
        const key = `${edge.from_player_id}->${edge.to_player_id}`;
        const isHovered = hoveredEdgeId === key;
        const isConnectedToHoveredNode =
          hoveredNodeId === edge.from_player_id || hoveredNodeId === edge.to_player_id;
        const isConnectedToSelectedNode =
          selectedNodeId === edge.from_player_id || selectedNodeId === edge.to_player_id;
        const shouldHighlight = isHovered || isConnectedToHoveredNode || isConnectedToSelectedNode;

        const isBidirectionalEdge = hasBidirectional(edge.from_player_id, edge.to_player_id);
        const curvature = getEffectiveEdgeCurvature(
          x1,
          y1,
          x2,
          y2,
          fromRadius,
          toRadius,
          isBidirectionalEdge,
        );
        const { cpx, cpy } = controlPoint(x1, y1, x2, y2, curvature);

        const startTanX = curvature === 0 ? x2 - x1 : cpx - x1;
        const startTanY = curvature === 0 ? y2 - y1 : cpy - y1;
        const endTanX = curvature === 0 ? x2 - x1 : x2 - cpx;
        const endTanY = curvature === 0 ? y2 - y1 : y2 - cpy;
        const startLen = Math.sqrt(startTanX * startTanX + startTanY * startTanY) || 1;
        const endLen = Math.sqrt(endTanX * endTanX + endTanY * endTanY) || 1;
        const startX = x1 + (startTanX / startLen) * (fromRadius + 0.8);
        const startY = y1 + (startTanY / startLen) * (fromRadius + 0.8);
        const arrowSize = clamp(strokeWidth * 2.15, 3.8, 7.2);
        const tipX = x2 - (endTanX / endLen) * (toRadius + 0.9);
        const tipY = y2 - (endTanY / endLen) * (toRadius + 0.9);
        const endX = tipX - (endTanX / endLen) * arrowSize;
        const endY = tipY - (endTanY / endLen) * arrowSize;
        const pathD =
          curvature === 0
            ? `M ${startX} ${startY} L ${endX} ${endY}`
            : `M ${startX} ${startY} Q ${cpx} ${cpy} ${endX} ${endY}`;
        const arrowPoints = getArrowPoints(tipX, tipY, endTanX, endTanY, arrowSize);

        return (
          <motion.g
            key={key}
            initial={animated ? { opacity: 0 } : false}
            animate={{ opacity: shouldHighlight ? 1 : 0.95 }}
            transition={animated ? { duration: 0.45, ease: "easeOut" } : { duration: 0.12 }}
          >
            <path
              d={pathD}
              stroke="#020617"
              strokeWidth={strokeWidth + 1.6}
              strokeOpacity={shouldHighlight ? 0.24 : 0.16}
              fill="none"
              strokeLinecap="round"
              pointerEvents="none"
            />
            <motion.path
              d={pathD}
              stroke={color}
              strokeWidth={shouldHighlight ? strokeWidth + 0.55 : strokeWidth}
              strokeOpacity={shouldHighlight ? 0.95 : baseOpacity}
              fill="none"
              strokeLinecap="round"
              initial={animated ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={animated ? { duration: 0.7, ease: "easeOut" } : { duration: 0 }}
              pointerEvents="none"
            />
            <polygon
              points={arrowPoints}
              fill="#020617"
              fillOpacity={shouldHighlight ? 0.26 : 0.18}
              transform={`translate(${(endTanY / endLen) * 0.45} ${(-endTanX / endLen) * 0.45})`}
              pointerEvents="none"
            />
            <polygon
              points={arrowPoints}
              fill={color}
              fillOpacity={shouldHighlight ? 0.98 : clamp(baseOpacity + 0.12, 0.35, 0.9)}
              pointerEvents="none"
            />
            <path
              d={pathD}
              stroke="transparent"
              strokeWidth={Math.max(HIT_STROKE_MIN, strokeWidth + 8)}
              fill="none"
              strokeLinecap="round"
              pointerEvents="stroke"
              onMouseEnter={() => setHoveredEdgeId(key)}
              onMouseLeave={() => setHoveredEdgeId((current) => (current === key ? null : current))}
            />
          </motion.g>
        );
      })}

      {edges.map((edge) => {
        const from = nodeMap.get(edge.from_player_id);
        const to = nodeMap.get(edge.to_player_id);
        const key = `${edge.from_player_id}->${edge.to_player_id}`;
        if (!from || !to || hoveredEdgeId !== key) return null;

        const curvature = getEffectiveEdgeCurvature(
          from.svgX,
          from.svgY,
          to.svgX,
          to.svgY,
          getNodeRadius(from.node),
          getNodeRadius(to.node),
          hasBidirectional(edge.from_player_id, edge.to_player_id),
        );
        const { cpx, cpy } = controlPoint(from.svgX, from.svgY, to.svgX, to.svgY, curvature);
        const midX = curvature === 0
          ? (from.svgX + to.svgX) / 2
          : 0.25 * from.svgX + 0.5 * cpx + 0.25 * to.svgX;
        const midY = curvature === 0
          ? (from.svgY + to.svgY) / 2
          : 0.25 * from.svgY + 0.5 * cpy + 0.25 * to.svgY;
        const lines: BoxLine[] = [
          {
            text: `${truncateText(from.node.player_name, 18)} -> ${truncateText(to.node.player_name, 18)}`,
            strong: true,
          },
          { text: `Pases: ${edge.pass_count}` },
        ];
        const box = getTooltipBox(midX, midY, lines, vW, vH);

        return (
          <FloatingInfoBox
            key={`edge-tip-${key}`}
            accentColor={color}
            lines={lines}
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
          />
        );
      })}

      {nodes.map((node) => {
        const position = nodeMap.get(node.player_id);
        if (!position) return null;

        const { svgX, svgY } = position;
        const radius = getNodeRadius(node);
        const weight = getNodeWeight(node);
        const label = getCompactPlayerName(node.player_name, String(node.player_id));
        const fontSize = clamp((radius * 1.45) / Math.max(label.length * 0.58, 1), 2.8, 5.2);
        const isFocused = hoveredNodeId === node.player_id || selectedNodeId === node.player_id;
        const haloRadius = radius + (isFocused ? 3.4 : 1.4);

        return (
          <motion.g
            key={node.player_id}
            initial={animated ? { opacity: 0, scale: 0, x: svgX, y: svgY } : { x: svgX, y: svgY }}
            animate={{ opacity: 1, scale: 1, x: svgX, y: svgY }}
            onMouseEnter={() => setHoveredNodeId(node.player_id)}
            onMouseLeave={() => setHoveredNodeId((current) => (current === node.player_id ? null : current))}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedNodeId((current) => (current === node.player_id ? null : node.player_id));
            }}
            transition={{
              opacity: animated ? { duration: 0.4, ease: "backOut", delay: 0.45 } : { duration: 0 },
              scale: animated ? { duration: 0.4, ease: "backOut", delay: 0.45 } : { duration: 0 },
              x: { duration: 0.5, ease: "easeOut" },
              y: { duration: 0.5, ease: "easeOut" },
            }}
            style={{ transformOrigin: "0px 0px" }}
            role="button"
            aria-label={`Jugador ${node.player_name}`}
            cursor="pointer"
          >
            <circle cx={0} cy={0} r={haloRadius} fill="#020617" fillOpacity={isFocused ? 0.36 : 0.24} />
            <circle
              cx={0}
              cy={0}
              r={radius}
              fill={color}
              fillOpacity={0.96}
              stroke="#ffffff"
              strokeOpacity={isFocused ? 0.95 : 0.62}
              strokeWidth={isFocused ? 1.3 : 0.7}
            />
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight={800}
              fill={nodeTextColor}
              pointerEvents="none"
              style={{ userSelect: "none" }}
            >
              {label}
            </text>
            <title>{`${node.player_name} - peso ${weight}`}</title>
          </motion.g>
        );
      })}

      {nodes.map((node) => {
        const position = nodeMap.get(node.player_id);
        if (!position || hoveredNodeId !== node.player_id || selectedNodeId === node.player_id) return null;

        const lines: BoxLine[] = [
          { text: truncateText(node.player_name), strong: true },
          { text: `Peso: ${getNodeWeight(node)}` },
          { text: `Dados: ${node.passes_given} | Recibidos: ${node.passes_received}` },
        ];
        const box = getTooltipBox(position.svgX, position.svgY - getNodeRadius(node), lines, vW, vH);

        return (
          <FloatingInfoBox
            key={`node-tip-${node.player_id}`}
            accentColor={color}
            lines={lines}
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
          />
        );
      })}

      {selectedNodePosition ? (
        (() => {
          const node = selectedNodePosition.node;
          const stats = nodeConnectionStats.get(node.player_id) ?? {
            inEdges: 0,
            outEdges: 0,
            inPasses: 0,
            outPasses: 0,
          };
          const width = 100;
          const height = 57;
          const { x, y } = getFloatingBoxPosition(
            selectedNodePosition.svgX,
            selectedNodePosition.svgY,
            width,
            height,
            vW,
            vH,
          );
          const lines: BoxLine[] = [
            { text: truncateText(node.player_name, 27), strong: true },
            { text: `Peso total: ${getNodeWeight(node)}` },
            { text: `Pases dados: ${node.passes_given}` },
            { text: `Pases recibidos: ${node.passes_received}` },
            { text: `Relaciones: ${stats.outEdges} sal. / ${stats.inEdges} ent.` },
            { text: `ID: ${truncateText(node.player_id, 22)}` },
          ];

          return (
            <FloatingInfoBox
              accentColor={color}
              lines={lines}
              variant="card"
              x={x}
              y={y}
              width={width}
              height={height}
            />
          );
        })()
      ) : null}
    </g>
  );
};

export default PassNetworkElements;
