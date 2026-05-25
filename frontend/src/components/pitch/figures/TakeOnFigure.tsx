import React from "react";
import { EventSequenceLabel, getMarkerFontSize } from "./EventMarkerLabels";

export interface TakeOnFigureProps {
  x: number;
  y: number;
  sequence: number;
  markerLabel?: string;
  markerScale?: number;
  outcome: number;
  color?: string;
}

const PENTAGON_R = 3.75;
const OUTCOME_MARK_OFFSET = 4.25;

function getPentagonPoints(x: number, y: number, radius: number): string {
  return Array.from({ length: 5 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / 5;
    return `${x + radius * Math.cos(angle)},${y + radius * Math.sin(angle)}`;
  }).join(" ");
}

const TakeOnFigure: React.FC<TakeOnFigureProps> = ({
  x,
  y,
  sequence,
  markerLabel,
  markerScale = 1,
  outcome,
  color = "#ffffff",
}) => {
  const pentagonR = PENTAGON_R * markerScale;
  const points = getPentagonPoints(x, y, pentagonR);
  const label = markerLabel ?? String(sequence);
  const fontSize = getMarkerFontSize(label, 3.9) * markerScale;
  const success = outcome === 1;
  const markX = x + OUTCOME_MARK_OFFSET * markerScale;
  const markY = y - OUTCOME_MARK_OFFSET * markerScale;
  const markR = 1.35 * markerScale;

  return (
    <g>
      <polygon
        points={points}
        fill={color}
        fillOpacity={success ? 0.92 : 0.62}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={0.4}
      />
      <text
        x={x}
        y={y + 0.15}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight="bold"
        fill="#1a1a1a"
        style={{ userSelect: "none" }}
      >
        {label}
      </text>
      {success ? (
        <path
          d={`M ${markX - markR} ${markY} L ${markX - markR * 0.25} ${markY + markR * 0.75} L ${markX + markR} ${markY - markR}`}
          fill="none"
          stroke={color}
          strokeWidth={0.7 * markerScale}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <g stroke={color} strokeWidth={0.7 * markerScale} strokeLinecap="round">
          <line x1={markX - markR} y1={markY - markR} x2={markX + markR} y2={markY + markR} />
          <line x1={markX + markR} y1={markY - markR} x2={markX - markR} y2={markY + markR} />
        </g>
      )}
      <EventSequenceLabel
        x={x}
        y={y + pentagonR + 1.15}
        sequence={sequence}
        fontSize={4.15 * markerScale}
      />
    </g>
  );
};

export default TakeOnFigure;
