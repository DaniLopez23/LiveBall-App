import React, { useEffect } from "react";
import useOptaPitchConfigStore, { type Orientation, VB_SHORT, VB_LONG } from "@/store/optaPitchConfigStore";

interface OptaPitchProps {
  children: React.ReactNode;
  /** Override store orientation. Useful when rendering multiple pitches. */
  orientation?: Orientation;
  /** Pitch surface background color (default: #2d7a3a). */
  fieldColor?: string;
}

const OptaPitch: React.FC<OptaPitchProps> = ({
  children,
  orientation: orientationProp,
  fieldColor = "#2d7a3a",
}) => {
  const storeOrientation = useOptaPitchConfigStore((s) => s.orientation);
  const setOrientation = useOptaPitchConfigStore((s) => s.setOrientation);
  // Sync prop → store so children that read transformOptaToSvg from the store
  // get the correct orientation. useLayoutEffect ensures the store is updated
  // before the browser paints, preventing a single wrong-position frame.
  useEffect(() => {
    if (orientationProp) setOrientation(orientationProp);
  }, [orientationProp, setOrientation]);

  const orientation = orientationProp ?? storeOrientation;
  // Compute viewBox directly from the resolved orientation (not the store)
  // so the SVG dimensions are always correct even on the very first render.
  const vW = orientation === 'vertical' ? VB_SHORT : VB_LONG;
  const vH = orientation === 'vertical' ? VB_LONG  : VB_SHORT;

  const isVertical = orientation === "vertical";
  const m = 5;

  const fX = m;
  const fY = m;
  const fW = vW - 2 * m;  // SVG x-extent of the field
  const fH = vH - 2 * m;  // SVG y-extent of the field

  // Canonical axes: fLong = pitch length (290), fShort = pitch width (190)
  const fLong  = isVertical ? fH : fW;  // 290
  const fShort = isVertical ? fW : fH;  // 190

  // Helper: maps (shortOffset, longOffset, shortSpan, longSpan) → <rect> props
  const rct = (sc: number, lc: number, sw: number, lh: number) =>
    isVertical
      ? { x: fX + sc, y: fY + lc, width: sw,  height: lh }
      : { x: fX + lc, y: fY + sc, width: lh,  height: sw };

  // Helper: maps (shortOffset, longOffset) → { cx, cy } for <circle>
  const pt = (sc: number, lc: number) =>
    isVertical ? { cx: fX + sc, cy: fY + lc } : { cx: fX + lc, cy: fY + sc };

  // ── Pitch geometry (proportions based on real dimensions) ───────────

  // Penalty area: ~16.5m deep, ~40m wide on a 105×68 pitch
  const pbL  = fLong  * 0.159;               // ~46  (depth)
  const pbS  = fShort * 0.6;                 // ~114 (span)
  const pbSO = (fShort - pbS) / 2;           // ~38  (short-axis offset)

  // Goal area
  const gbL  = fLong  * 0.052;               // ~15
  const gbS  = fShort * 0.3;                 // ~57
  const gbSO = (fShort - gbS) / 2;           // ~67.5

  // Penalty spot distance from goal line
  const psL = fLong * 0.12;                  // ~35

  // Center circle
  const ccR = fShort * 0.132;                // ~25

  // Penalty arc
  const arcOff  = pbL - psL;                 // spot-to-box-edge distance
  const arcSpan = Math.sqrt(Math.max(0, ccR ** 2 - arcOff ** 2));

  // Goals (sit outside the field boundary)
  const gDepth = 3;
  const gSpan  = fShort * 0.121;             // ~23
  const gSO    = (fShort - gSpan) / 2;       // ~83.5

  // Corner arc radius
  const caR = 3;

  // Center in SVG coords
  const cSVGX = vW / 2;
  const cSVGY = vH / 2;

  // Penalty arc paths: arc bulges toward the field center (away from each goal)
  //   Vertical  → horizontal chord at the penalty-box line
  //   Horizontal → vertical chord at the penalty-box line
  // sweep=0 (CCW / decreasing θ) bulges away from the near goal (into the field center)
  // sweep=1 (CW  / increasing θ) bulges away from the far  goal
  const nearArcPath = isVertical
    ? `M ${cSVGX - arcSpan} ${fY + pbL} A ${ccR} ${ccR} 0 0 0 ${cSVGX + arcSpan} ${fY + pbL}`
    : `M ${fX + pbL} ${cSVGY - arcSpan} A ${ccR} ${ccR} 0 0 1 ${fX + pbL} ${cSVGY + arcSpan}`;

  const farArcPath = isVertical
    ? `M ${cSVGX - arcSpan} ${fY + fH - pbL} A ${ccR} ${ccR} 0 0 1 ${cSVGX + arcSpan} ${fY + fH - pbL}`
    : `M ${fX + fW - pbL} ${cSVGY - arcSpan} A ${ccR} ${ccR} 0 0 0 ${fX + fW - pbL} ${cSVGY + arcSpan}`;

  // Goals protrude outside the field on each end
  const nearGoalProps = isVertical
    ? { x: fX + gSO, y: fY - gDepth,  width: gSpan,  height: gDepth }
    : { x: fX - gDepth, y: fY + gSO,  width: gDepth, height: gSpan  };

  const farGoalProps = isVertical
    ? { x: fX + gSO, y: fY + fH,      width: gSpan,  height: gDepth }
    : { x: fX + fW,  y: fY + gSO,     width: gDepth, height: gSpan  };

  const fg = { fill: "none", stroke: "white", strokeWidth: 0.5 };

  return (
    <div className="w-full h-full flex justify-center items-center">
      <svg
        viewBox={`0 0 ${vW} ${vH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        style={{ display: "block" }}
      >
        {/* Field background */}
        <rect x={0} y={0} width={vW} height={vH} fill={fieldColor} />

        <g {...fg}>
          {/* Outer rectangle */}
          <rect x={fX} y={fY} width={fW} height={fH} />

          {/* Halfway line */}
          {isVertical
            ? <line x1={fX} y1={cSVGY} x2={fX + fW} y2={cSVGY} />
            : <line x1={cSVGX} y1={fY} x2={cSVGX} y2={fY + fH} />}

          {/* Center circle */}
          <circle cx={cSVGX} cy={cSVGY} r={ccR} />

          {/* Center dot */}
          <circle cx={cSVGX} cy={cSVGY} r={1} fill="white" />

          {/* ── NEAR END (top / left) ─────────────────── */}

          {/* Penalty area */}
          <rect {...rct(pbSO, 0, pbS, pbL)} />

          {/* Goal area */}
          <rect {...rct(gbSO, 0, gbS, gbL)} />

          {/* Penalty spot */}
          <circle {...pt(fShort / 2, psL)} r={1} fill="white" />

          {/* Penalty arc */}
          <path d={nearArcPath} />

          {/* Goal */}
          <rect {...nearGoalProps} />

          {/* ── FAR END (bottom / right) ──────────────── */}

          {/* Penalty area */}
          <rect {...rct(pbSO, fLong - pbL, pbS, pbL)} />

          {/* Goal area */}
          <rect {...rct(gbSO, fLong - gbL, gbS, gbL)} />

          {/* Penalty spot */}
          <circle {...pt(fShort / 2, fLong - psL)} r={1} fill="white" />

          {/* Penalty arc */}
          <path d={farArcPath} />

          {/* Goal */}
          <rect {...farGoalProps} />

          {/* ── CORNER ARCS ──────────────────────────── */}
          {/* TL: A=θ90→B=θ0  short arc = decreasing θ → sweep=0 */}
          <path d={`M ${fX} ${fY + caR} A ${caR} ${caR} 0 0 0 ${fX + caR} ${fY}`} />
          {/* TR: A=θ180→B=θ90 short arc = decreasing θ → sweep=0 */}
          <path d={`M ${fX + fW - caR} ${fY} A ${caR} ${caR} 0 0 0 ${fX + fW} ${fY + caR}`} />
          {/* BL: A=θ270→B=θ0  short arc = increasing θ → sweep=1 */}
          <path d={`M ${fX} ${fY + fH - caR} A ${caR} ${caR} 0 0 1 ${fX + caR} ${fY + fH}`} />
          {/* BR: A=θ180→B=θ270 short arc = increasing θ → sweep=1 */}
          <path d={`M ${fX + fW - caR} ${fY + fH} A ${caR} ${caR} 0 0 1 ${fX + fW} ${fY + fH - caR}`} />
        </g>

        {children}
      </svg>
    </div>
  );
};

export default OptaPitch;

