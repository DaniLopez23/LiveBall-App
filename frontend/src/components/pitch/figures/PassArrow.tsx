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

const CIRCLE_R = 4;
const ARROW_LEN = 5;
const ARROW_ANGLE = Math.PI / 6; // 30°
const CROSS_SIZE = 2.5;

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

  // Line starts from the edge of the start circle
  const lineX1 = x1 + CIRCLE_R * Math.cos(angle);
  const lineY1 = y1 + CIRCLE_R * Math.sin(angle);

  // Arrowhead vertices
  const ax1 = x2 - ARROW_LEN * Math.cos(angle - ARROW_ANGLE);
  const ay1 = y2 - ARROW_LEN * Math.sin(angle - ARROW_ANGLE);
  const ax2 = x2 - ARROW_LEN * Math.cos(angle + ARROW_ANGLE);
  const ay2 = y2 - ARROW_LEN * Math.sin(angle + ARROW_ANGLE);

  const success = outcome === 1;

  // Adaptive font size so the number fits the circle
  const digits = String(sequence).length;
  const fontSize = digits === 1 ? 3.5 : digits === 2 ? 3 : 2.4;

  return (
    <g>
      {/* Connecting line */}
      <line
        x1={lineX1}
        y1={lineY1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={0.8}
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
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeOpacity={0.9}
        >
          <line
            x1={x2 - CROSS_SIZE}
            y1={y2 - CROSS_SIZE}
            x2={x2 + CROSS_SIZE}
            y2={y2 + CROSS_SIZE}
          />
          <line
            x1={x2 + CROSS_SIZE}
            y1={y2 - CROSS_SIZE}
            x2={x2 - CROSS_SIZE}
            y2={y2 + CROSS_SIZE}
          />
        </g>
      )}
    </g>
  );
};

export default PassArrow;
