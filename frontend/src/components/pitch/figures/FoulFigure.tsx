import React from "react";
import { EventSequenceLabel, getMarkerFontSize } from "./EventMarkerLabels";

export interface FoulFigureProps {
	x: number;
	y: number;
	sequence: number;
	markerLabel?: string;
	markerScale?: number;
	color?: string;
}

const DIAMOND_R = 3.55;

const FoulFigure: React.FC<FoulFigureProps> = ({
	x,
	y,
	sequence,
	markerLabel,
	markerScale = 1,
	color = "#ffffff",
}) => {
	const diamondR = DIAMOND_R * markerScale;
	const points = `${x},${y - diamondR} ${x + diamondR},${y} ${x},${y + diamondR} ${x - diamondR},${y}`;
	const label = markerLabel ?? String(sequence);
	const fontSize = getMarkerFontSize(label, 4.05) * markerScale;

	return (
		<g>
			<polygon points={points} fill={color} fillOpacity={0.92} stroke="rgba(0,0,0,0.5)" strokeWidth={0.4} />
			<text
				x={x}
				y={y}
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
				x={x}
				y={y + diamondR + 1.15}
				sequence={sequence}
				fontSize={3.05 * markerScale}
			/>
		</g>
	);
};

export default FoulFigure;
