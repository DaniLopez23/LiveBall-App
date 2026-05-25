import React from "react";
import { getMarkerFontSize } from "./EventMarkerLabels";

export interface DefensiveFigureProps {
	x: number;
	y: number;
	sequence: number;
	markerLabel?: string;
	markerScale?: number;
	subtypeLabel?: string;
	color?: string;
}

const TRIANGLE_R = 3.55;
const TAG_FONT_SIZE = 4.15;
const TAG_HEIGHT = 6.4;
const TAG_PAD_X = 2.4;

const DefensiveFigure: React.FC<DefensiveFigureProps> = ({
	x,
	y,
	sequence,
	markerLabel,
	markerScale = 1,
	subtypeLabel,
	color = "#ffffff",
}) => {
	const top = `${x},${y - TRIANGLE_R}`;
	const right = `${x + TRIANGLE_R * 0.9},${y + TRIANGLE_R * 0.7}`;
	const left = `${x - TRIANGLE_R * 0.9},${y + TRIANGLE_R * 0.7}`;
	const points = `${top} ${right} ${left}`;
	const dorsalLabel = markerLabel ?? String(sequence);
	const dorsalFontSize = getMarkerFontSize(dorsalLabel, 3.75);
	const tagLabel = `${sequence} - ${(subtypeLabel ?? "Defensive").toUpperCase()}`;
	const tagFontSize = TAG_FONT_SIZE * markerScale;
	const tagHeight = TAG_HEIGHT * markerScale;
	const tagWidth = tagLabel.length * tagFontSize * 0.56 + TAG_PAD_X * markerScale * 2;
	const tagY = y + TRIANGLE_R + 5.2 * markerScale;

	return (
		<g>
			<polygon points={points} fill={color} fillOpacity={0.92} stroke="rgba(0,0,0,0.5)" strokeWidth={0.4} />
			<text
				x={x}
				y={y + 0.8}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={dorsalFontSize}
				fontWeight="bold"
				fill="#1a1a1a"
				style={{ userSelect: "none" }}
			>
				{dorsalLabel}
			</text>

			<rect
				x={x - tagWidth / 2}
				y={tagY - tagHeight / 2}
				width={tagWidth}
				height={tagHeight}
				rx={1.8}
				fill="#0f172a"
				fillOpacity={0.9}
				stroke={color}
				strokeOpacity={0.95}
				strokeWidth={0.65}
			/>
			<text
				x={x}
				y={tagY}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={tagFontSize}
				fontWeight="800"
				fill="#ffffff"
				style={{ userSelect: "none", fontFamily: "system-ui, sans-serif" }}
			>
				{tagLabel}
			</text>
		</g>
	);
};

export default DefensiveFigure;
