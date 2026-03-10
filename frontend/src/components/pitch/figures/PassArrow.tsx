import React from "react";
import { motion } from "motion/react";

export interface PassArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sequence: number;
  outcome: number; // 1 = success, 0 = fail
  color?: string;
  /** When true, plays enter animation (line draws + elements scale in) */
  animated?: boolean;
}

const CIRCLE_R = 2.3;
const ARROW_LEN = 4;
const ARROW_ANGLE = Math.PI / 6; // 30°
const CROSS_SIZE = 2;

const PassArrow: React.FC<PassArrowProps> = ({
  x1,
  y1,
  x2,
  y2,
  sequence,
  outcome,
  color = "#ffffff",
  animated = false,
}) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const success = outcome === 1;

  // Line starts from the edge of the start circle
  const lineX1 = x1 + CIRCLE_R * Math.cos(angle);
  const lineY1 = y1 + CIRCLE_R * Math.sin(angle);

  // Arrowhead vertices
  const ax1 = x2 - ARROW_LEN * Math.cos(angle - ARROW_ANGLE);
  const ay1 = y2 - ARROW_LEN * Math.sin(angle - ARROW_ANGLE);
  const ax2 = x2 - ARROW_LEN * Math.cos(angle + ARROW_ANGLE);
  const ay2 = y2 - ARROW_LEN * Math.sin(angle + ARROW_ANGLE);

  // Line ends at the base of the arrow (for success) or center of cross (for fail)
  const lineEndOffset = success ? ARROW_LEN * 0.7 : 0;
  const lineX2 = x2 - lineEndOffset * Math.cos(angle);
  const lineY2 = y2 - lineEndOffset * Math.sin(angle);

  const digits = String(sequence).length;
  const fontSize = digits === 1 ? 3.5 : digits === 2 ? 3 : 2.4;

  // SVG path string for the pass line
  const linePath = `M ${lineX1} ${lineY1} L ${lineX2} ${lineY2}`;

  return (
    <g>
      {/* Shadow line — draws itself for contrast */}
      <motion.path
        d={linePath}
        stroke="rgba(0,0,0,0.45)"
        strokeWidth={1.0}
        strokeLinecap="round"
        fill="none"
        initial={animated ? { opacity: 0, pathLength: 0 } : false}
        animate={{ opacity: 0.4, pathLength: 1 }}
        transition={animated ? { duration: 0.7, ease: "easeOut" } : { duration: 0 }}
      />

      {/* Main line — draws itself */}
      <motion.path
        d={linePath}
        stroke={color}
        strokeWidth={0.6}
        strokeLinecap="round"
        fill="none"
        initial={animated ? { opacity: 0, pathLength: 0 } : false}
        animate={{ opacity: 1, pathLength: 1 }}
        transition={animated ? { duration: 0.6, ease: "easeOut", delay: 0.05 } : { duration: 0 }}
      />

      {/* End: arrowhead (success) or cross (fail) — pops in after line */}
      {success ? (
        <motion.polygon
          points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
          fill={color}
          fillOpacity={0.9}
          initial={animated ? { opacity: 0, scale: 0 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={animated ? { duration: 0.35, ease: "backOut", delay: 0.55 } : { duration: 0 }}
          style={{ transformOrigin: `${x2}px ${y2}px` }}
        />
      ) : (
        <motion.g
          stroke={color}
          strokeWidth={0.7}
          strokeLinecap="round"
          strokeOpacity={0.9}
          initial={animated ? { opacity: 0, scale: 0 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={animated ? { duration: 0.35, ease: "backOut", delay: 0.55 } : { duration: 0 }}
          style={{ transformOrigin: `${x2}px ${y2}px` }}
        >
          <line
            x1={x2 - CROSS_SIZE * Math.cos(angle + Math.PI / 4)}
            y1={y2 - CROSS_SIZE * Math.sin(angle + Math.PI / 4)}
            x2={x2 + CROSS_SIZE * Math.cos(angle + Math.PI / 4)}
            y2={y2 + CROSS_SIZE * Math.sin(angle + Math.PI / 4)}
          />
          <line
            x1={x2 - CROSS_SIZE * Math.cos(angle - Math.PI / 4)}
            y1={y2 - CROSS_SIZE * Math.sin(angle - Math.PI / 4)}
            x2={x2 + CROSS_SIZE * Math.cos(angle - Math.PI / 4)}
            y2={y2 + CROSS_SIZE * Math.sin(angle - Math.PI / 4)}
          />
        </motion.g>
      )}

      {/* Origin dot */}
      <motion.circle
        cx={x1}
        cy={y1}
        r={0.5}
        fill={color}
        initial={animated ? { opacity: 0, scale: 0 } : false}
        animate={{ opacity: 0.8, scale: 1 }}
        transition={animated ? { duration: 0.3, ease: "backOut", delay: 0.05 } : { duration: 0 }}
        style={{ transformOrigin: `${x1}px ${y1}px` }}
      />

      {/* Sequence badge — circle + number */}
      <motion.g
        initial={animated ? { opacity: 0, scale: 0 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={animated ? { duration: 0.3, ease: "backOut", delay: 0.2 } : { duration: 0 }}
        style={{ transformOrigin: `${x1}px ${y1}px` }}
      >
        <circle cx={x1} cy={y1} r={CIRCLE_R} fill={color} fillOpacity={0.9} />
        <text
          x={x1}
          y={y1}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight="bold"
          fill="#1a1a1a"
          style={{ userSelect: "none" }}
        >
          {sequence}
        </text>
      </motion.g>
    </g>
  );
};

export default PassArrow;
