export function getMarkerFontSize(label: string, baseSize = 3.5): number {
  const length = label.length;
  if (length <= 2) return baseSize;
  if (length === 3) return baseSize * 0.82;
  return baseSize * 0.68;
}

export function EventSequenceLabel({
  x,
  y,
  sequence,
  fontSize = 3.05,
}: {
  x: number;
  y: number;
  sequence: number;
  fontSize?: number;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="hanging"
      fontSize={fontSize}
      fontWeight="800"
      fill="#ffffff"
      stroke="#0f172a"
      strokeWidth={0.55}
      paintOrder="stroke"
      style={{ userSelect: "none" }}
    >
      {sequence}
    </text>
  );
}
