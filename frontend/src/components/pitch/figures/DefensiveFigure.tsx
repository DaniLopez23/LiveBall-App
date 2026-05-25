import React from "react";
import { EventSequenceLabel, getMarkerFontSize } from "./EventMarkerLabels";

export interface DefensiveFigureProps {
	x: number;
	y: number;
	sequence: number;
	markerLabel?: string;
	markerScale?: number;
	color?: string;
}

const TRIANGLE_R = 3.55;

const DefensiveFigure: React.FC<DefensiveFigureProps> = ({
	x,
	y,
	sequence,
	markerLabel,
	markerScale = 1,
	color = "#ffffff",
}) => {
	const top = `${x},${y - TRIANGLE_R}`;
	const right = `${x + TRIANGLE_R * 0.9},${y + TRIANGLE_R * 0.7}`;
	const left = `${x - TRIANGLE_R * 0.9},${y + TRIANGLE_R * 0.7}`;
	const points = `${top} ${right} ${left}`;
	const dorsalLabel = markerLabel ?? String(sequence);
	const dorsalFontSize = getMarkerFontSize(dorsalLabel, 3.75) * markerScale;

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
			<EventSequenceLabel
				x={x}
				y={y + TRIANGLE_R + 1.15}
				sequence={sequence}
				fontSize={4.15 * markerScale}
			/>
		</g>
	);
};

export default DefensiveFigure;
