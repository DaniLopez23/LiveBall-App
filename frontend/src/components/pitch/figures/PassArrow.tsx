import React from "react";

export interface PassArrowProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sequence: number;
  outcome: number; // 1 = success, 0 = fail
  color?: string;
}

const CIRCLE_R = 3.5;
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

  // Adaptive font size so the number fits the circle
  const digits = String(sequence).length;
  const fontSize = digits === 1 ? 3.5 : digits === 2 ? 3 : 2.4;

  return (
    <g>
      {/* Connecting line */}
      <line
        x1={lineX1}
        y1={lineY1}
        x2={lineX2}
        y2={lineY2}
        stroke={color}
        strokeWidth={0.6}
        strokeOpacity={0.8}
      />

      {/* Start: filled circle */}
      <circle cx={x1} cy={y1} r={CIRCLE_R} fill={color} fillOpacity={0.9} />

      {/* Sequence number inside circle */}
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

      {/* End: arrowhead on success, cross on fail */}
      {success ? (
        <polygon
          points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
          fill={color}
          fillOpacity={0.9}
        />
      ) : (
        <g
          stroke={color}
          strokeWidth={0.7}
          strokeLinecap="round"
          strokeOpacity={0.9}
        >
          {/* Cross rotated to align with line direction */}
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
        </g>
      )}
    </g>
  );
};

export default PassArrow;
