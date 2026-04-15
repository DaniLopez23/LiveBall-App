import React from "react";

export interface LinkFigureProps {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	color?: string;
}

const LinkFigure: React.FC<LinkFigureProps> = ({
	x1,
	y1,
	x2,
	y2,
	color = "#ffffff",
}) => {
	return (
		<line
			x1={x1}
			y1={y1}
			x2={x2}
			y2={y2}
			stroke={color}
			strokeWidth={0.35}
			strokeOpacity={0.28}
			strokeLinecap="round"
		/>
	);
};

export default LinkFigure;