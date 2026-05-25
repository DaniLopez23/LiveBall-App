import React from "react";
import { EventSequenceLabel, getMarkerFontSize } from "./EventMarkerLabels";

export interface ShotFigureProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  sequence: number;
  markerLabel?: string;
  markerScale?: number;
  outcome: "Miss" | "Post" | "Attempt Saved" | "Goal";
  color?: string;
}

const SQUARE_HALF  = 3.05;  // half-side of the start square
const ARROW_LEN    = 4.3;   // length of arrowhead arms
const ARROW_ANGLE  = Math.PI / 6;  // 30°
const CROSS_SIZE   = 2.2;   // half-size of the × arms
const POST_BAR     = 2.8;   // half-length of the ⊣ bar for Post
const BALL_R       = 3.0;   // radius of the soccer-ball icon

const ShotFigure: React.FC<ShotFigureProps> = ({
  x1, y1,
  x2, y2,
  sequence,
  markerLabel,
  markerScale = 1,
  outcome,
  color = "#ffffff",
}) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const perp  = angle + Math.PI / 2;
  const squareHalf = SQUARE_HALF * markerScale;

  // Line starts at the edge of the square
  const lineX1 = x1 + squareHalf * Math.cos(angle);
  const lineY1 = y1 + squareHalf * Math.sin(angle);

  // Arrowhead vertices (tip at x2, y2)
  const ax1 = x2 - ARROW_LEN * Math.cos(angle - ARROW_ANGLE);
  const ay1 = y2 - ARROW_LEN * Math.sin(angle - ARROW_ANGLE);
  const ax2 = x2 - ARROW_LEN * Math.cos(angle + ARROW_ANGLE);
  const ay2 = y2 - ARROW_LEN * Math.sin(angle + ARROW_ANGLE);

  // Line ends just before the arrowhead base when an arrow is drawn
  const hasArrow = outcome === "Attempt Saved" || outcome === "Post";
  const lineEndOffset = hasArrow ? ARROW_LEN * 0.7 : 0;
  const lineX2 = x2 - lineEndOffset * Math.cos(angle);
  const lineY2 = y2 - lineEndOffset * Math.sin(angle);

  // × cross arm directions (for Miss)
  const crossA1 = angle + Math.PI / 4;
  const crossA2 = angle - Math.PI / 4;

  // ⊣ bar endpoints (for Post) — perpendicular line at the arrow tip
  const bx1 = x2 - POST_BAR * Math.cos(perp);
  const by1 = y2 - POST_BAR * Math.sin(perp);
  const bx2 = x2 + POST_BAR * Math.cos(perp);
  const by2 = y2 + POST_BAR * Math.sin(perp);

  const label = markerLabel ?? String(sequence);
  const fontSize = getMarkerFontSize(label, 4.05) * markerScale;

  // Unique clipPath ID for the soccer-ball pattern
  const clipId = `shot-ball-clip-${sequence}`;

  return (
    <g>
      {/* Connecting line */}
      <line
        x1={lineX1} y1={lineY1}
        x2={lineX2} y2={lineY2}
        stroke={color}
          strokeWidth={0.7}
        strokeOpacity={0.8}
      />

      {/* Start: filled square */}
      <rect
        x={x1 - squareHalf}
        y={y1 - squareHalf}
        width={squareHalf * 2}
        height={squareHalf * 2}
        fill={color}
        fillOpacity={0.9}
      />
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
        {label}
      </text>
      <EventSequenceLabel
        x={x1}
        y={y1 + squareHalf + 1.15}
        sequence={sequence}
        fontSize={3.05 * markerScale}
      />

      {/* ── Miss: rotated × ───────────────────────────────────────── */}
      {outcome === "Miss" && (
        <g stroke={color} strokeWidth={0.8} strokeLinecap="round" strokeOpacity={0.95}>
          <line
            x1={x2 - CROSS_SIZE * Math.cos(crossA1)}
            y1={y2 - CROSS_SIZE * Math.sin(crossA1)}
            x2={x2 + CROSS_SIZE * Math.cos(crossA1)}
            y2={y2 + CROSS_SIZE * Math.sin(crossA1)}
          />
          <line
            x1={x2 - CROSS_SIZE * Math.cos(crossA2)}
            y1={y2 - CROSS_SIZE * Math.sin(crossA2)}
            x2={x2 + CROSS_SIZE * Math.cos(crossA2)}
            y2={y2 + CROSS_SIZE * Math.sin(crossA2)}
          />
        </g>
      )}

      {/* ── Attempt Saved: filled arrowhead ───────────────────────── */}
      {outcome === "Attempt Saved" && (
        <polygon
          points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
          fill={color}
          fillOpacity={0.9}
        />
      )}

      {/* ── Post: arrowhead + perpendicular bar ───────────────────── */}
      {outcome === "Post" && (
        <>
          <polygon
            points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
            fill={color}
            fillOpacity={0.9}
          />
          <line
            x1={bx1} y1={by1}
            x2={bx2} y2={by2}
            stroke={color}
            strokeWidth={1.0}
            strokeLinecap="round"
            strokeOpacity={0.95}
          />
        </>
      )}

      {/* ── Goal: soccer-ball icon ─────────────────────────────────── */}
      {outcome === "Goal" && (
        <g>
          <defs>
            <clipPath id={clipId}>
              <circle cx={x2} cy={y2} r={BALL_R} />
            </clipPath>
          </defs>
          {/* White ball body */}
          <circle cx={x2} cy={y2} r={BALL_R} fill="white" />
          {/* Dark pentagon patches clipped to the ball */}
          <g clipPath={`url(#${clipId})`} fill="#1a1a1a">
            {/* Central patch */}
            <circle cx={x2} cy={y2} r={BALL_R * 0.42} />
            {/* Five surrounding patches at 72° intervals */}
            {[0, 72, 144, 216, 288].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <circle
                  key={i}
                  cx={x2 + BALL_R * 0.75 * Math.cos(rad)}
                  cy={y2 + BALL_R * 0.75 * Math.sin(rad)}
                  r={BALL_R * 0.35}
                />
              );
            })}
          </g>
          {/* Team-colored border */}
          <circle cx={x2} cy={y2} r={BALL_R} fill="none" stroke={color} strokeWidth={0.5} />
        </g>
      )}
    </g>
  );
};

export default ShotFigure;
