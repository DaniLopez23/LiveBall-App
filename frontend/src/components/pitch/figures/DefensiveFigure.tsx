import React from "react";

export interface DefensiveFigureProps {
	x: number;
	y: number;
	sequence: number;
	subtypeLabel?: string;
	color?: string;
}

const TRIANGLE_R = 3.2;

const DefensiveFigure: React.FC<DefensiveFigureProps> = ({
	x,
	y,
	sequence,
	subtypeLabel,
	color = "#ffffff",
}) => {
	const top = `${x},${y - TRIANGLE_R}`;
	const right = `${x + TRIANGLE_R * 0.9},${y + TRIANGLE_R * 0.7}`;
	const left = `${x - TRIANGLE_R * 0.9},${y + TRIANGLE_R * 0.7}`;
	const points = `${top} ${right} ${left}`;
	const digits = String(sequence).length;
	const fontSize = digits === 1 ? 3.2 : digits === 2 ? 2.7 : 2.2;

	return (
		<g>
			<polygon points={points} fill={color} fillOpacity={0.92} stroke="rgba(0,0,0,0.5)" strokeWidth={0.4} />
			<text
				x={x}
				y={y + 0.8}
				textAnchor="middle"
				dominantBaseline="central"
				fontSize={fontSize}
				fontWeight="bold"
				fill="#1a1a1a"
				style={{ userSelect: "none" }}
			>
				{sequence}
			</text>
			{subtypeLabel ? (
				<text
					x={x}
					y={y + TRIANGLE_R + 2}
					textAnchor="middle"
					dominantBaseline="hanging"
					fontSize={2.8}
					fontWeight="700"
					fill={color}
					style={{ userSelect: "none", letterSpacing: "0.04em" }}
				>
					{subtypeLabel.toUpperCase()}
				</text>
			) : null}
		</g>
	);
};

export default DefensiveFigure;
