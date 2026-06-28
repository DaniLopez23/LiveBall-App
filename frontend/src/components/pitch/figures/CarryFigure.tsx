import React from "react";

export interface CarryFigureProps {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	color?: string;
}

const CarryFigure: React.FC<CarryFigureProps> = ({
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
			strokeWidth={0.7}
			strokeOpacity={0.85}
			strokeLinecap="round"
			strokeDasharray="3.4 2.4"
		/>
	);
};

export default CarryFigure;