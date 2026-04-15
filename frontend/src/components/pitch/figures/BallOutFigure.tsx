import React from "react";

// Which boundary of the SVG viewport the ball crossed.
export type FieldEdge = "top" | "bottom" | "left" | "right";

export interface BallOutFigureProps {
  /** SVG x coordinate of the exit point (clamped to field boundary). */
  svgX: number;
  /** SVG y coordinate of the exit point (clamped to field boundary). */
  svgY: number;
  /** Which SVG boundary was crossed. */
  edge: FieldEdge;
  sequence: number;
  color?: string;
}

// ─── Geometry constants (SVG units) ──────────────────────────────────────────
const BADGE_H   = 6.0;   // pill height
const PAD_X     = 0.9;   // horizontal padding inside pill
const FONT_SIZE = 2.7;   // label font size
const PUSH      = 3.8;   // how far to push the pill centre from the boundary

// ─── Component ────────────────────────────────────────────────────────────────
const BallOutFigure: React.FC<BallOutFigureProps> = ({
  svgX,
  svgY,
  edge,
  sequence,
  color = "#ffffff",
}) => {
  const label = `${sequence} · OUT`;

  // Approximate text width: each character ≈ FONT_SIZE * 0.6
  const textW = label.length * FONT_SIZE * 0.6;
  const badgeW = textW + PAD_X * 2;

  // Push the pill centre outward from the field boundary.
  let cx = svgX;
  let cy = svgY;
  switch (edge) {
    case "top":    cy -= PUSH; break;
    case "bottom": cy += PUSH; break;
    case "left":   cx -= PUSH; break;
    case "right":  cx += PUSH; break;
  }

  // ── Rotation ────────────────────────────────────────────────────────────────
  // left/right (vertical boundaries) → rotate ±90° so label follows the line.
  // top/bottom (horizontal boundaries) → keep horizontal (0°).
  const rotAngle =
    edge === "left"  ? -90 :
    edge === "right" ?  90 :
    0;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotAngle})`}>
      {/* Drop shadow for contrast against green field */}
      {/* <rect
        x={-badgeW / 2 + 0.4}
        y={-BADGE_H / 2 + 0.4}
        width={badgeW}
        height={BADGE_H}
        rx={BADGE_H / 2}
        fill="rgba(0,0,0,0.45)"
      /> */}
      {/* Pill background: team color with high opacity */}
      <rect
        x={-badgeW / 2}
        y={-BADGE_H / 2}
        width={badgeW}
        height={BADGE_H}
        rx={BADGE_H / 2}
        fill={color}
        fillOpacity={0.92}
        stroke="rgba(0,0,0,0.5)"
        strokeWidth={0.4}
      />
      {/* Label */}
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={FONT_SIZE}
        fontWeight="700"
        fill="#111111"
        style={{ userSelect: "none", fontFamily: "system-ui, sans-serif" }}
      >
        {label}
      </text>
    </g>
  );
};

export default BallOutFigure;
