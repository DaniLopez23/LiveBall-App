import React, { useId } from "react";
import { motion } from "motion/react";
import { transformOptaToSvgPure, type Orientation } from "@/store/optaPitchConfigStore";
import type { PassNetworkNode, PassNetworkEdge } from "@/types/passNetwork";

export interface PassNetworkElementsProps {
  nodes: PassNetworkNode[];
  edges: PassNetworkEdge[];
  /** Hex/css color for all elements (defaults to white) */
  color?: string;
  /** When true, elements animate in */
  animated?: boolean;
  /** Pitch orientation — must match the parent OptaPitch to position nodes correctly */
  orientation?: Orientation;
}

// ── Normalise a value from [0, max] to [min, max] linear range ────────
function lerp(value: number, max: number, outMin: number, outMax: number): number {
  if (max === 0) return outMin;
  return outMin + (value / max) * (outMax - outMin);
}

// ── Perpendicular offset for bidirectional edges ──────────────────────
// Returns a quadratic bezier control point offset perpendicularly
// so that A→B and B→A don't overlap.
function controlPoint(
  x1: number, y1: number,
  x2: number, y2: number,
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

const ARROW_ID = "pass-net-arrow";
const NODE_R_MIN = 3;
const NODE_R_MAX = 10;
const STROKE_MIN = 0.4;
const STROKE_MAX = 3.5;
/** Perpendicular offset (SVG units) applied to each directed edge */
const EDGE_CURVATURE = 13;
/** Arrow marker size (smaller = less intrusive tip) */
const ARROW_SIZE = 3.5;

const PassNetworkElements: React.FC<PassNetworkElementsProps> = ({
  nodes,
  edges,
  color = "#ffffff",
  animated = false,
  orientation = 'vertical',
}) => {
  const uid = useId().replace(/:/g, "");
  const arrowId = `${ARROW_ID}-${uid}`;

  // ── Pre-compute node SVG positions ─────────────────────────────────
  const nodeMap = React.useMemo(() => {
    const m = new Map<string, { svgX: number; svgY: number; node: PassNetworkNode }>();
    for (const node of nodes) {
      const { x: svgX, y: svgY } = transformOptaToSvgPure(
        node.avg_position_total.x,
        node.avg_position_total.y,
        orientation,
      );
      m.set(node.player_id, { svgX, svgY, node });
    }
    return m;
  }, [nodes, orientation]);

  // ── Normalisation bounds ────────────────────────────────────────────
  const maxNodePasses = Math.max(1, ...nodes.map((n) => n.pass_count));
  const maxEdgePasses = Math.max(1, ...edges.map((e) => e.pass_count));

  // ── Build a set of reverse-edge keys to detect bidirectional pairs ──
  const edgeKeySet = React.useMemo(() => {
    const s = new Set<string>();
    for (const e of edges) s.add(`${e.from_player_id}->${e.to_player_id}`);
    return s;
  }, [edges]);

  const hasBidirectional = (from: string, to: string) =>
    edgeKeySet.has(`${from}->${to}`) && edgeKeySet.has(`${to}->${from}`);

  return (
    <g>
      {/* ── Arrow marker definition ──────────────────────────────── */}
      <defs>
        <marker
          id={arrowId}
          markerWidth={ARROW_SIZE * 2}
          markerHeight={ARROW_SIZE * 2}
          refX={ARROW_SIZE * 1.8}
          refY={ARROW_SIZE}
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path
            d={`M0,0 L0,${ARROW_SIZE * 2} L${ARROW_SIZE * 2},${ARROW_SIZE} z`}
            fill={color}
            fillOpacity={0.85}
          />
        </marker>
      </defs>

      {/* ── Edges (drawn below nodes) ─────────────────────────────── */}
      {edges.map((edge) => {
        const from = nodeMap.get(edge.from_player_id);
        const to   = nodeMap.get(edge.to_player_id);
        if (!from || !to) return null;

        const { svgX: x1, svgY: y1 } = from;
        const { svgX: x2, svgY: y2 } = to;

        const strokeWidth = lerp(edge.pass_count, maxEdgePasses, STROKE_MIN, STROKE_MAX);
        const opacity     = lerp(edge.pass_count, maxEdgePasses, 0.3, 0.9);

        // Apply curvature only when a reverse edge also exists
        const curv = hasBidirectional(edge.from_player_id, edge.to_player_id)
          ? EDGE_CURVATURE
          : 0;

        const { cpx, cpy } = controlPoint(x1, y1, x2, y2, curv);

        // Shorten the line so the arrowhead doesn't overlap the target node
        const toR = lerp(nodeMap.get(edge.to_player_id)!.node.pass_count, maxNodePasses, NODE_R_MIN, NODE_R_MAX);
        // For bezier, approximate end point retracted along tangent at t≈1
        const tanX = x2 - cpx;
        const tanY = y2 - cpy;
        const tanLen = Math.sqrt(tanX * tanX + tanY * tanY) || 1;
        const ex = x2 - (tanX / tanLen) * (toR + 1);
        const ey = y2 - (tanY / tanLen) * (toR + 1);

        const d = curv === 0
          ? `M ${x1} ${y1} L ${ex} ${ey}`
          : `M ${x1} ${y1} Q ${cpx} ${cpy} ${ex} ${ey}`;

        const key = `${edge.from_player_id}->${edge.to_player_id}`;

        return (
          <motion.path
            key={key}
            d={d}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            fill="none"
            strokeLinecap="round"
            markerEnd={`url(#${arrowId})`}
            initial={animated ? { opacity: 0, pathLength: 0 } : false}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={
              animated
                ? { duration: 0.7, ease: "easeOut" }
                : { duration: 0 }
            }
          />
        );
      })}

      {/* ── Nodes (drawn above edges) ─────────────────────────────── */}
      {nodes.map((node) => {
        const pos = nodeMap.get(node.player_id);
        if (!pos) return null;

        const { svgX, svgY } = pos;
        const r = lerp(node.pass_count, maxNodePasses, NODE_R_MIN, NODE_R_MAX);
        const digits = String(node.pass_count).length;
        const fontSize = digits === 1 ? 3.5 : 2.8;

        return (
          <motion.g
            key={node.player_id}
            initial={animated ? { opacity: 0, scale: 0, x: svgX, y: svgY } : { x: svgX, y: svgY }}
            animate={{ opacity: 1, scale: 1, x: svgX, y: svgY }}
            transition={{
              opacity: animated ? { duration: 0.4, ease: "backOut", delay: 0.5 } : { duration: 0 },
              scale:   animated ? { duration: 0.4, ease: "backOut", delay: 0.5 } : { duration: 0 },
              x: { duration: 0.5, ease: "easeOut" },
              y: { duration: 0.5, ease: "easeOut" },
            }}
            style={{ transformOrigin: "0px 0px" }}
          >
            {/* Shadow ring */}
            <circle
              cx={0}
              cy={0}
              r={r + 0.8}
              fill="rgba(0,0,0,0.35)"
            />
            {/* Main node circle */}
            <circle
              cx={0}
              cy={0}
              r={r}
              fill={color}
              fillOpacity={0.9}
            />
            {/* Pass count */}
            <text
              x={0}
              y={0}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight="bold"
              fill="#1a1a1a"
              style={{ userSelect: "none" }}
            >
              {node.pass_count}
            </text>
          </motion.g>
        );
      })}
    </g>
  );
};

export default PassNetworkElements;