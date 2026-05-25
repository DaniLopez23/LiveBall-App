import React from "react";
import { EventSequenceLabel } from "./EventMarkerLabels";

export type FieldEdge = "top" | "bottom" | "left" | "right";

export interface BallOutFigureProps {
  svgX: number;
  svgY: number;
  edge: FieldEdge;
  sequence: number;
  markerLabel?: string;
  markerScale?: number;
  color?: string;
}

const BADGE_H = 7.2;
const PAD_X = 1.15;
const FONT_SIZE = 3.15;
const PUSH = 3.8;

const BallOutFigure: React.FC<BallOutFigureProps> = ({
  svgX,
  svgY,
  edge,
  sequence,
  markerLabel,
  markerScale = 1,
  color = "#ffffff",
}) => {
  const label = `${markerLabel ?? sequence} - OUT`;
  const badgeHeight = BADGE_H * markerScale;
  const fontSize = FONT_SIZE * markerScale;
  const textW = label.length * fontSize * 0.6;
  const badgeW = textW + PAD_X * markerScale * 2;

  let cx = svgX;
  let cy = svgY;
  switch (edge) {
    case "top":
      cy -= PUSH;
      break;
    case "bottom":
      cy += PUSH;
      break;
    case "left":
      cx -= PUSH;
      break;
    case "right":
      cx += PUSH;
      break;
  }

  const rotAngle = edge === "left" ? -90 : edge === "right" ? 90 : 0;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotAngle})`}>
      <rect
        x={-badgeW / 2}
        y={-badgeHeight / 2}
        width={badgeW}
        height={badgeHeight}
        rx={badgeHeight / 2}
        fill={color}
        fillOpacity={0.92}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={0.4}
      />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="700"
        fill="#111111"
        style={{ userSelect: "none", fontFamily: "system-ui, sans-serif" }}
      >
        {label}
      </text>
      <EventSequenceLabel
        x={0}
        y={badgeHeight / 2 + 1.15}
        sequence={sequence}
        fontSize={4.15 * markerScale}
      />
    </g>
  );
};

export default BallOutFigure;
