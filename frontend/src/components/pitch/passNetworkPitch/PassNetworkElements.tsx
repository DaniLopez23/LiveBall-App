import React, { useId } from "react";
import { motion } from "motion/react";
import { transformOptaToSvgPure, type Orientation, VB_SHORT, VB_LONG, MARGIN } from "@/store/optaPitchConfigStore";
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
  /** Mirrors Opta X (length axis) to show the team on the opposite half */
  mirrorX?: boolean;
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
  mirrorX = false,
}) => {
  const uid = useId().replace(/:/g, "");
  const arrowId = `${ARROW_ID}-${uid}`;
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = React.useState<string | null>(null);

  // Viewbox dims based on orientation prop (matches OptaPitch logic)
  const vW = orientation === 'vertical' ? VB_SHORT : VB_LONG;
  const vH = orientation === 'vertical' ? VB_LONG  : VB_SHORT;

  // ── Pre-compute node SVG positions ─────────────────────────────────
  const nodeMap = React.useMemo(() => {
    const m = new Map<string, { svgX: number; svgY: number; node: PassNetworkNode }>();
    for (const node of nodes) {
      const optaX = mirrorX ? 100 - node.avg_position_total.x : node.avg_position_total.x;
      const { x: svgX, y: svgY } = transformOptaToSvgPure(
        optaX,
        node.avg_position_total.y,
        orientation,
      );
      m.set(node.player_id, { svgX, svgY, node });
    }
    return m;
  }, [nodes, orientation, mirrorX]);

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
              onMouseEnter={() => setHoveredEdge(key)}
              onMouseLeave={() => setHoveredEdge((k) => (k === key ? null : k))}
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
        // Display player id truncated to 3 digits inside the node.
        const idStr = String(node.player_id);
        const displayId = idStr.slice(0, 3);
        const idLen = displayId.length;
        const fontSize = idLen <= 3 ? 3.5 : idLen <= 6 ? 3.0 : 2.4;
        const totalWeight = (node.passes_given ?? 0) + (node.passes_received ?? 0);

        return (
          <motion.g
            key={node.player_id}
            initial={animated ? { opacity: 0, scale: 0, x: svgX, y: svgY } : { x: svgX, y: svgY }}
            animate={{ opacity: 1, scale: 1, x: svgX, y: svgY }}
            onMouseEnter={() => setHoveredId(node.player_id)}
            onMouseLeave={() => setHoveredId((id) => (id === node.player_id ? null : id))}
            transition={{
              opacity: animated ? { duration: 0.4, ease: "backOut", delay: 0.5 } : { duration: 0 },
              scale:   animated ? { duration: 0.4, ease: "backOut", delay: 0.5 } : { duration: 0 },
              x: { duration: 0.5, ease: "easeOut" },
              y: { duration: 0.5, ease: "easeOut" },
            }}
            style={{ transformOrigin: "0px 0px" }}
            role="button"
            aria-label={`Jugador ${node.player_id}`}
            cursor="pointer"
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
            {/* Player id (displayed, truncated to 3 chars) */}
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
              {displayId}
            </text>

            {/* Hover info box (full id + total weight) — clamp inside viewBox */}
            {hoveredId === node.player_id ? (
              (() => {
                const label = `ID: ${node.player_id} — Peso: ${totalWeight}`;
                const tipFont = 6; // mucho más grande
                const padding = 4;
                const estWidth = Math.max(label.length * tipFont * 0.7 + padding * 2, 36);
                const estHeight = tipFont * 1.6 + padding * 2;
                let tipX = -estWidth / 2;
                let tipY = -(r + estHeight + 4);

                // Absolute position of tip in SVG coords
                let absLeft = svgX + tipX;
                let absTop = svgY + tipY;

                // Clamp horizontally
                if (absLeft < 0) tipX += -absLeft;
                if (absLeft + estWidth > vW) tipX -= (absLeft + estWidth - vW);

                // Clamp vertically
                if (absTop < 0) tipY += -absTop;
                if (absTop + estHeight > vH) tipY -= (absTop + estHeight - vH);

                return (
                  <g>
                    <rect
                      x={tipX}
                      y={tipY}
                      width={estWidth}
                      height={estHeight}
                      rx={3}
                      fill="#111"
                      fillOpacity={0.95}
                    />
                    <text
                      x={0}
                      y={tipY + estHeight / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={tipFont}
                      fill="#fff"
                      style={{ userSelect: "none" }}
                    >
                      {label}
                    </text>
                  </g>
                );
              })()
            ) : null}
          </motion.g>
        );
      })}

      {/* Edge hover label (rendered at computed midpoint, clamped) */}
      {edges.map((edge) => {
        const from = nodeMap.get(edge.from_player_id);
        const to   = nodeMap.get(edge.to_player_id);
        if (!from || !to) return null;

        const { svgX: x1, svgY: y1 } = from;
        const { svgX: x2, svgY: y2 } = to;

        const curv = hasBidirectional(edge.from_player_id, edge.to_player_id)
          ? EDGE_CURVATURE
          : 0;
        const { cpx, cpy } = controlPoint(x1, y1, x2, y2, curv);

        // Midpoint of quadratic bezier at t=0.5
        const midX = 0.25 * x1 + 0.5 * cpx + 0.25 * x2;
        const midY = 0.25 * y1 + 0.5 * cpy + 0.25 * y2;

        const key = `${edge.from_player_id}->${edge.to_player_id}`;
        const weight = edge.pass_count;

        // Render small hover box when hoveredEdge matches
        return hoveredEdge === key ? (
          (() => {
            const label = `${weight}`;
            const tipFont = 5;
            const padding = 3;
            const estWidth = Math.max(label.length * tipFont * 0.8 + padding * 2, 24);
            const estHeight = tipFont * 1.6 + padding * 2;
            let tipX = midX - estWidth / 2;
            let tipY = midY - estHeight / 2;

            // Clamp to viewBox
            if (tipX < 0) tipX = 0;
            if (tipX + estWidth > vW) tipX = vW - estWidth;
            if (tipY < 0) tipY = 0;
            if (tipY + estHeight > vH) tipY = vH - estHeight;

            return (
              <g key={`hover-edge-${key}`}>
                <rect x={tipX} y={tipY} width={estWidth} height={estHeight} rx={2} fill="#000" fillOpacity={0.9} />
                <text x={tipX + estWidth / 2} y={tipY + estHeight / 2} textAnchor="middle" dominantBaseline="central" fontSize={tipFont} fill="#fff">{label}</text>
              </g>
            );
          })()
        ) : null;
      })}
    </g>
  );
};

export default PassNetworkElements;