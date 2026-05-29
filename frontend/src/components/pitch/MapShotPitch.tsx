import type { KeyboardEvent } from "react";

import {
	formatEventTime,
	formatPlayerLabel,
	getOutcomeLabel,
} from "@/components/pitch/eventsPitch/eventDisplay";
import type { ShotEvent } from "@/types/event";
import type { TeamSide } from "@/types/stats";

interface MapShotPitchProps {
	shots: ShotEvent[];
	selectedShotId: string | null;
	homeTeamId: string;
	awayTeamId: string;
	onSelectShot: (shotId: string) => void;
	teamColors?: Record<TeamSide, string>;
}

type ShotOutcome = "Miss" | "Post" | "Attempt Saved" | "Goal";
type ShotPoint = { x: number; y: number };

const DEFAULT_TEAM_COLORS: Record<TeamSide, string> = {
	home: "#3b82f6",
	away: "#f43f5e",
};
const UNKNOWN_TEAM_COLOR = "#f8fafc";
const VIEWBOX = {
	width: 220,
	height: 150,
};
const FIELD = {
	x: 10,
	y: 13,
	width: 200,
	height: 125,
};
const GOAL_DEPTH = 5;
const VISIBLE_ATTACK_START_X = 58;
const GOAL_MOUTH_VIEWBOX = {
	width: 260,
	height: 118,
};
const GOAL_MOUTH_DISPLAY = {
	yMin: 40,
	yMax: 60,
	zMin: 0,
	zMax: 70,
};
const GOAL_POSTS = {
	leftY: 55.8,
	rightY: 44.2,
	crossbarZ: 38,
	groundZ: 0,
};

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function sameTeamId(
	left: string | null | undefined,
	right: string | null | undefined,
): boolean {
	return left != null && right != null && String(left) === String(right);
}

function getTeamSideFromIds(
	teamId: string | null | undefined,
	homeTeamId: string,
	awayTeamId: string,
): TeamSide | null {
	if (!teamId) return null;
	if (sameTeamId(teamId, homeTeamId)) return "home";
	if (sameTeamId(teamId, awayTeamId)) return "away";
	return null;
}

function isAwayShot(shot: ShotEvent, awayTeamId: string): boolean {
	return sameTeamId(shot.team_id, awayTeamId);
}

function orientGrassPointToSingleGoal(
	point: ShotPoint,
	shot: ShotEvent,
	awayTeamId: string,
): ShotPoint {
	if (!isAwayShot(shot, awayTeamId)) return point;

	return {
		x: 100 - point.x,
		y: 100 - point.y,
	};
}

function normalizeShotPoint(point: ShotPoint): ShotPoint {
	return {
		x: clamp(point.x, VISIBLE_ATTACK_START_X, 100),
		y: clamp(point.y, 0, 100),
	};
}

function getShotStartCoordinate(
	shot: ShotEvent,
	awayTeamId: string,
): ShotPoint {
	return normalizeShotPoint(
		orientGrassPointToSingleGoal(
			{
				x: shot.x ?? 50,
				y: shot.y ?? 50,
			},
			shot,
			awayTeamId,
		),
	);
}

function getRawGrassShotEndCoordinate(shot: ShotEvent): ShotPoint | null {
	if (
		shot.type_id === "15" &&
		shot.blocked_by_defender &&
		shot.blocked_x != null &&
		shot.blocked_y != null
	) {
		return {
			x: shot.blocked_x,
			y: shot.blocked_y,
		};
	}

	if (
		shot.out_on_sideline &&
		shot.sideline_out_x != null &&
		shot.sideline_out_y != null
	) {
		return {
			x: shot.sideline_out_x,
			y: shot.sideline_out_y,
		};
	}

	return null;
}

function getGoalLineProjectionCoordinate(shot: ShotEvent, start: ShotPoint): ShotPoint {
	return {
		x: 100,
		y: clamp(shot.goal_mouth_y ?? start.y, 0, 100),
	};
}

function getShotEndCoordinate(
	shot: ShotEvent,
	start: ShotPoint,
	awayTeamId: string,
): ShotPoint {
	const goalLine = getGoalLineProjectionCoordinate(shot, start);
	const rawEnd = getRawGrassShotEndCoordinate(shot);

	if (!rawEnd) {
		return goalLine;
	}

	const orientedEnd = orientGrassPointToSingleGoal(rawEnd, shot, awayTeamId);

	if (
		orientedEnd.x < VISIBLE_ATTACK_START_X ||
		orientedEnd.x + 0.5 < start.x
	) {
		return goalLine;
	}

	const candidate = {
		x: clamp(orientedEnd.x, VISIBLE_ATTACK_START_X, 100),
		y: clamp(orientedEnd.y, 0, 100),
	};

	return {
		x: Math.max(candidate.x, start.x),
		y: candidate.y,
	};
}

function getVerticalPitchPoint(coordinate: ShotPoint) {
	const distanceToGoal = clamp(
		(100 - coordinate.x) / (100 - VISIBLE_ATTACK_START_X),
		0,
		1,
	);

	return {
		x: FIELD.x + ((100 - coordinate.y) / 100) * FIELD.width,
		y: FIELD.y + distanceToGoal * FIELD.height,
	};
}

function getPitchHorizontalPointFromGoalMouthY(goalMouthY: number): number {
	return FIELD.x + ((100 - goalMouthY) / 100) * FIELD.width;
}

function getShotMapPoints(
	shot: ShotEvent,
	awayTeamId: string,
) {
	const startCoordinate = getShotStartCoordinate(shot, awayTeamId);
	const endCoordinate = getShotEndCoordinate(shot, startCoordinate, awayTeamId);
	const start = getVerticalPitchPoint(startCoordinate);
	const end = getVerticalPitchPoint(endCoordinate);

	return { start, end };
}

function mapGoalMouthY(goalMouthY: number): number {
	const progress =
		(GOAL_MOUTH_DISPLAY.yMax - goalMouthY) /
		(GOAL_MOUTH_DISPLAY.yMax - GOAL_MOUTH_DISPLAY.yMin);

	return clamp(progress * GOAL_MOUTH_VIEWBOX.width, 6, GOAL_MOUTH_VIEWBOX.width - 6);
}

function mapGoalMouthZ(goalMouthZ: number): number {
	const progress =
		(GOAL_MOUTH_DISPLAY.zMax - goalMouthZ) /
		(GOAL_MOUTH_DISPLAY.zMax - GOAL_MOUTH_DISPLAY.zMin);

	return clamp(progress * GOAL_MOUTH_VIEWBOX.height, 6, GOAL_MOUTH_VIEWBOX.height - 6);
}

function getGoalMouthPoint(shot: ShotEvent): ShotPoint | null {
	if (shot.goal_mouth_y == null || shot.goal_mouth_z == null) return null;

	return {
		x: mapGoalMouthY(shot.goal_mouth_y),
		y: mapGoalMouthZ(shot.goal_mouth_z),
	};
}

function getShotOutcome(shot: ShotEvent): ShotOutcome {
	if (shot.type_id === "16" || shot.outcome === "Goal") return "Goal";
	if (shot.type_id === "15" || shot.outcome === "Attempt Saved") {
		return "Attempt Saved";
	}
	if (shot.type_id === "14" || shot.outcome === "Post") return "Post";
	return "Miss";
}

function handleShotKeyDown(
	keyboardEvent: KeyboardEvent<SVGGElement>,
	shotId: string,
	onSelectShot: (shotId: string) => void,
) {
	if (keyboardEvent.key !== "Enter" && keyboardEvent.key !== " ") return;

	keyboardEvent.preventDefault();
	onSelectShot(shotId);
}

function ShotMarker({
	point,
	color,
	isSelected,
	label,
}: {
	point: ShotPoint;
	color: string;
	isSelected: boolean;
	label: string;
}) {
	const radius = isSelected ? 7.2 : 6;

	return (
		<g transform={`translate(${point.x} ${point.y})`}>
			<circle
				r={radius}
				fill={color}
				stroke="#f8fafc"
				strokeWidth={isSelected ? "1.7" : "1.1"}
			/>
			<text
				y="0.35"
				textAnchor="middle"
				dominantBaseline="middle"
				fill="#f8fafc"
				fontSize={label.length > 2 ? "5.6" : "6.5"}
				fontWeight="700"
				pointerEvents="none"
			>
				{label}
			</text>

			{isSelected ? (
				<circle
					r={radius + 2.3}
					fill="none"
					stroke="#f8fafc"
					strokeWidth="1.1"
					strokeOpacity="0.9"
				/>
			) : null}
		</g>
	);
}

function ShotEndMarker({
	point,
	color,
	outcome,
	isSelected,
}: {
	point: ShotPoint;
	color: string;
	outcome: ShotOutcome;
	isSelected: boolean;
}) {
	const size = isSelected ? 3.9 : 3.1;

	if (outcome === "Miss") {
		return (
			<path
				d={`M ${point.x - size} ${point.y - size} L ${point.x + size} ${
					point.y + size
				} M ${point.x + size} ${point.y - size} L ${point.x - size} ${
					point.y + size
				}`}
				stroke={color}
				strokeWidth={isSelected ? "1.8" : "1.35"}
				strokeLinecap="round"
				strokeOpacity={isSelected ? "0.95" : "0.72"}
			/>
		);
	}

	if (outcome === "Post") {
		return (
			<path
				d={`M ${point.x} ${point.y - size} L ${point.x + size} ${point.y} L ${
					point.x
				} ${point.y + size} L ${point.x - size} ${point.y} Z`}
				fill="#f8fafc"
				stroke={color}
				strokeWidth={isSelected ? "1.7" : "1.25"}
			/>
		);
	}

	if (outcome === "Attempt Saved") {
		return (
			<rect
				x={point.x - size}
				y={point.y - size}
				width={size * 2}
				height={size * 2}
				rx="0.9"
				fill="#f8fafc"
				stroke={color}
				strokeWidth={isSelected ? "1.7" : "1.25"}
			/>
		);
	}

	return (
		<circle
			cx={point.x}
			cy={point.y}
			r={size}
			fill="#f8fafc"
			stroke={color}
			strokeWidth={isSelected ? "1.8" : "1.3"}
		/>
	);
}

function GoalShotMarker({
	point,
	color,
	isSelected,
	label,
}: {
	point: ShotPoint;
	color: string;
	isSelected: boolean;
	label: string;
}) {
	const radius = isSelected ? 7 : 5.8;

	return (
		<g transform={`translate(${point.x} ${point.y})`}>
			<circle
				r={radius}
				fill={color}
				stroke="#f8fafc"
				strokeWidth={isSelected ? "1.8" : "1.1"}
			/>
			<text
				y="0.35"
				textAnchor="middle"
				dominantBaseline="middle"
				fill="#f8fafc"
				fontSize={label.length > 2 ? "5.2" : "6.2"}
				fontWeight="700"
				pointerEvents="none"
			>
				{label}
			</text>
			{isSelected ? (
				<circle
					r={radius + 2.2}
					fill="none"
					stroke={color}
					strokeWidth="1.3"
				/>
			) : null}
		</g>
	);
}

function PitchLines() {
	const fieldBottom = FIELD.y + FIELD.height;
	const centerX = FIELD.x + FIELD.width / 2;
	const centerCircleRadius = FIELD.width * 0.135;
	const penaltyBoxWidth = FIELD.width * 0.64;
	const penaltyBoxDepth = FIELD.height * 0.32;
	const penaltyBoxX = FIELD.x + (FIELD.width - penaltyBoxWidth) / 2;
	const goalAreaWidth = FIELD.width * 0.28;
	const goalAreaDepth = FIELD.height * 0.112;
	const goalAreaX = FIELD.x + (FIELD.width - goalAreaWidth) / 2;
	const penaltySpotY = FIELD.y + FIELD.height * 0.215;
	const penaltyArcY = FIELD.y + penaltyBoxDepth;
	const penaltyArcSpan = FIELD.width * 0.118;
	const goalLeftX = getPitchHorizontalPointFromGoalMouthY(GOAL_POSTS.leftY);
	const goalRightX = getPitchHorizontalPointFromGoalMouthY(GOAL_POSTS.rightY);
	const goalX = Math.min(goalLeftX, goalRightX);
	const goalWidth = Math.abs(goalRightX - goalLeftX);

	return (
		<>
			<g fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth="1">
				<rect
					x={FIELD.x}
					y={FIELD.y}
					width={FIELD.width}
					height={FIELD.height}
				/>
				<line
					x1={FIELD.x}
					y1={fieldBottom}
					x2={FIELD.x + FIELD.width}
					y2={fieldBottom}
				/>
				<path
					d={`M ${centerX - centerCircleRadius} ${fieldBottom} A ${centerCircleRadius} ${centerCircleRadius} 0 0 1 ${
						centerX + centerCircleRadius
					} ${fieldBottom}`}
				/>
				<circle
					cx={centerX}
					cy={fieldBottom}
					r="1.2"
					fill="rgba(255,255,255,0.78)"
				/>
				<rect
					x={penaltyBoxX}
					y={FIELD.y}
					width={penaltyBoxWidth}
					height={penaltyBoxDepth}
				/>
				<rect
					x={goalAreaX}
					y={FIELD.y}
					width={goalAreaWidth}
					height={goalAreaDepth}
				/>
				<circle
					cx={centerX}
					cy={penaltySpotY}
					r="1.2"
					fill="rgba(255,255,255,0.78)"
				/>
				<path
					d={`M ${centerX - penaltyArcSpan} ${penaltyArcY} A ${centerCircleRadius} ${centerCircleRadius} 0 0 0 ${
						centerX + penaltyArcSpan
					} ${penaltyArcY}`}
				/>
			</g>
			<rect
				x={goalX}
				y={FIELD.y - GOAL_DEPTH}
				width={goalWidth}
				height={GOAL_DEPTH}
				fill="none"
				stroke="rgba(255,255,255,0.9)"
				strokeWidth="1.15"
			/>
		</>
	);
}

export function GoalShotMap({
	shots,
	selectedShotId,
	homeTeamId,
	awayTeamId,
	onSelectShot,
	teamColors = DEFAULT_TEAM_COLORS,
}: MapShotPitchProps) {
	const frameLeft = mapGoalMouthY(GOAL_POSTS.leftY);
	const frameRight = mapGoalMouthY(GOAL_POSTS.rightY);
	const frameTop = mapGoalMouthZ(GOAL_POSTS.crossbarZ);
	const frameBottom = mapGoalMouthZ(GOAL_POSTS.groundZ);
	const frameX = Math.min(frameLeft, frameRight);
	const frameY = Math.min(frameTop, frameBottom);
	const frameWidth = Math.abs(frameRight - frameLeft);
	const frameHeight = Math.abs(frameBottom - frameTop);

	return (
		<svg
			viewBox={`0 0 ${GOAL_MOUTH_VIEWBOX.width} ${GOAL_MOUTH_VIEWBOX.height}`}
			role="img"
			aria-label="Mapa de tiros en portería"
			className="h-full w-full"
			preserveAspectRatio="xMidYMid meet"
		>
			<rect
				x="0"
				y="0"
				width={GOAL_MOUTH_VIEWBOX.width}
				height={GOAL_MOUTH_VIEWBOX.height}
				className="fill-emerald-950"
			/>
			<image
				href="/goal.png"
				x={frameX}
				y={frameY}
				width={frameWidth}
				height={frameHeight}
				preserveAspectRatio="none"
				opacity="0.82"
				style={{ filter: "invert(1)" }}
			/>
			<rect
				x={frameX}
				y={frameY}
				width={frameWidth}
				height={frameHeight}
				fill="none"
				stroke="rgba(255,255,255,0.88)"
				strokeWidth="1.6"
			/>

			{shots.map((shot) => {
				const point = getGoalMouthPoint(shot);
				if (!point) return null;

				const isSelected = selectedShotId === shot.id;
				const side = getTeamSideFromIds(shot.team_id, homeTeamId, awayTeamId);
				const color = side ? teamColors[side] : UNKNOWN_TEAM_COLOR;
				const outcomeLabel = getOutcomeLabel(shot.type_id, shot.outcome);
				const markerLabel = shot.player?.dorsal?.trim() || "?";

				return (
					<g
						key={shot.id}
						role="button"
						tabIndex={0}
						aria-label={`${outcomeLabel}, ${formatPlayerLabel(shot)}, portería ${shot.goal_mouth_y?.toFixed(
							1,
						)} / ${shot.goal_mouth_z?.toFixed(1)}`}
						className="cursor-pointer focus:outline-none"
						onClick={() => onSelectShot(shot.id)}
						onKeyDown={(keyboardEvent) =>
							handleShotKeyDown(keyboardEvent, shot.id, onSelectShot)
						}
					>
						<title>
							{outcomeLabel} - {formatPlayerLabel(shot)} - Y{" "}
							{shot.goal_mouth_y?.toFixed(1)} / Z{" "}
							{shot.goal_mouth_z?.toFixed(1)}
						</title>
						<GoalShotMarker
							point={point}
							color={color}
							isSelected={isSelected}
							label={markerLabel}
						/>
					</g>
				);
			})}
		</svg>
	);
}

export default function MapShotPitch({
	shots,
	selectedShotId,
	homeTeamId,
	awayTeamId,
	onSelectShot,
	teamColors = DEFAULT_TEAM_COLORS,
}: MapShotPitchProps) {
	return (
		<svg
			viewBox={`0 0 ${VIEWBOX.width} ${VIEWBOX.height}`}
			role="img"
			aria-label="Mapa de tiros vertical a media cancha"
			className="h-full w-full"
			preserveAspectRatio="xMidYMid meet"
		>
			<rect
				x="0"
				y="0"
				width={VIEWBOX.width}
				height={VIEWBOX.height}
				className="fill-emerald-800"
			/>
			<rect
				x={FIELD.x}
				y={FIELD.y}
				width={FIELD.width}
				height={FIELD.height}
				className="fill-emerald-700/40"
			/>
			<PitchLines />

			{shots.map((shot) => {
				const { start, end } = getShotMapPoints(shot, awayTeamId);
				const isSelected = selectedShotId === shot.id;
				const side = getTeamSideFromIds(shot.team_id, homeTeamId, awayTeamId);
				const color = side ? teamColors[side] : UNKNOWN_TEAM_COLOR;
				const outcomeLabel = getOutcomeLabel(shot.type_id, shot.outcome);
				const outcome = getShotOutcome(shot);
				const markerLabel = shot.player?.dorsal?.trim() || "?";

				return (
					<g
						key={shot.id}
						role="button"
						tabIndex={0}
						aria-label={`${outcomeLabel}, ${formatPlayerLabel(shot)}, ${formatEventTime(
							shot.min,
							shot.sec,
						)}`}
						className="cursor-pointer focus:outline-none"
						onClick={() => onSelectShot(shot.id)}
						onKeyDown={(keyboardEvent) =>
							handleShotKeyDown(keyboardEvent, shot.id, onSelectShot)
						}
					>
						<title>{outcomeLabel} - {formatPlayerLabel(shot)}</title>
						<line
							x1={start.x}
							y1={start.y}
							x2={end.x}
							y2={end.y}
							stroke={color}
							strokeWidth={isSelected ? "2.7" : "1.65"}
							strokeOpacity={isSelected ? "0.95" : "0.58"}
							strokeLinecap="round"
						/>
						<ShotEndMarker
							point={end}
							color={color}
							outcome={outcome}
							isSelected={isSelected}
						/>
						<ShotMarker
							point={start}
							color={color}
							isSelected={isSelected}
							label={markerLabel}
						/>
						<circle
							cx={start.x}
							cy={start.y}
							r={isSelected ? 15 : 12}
							fill="transparent"
							stroke="transparent"
							strokeWidth="0"
						/>
					</g>
				);
			})}
		</svg>
	);
}
