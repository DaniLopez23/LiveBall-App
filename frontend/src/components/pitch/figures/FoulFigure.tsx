import React from "react";

export interface FoulFigureProps {
	x: number;
	y: number;
	sequence: number;
	color?: string;
}

const DIAMOND_R = 3.0;

const FoulFigure: React.FC<FoulFigureProps> = ({
	x,
	y,
	sequence,
	color = "#ffffff",
}) => {
	const points = `${x},${y - DIAMOND_R} ${x + DIAMOND_R},${y} ${x},${y + DIAMOND_R} ${x - DIAMOND_R},${y}`;
	const digits = String(sequence).length;
	const fontSize = digits === 1 ? 3.5 : digits === 2 ? 3 : 2.4;

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
				{sequence}
			</text>
		</g>
	);
};

export default FoulFigure;
