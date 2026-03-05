import React from "react";

const OptaPitch: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const vW = 200;
  const vH = 300;
  const m = 5; // margin

  const fX = m;              // field left edge
  const fY = m;              // field top edge
  const fW = vW - 2 * m;    // 190
  const fH = vH - 2 * m;    // 290
  const cX = vW / 2;        // 100
  const cY = vH / 2;        // 150

  // Penalty area (top & bottom)
  const pbW = fW * 0.6;                 // ~114  (≈ 40m on 68m-wide pitch)
  const pbH = fH * 0.159;               // ~46   (≈ 16.5m on 105m-long pitch)
  const pbX = cX - pbW / 2;            // 43

  // Goal area (top & bottom)
  const gbW = fW * 0.3;                 // ~57   (≈ 18.32m)
  const gbH = fH * 0.052;              // ~15   (≈ 5.5m)
  const gbX = cX - gbW / 2;            // ~71.5

  // Penalty spot distance from goal line
  const psD = fH * 0.12;               // ~35   (≈ 11m)

  // Center circle radius
  const ccR = fW * 0.132;              // ~25   (≈ 9.15m on 68m width)

  // Penalty arc
  const arcYOffset = pbH - psD;        // distance from spot to box edge
  const arcDX = Math.sqrt(ccR ** 2 - arcYOffset ** 2); // horizontal reach of arc at box edge

  // Goals (outside the field)
  const gW = fW * 0.121;               // ~23
  const gH = 3;
  const gX = cX - gW / 2;             // ~88.5

  // Corner arc radius
  const caR = 3;

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
        <rect x={0} y={0} width={vW} height={vH} fill="#2d7a3a" />

        <g {...fg}>
          {/* Outer rectangle */}
          <rect x={fX} y={fY} width={fW} height={fH} />

          {/* Halfway line */}
          <line x1={fX} y1={cY} x2={fX + fW} y2={cY} />

          {/* Center circle */}
          <circle cx={cX} cy={cY} r={ccR} />

          {/* Center dot */}
          <circle cx={cX} cy={cY} r={1} fill="white" />

          {/* ── TOP HALF ─────────────────────────────── */}

          {/* Top penalty area */}
          <rect x={pbX} y={fY} width={pbW} height={pbH} />

          {/* Top goal area */}
          <rect x={gbX} y={fY} width={gbW} height={gbH} />

          {/* Top penalty spot */}
          <circle cx={cX} cy={fY + psD} r={1} fill="white" />

          {/* Top penalty arc (outside penalty box) */}
          <path d={`M ${cX - arcDX} ${fY + pbH} A ${ccR} ${ccR} 0 0 1 ${cX + arcDX} ${fY + pbH}`} />

          {/* Top goal */}
          <rect x={gX} y={fY - gH} width={gW} height={gH} />

          {/* ── BOTTOM HALF ──────────────────────────── */}

          {/* Bottom penalty area */}
          <rect x={pbX} y={fY + fH - pbH} width={pbW} height={pbH} />

          {/* Bottom goal area */}
          <rect x={gbX} y={fY + fH - gbH} width={gbW} height={gbH} />

          {/* Bottom penalty spot */}
          <circle cx={cX} cy={fY + fH - psD} r={1} fill="white" />

          {/* Bottom penalty arc (outside penalty box) */}
          <path d={`M ${cX - arcDX} ${fY + fH - pbH} A ${ccR} ${ccR} 0 0 0 ${cX + arcDX} ${fY + fH - pbH}`} />

          {/* Bottom goal */}
          <rect x={gX} y={fY + fH} width={gW} height={gH} />

          {/* ── CORNER ARCS ──────────────────────────── */}
          <path d={`M ${fX} ${fY + caR} A ${caR} ${caR} 0 0 1 ${fX + caR} ${fY}`} />
          <path d={`M ${fX + fW - caR} ${fY} A ${caR} ${caR} 0 0 1 ${fX + fW} ${fY + caR}`} />
          <path d={`M ${fX} ${fY + fH - caR} A ${caR} ${caR} 0 0 0 ${fX + caR} ${fY + fH}`} />
          <path d={`M ${fX + fW - caR} ${fY + fH} A ${caR} ${caR} 0 0 1 ${fX + fW} ${fY + fH - caR}`} />
        </g>

        {children}
      </svg>
    </div>
  );
};

export default OptaPitch;

