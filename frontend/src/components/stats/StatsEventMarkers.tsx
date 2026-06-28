import { ReferenceLine } from "recharts";

import type { Event } from "@/types/event";
import type { TeamSide } from "@/types/stats";

export interface StatsEventMarker {
	id: string;
	minute: number;
	kind: "shot" | "goal";
	teamId: string | null;
	teamSide: TeamSide | null;
}

interface StatsEventMarkersProps {
	events: StatsEventMarker[];
}

interface MarkerLabelProps {
	kind: StatsEventMarker["kind"];
	color: string;
	viewBox?: {
		x?: number;
		y?: number;
	};
}

const SHOT_TYPE_IDS = new Set(["13", "14", "15"]);
const GOAL_TYPE_ID = "16";
const BOOT_ICON_SRC = "/bota-de-futbol.png";
const EVENT_TEAM_COLORS: Record<TeamSide, string> = {
	home: "#3b82f6",
	away: "#f43f5e",
};
const UNKNOWN_TEAM_COLOR = "#64748b";

function getEventTeamSide(
	teamId: string | null | undefined,
	homeTeamId?: string | null,
	awayTeamId?: string | null,
): TeamSide | null {
	if (!teamId) return null;
	if (teamId === homeTeamId) return "home";
	if (teamId === awayTeamId) return "away";
	return null;
}

function getEventColor(event: StatsEventMarker): string {
	return event.teamSide ? EVENT_TEAM_COLORS[event.teamSide] : UNKNOWN_TEAM_COLOR;
}

export function getStatsEventMarkers(
	events: Event[],
	homeTeamId?: string | null,
	awayTeamId?: string | null,
): StatsEventMarker[] {
	return events
		.filter((event) => {
			return (
				event.min != null &&
				Number.isFinite(event.min) &&
				(SHOT_TYPE_IDS.has(event.type_id) || event.type_id === GOAL_TYPE_ID)
			);
		})
		.map((event, index): StatsEventMarker => ({
			id: event.id || `${event.type_id}-${event.min}-${index}`,
			minute: event.min ?? 0,
			kind: event.type_id === GOAL_TYPE_ID ? "goal" : "shot",
			teamId: event.team_id ?? null,
			teamSide: getEventTeamSide(event.team_id, homeTeamId, awayTeamId),
		}))
		.sort((a, b) => a.minute - b.minute || (a.kind === "shot" ? -1 : 1));
}

function BallIcon() {
	return (
		<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
			<circle cx={8} cy={8} r={4.7} strokeWidth={1.4} />
			<path d="M8 5.4 10.4 7.1 9.5 10 6.5 10 5.6 7.1Z" strokeWidth={1.1} />
			<path d="M8 5.4V3.5M10.4 7.1l1.7-.8M9.5 10l1.1 1.5M6.5 10l-1.1 1.5M5.6 7.1l-1.7-.8" strokeWidth={1} />
		</g>
	);
}

function BootIcon() {
	return (
		<image
			href={BOOT_ICON_SRC}
			x={3}
			y={3}
			width={10}
			height={10}
			preserveAspectRatio="xMidYMid meet"
		/>
	);
}

function MarkerLabel({ kind, color, viewBox }: MarkerLabelProps) {
	const x = viewBox?.x;
	const y = viewBox?.y;
	if (x == null || y == null) return null;

	const isGoal = kind === "goal";

	return (
		<g
			transform={`translate(${x - 8}, ${Math.max(2, y - 22)})`}
			style={{ color }}
		>
			<circle
				cx={8}
				cy={8}
				r={8}
				fill="#ffffff"
				stroke={color}
				strokeWidth={1.5}
			/>
			{isGoal ? <BallIcon /> : <BootIcon />}
		</g>
	);
}

export default function StatsEventMarkers({ events }: StatsEventMarkersProps) {
	return (
		<>
			{events.map((event) => {
				const color = getEventColor(event);

				return (
					<ReferenceLine
						key={`${event.kind}-${event.id}`}
						x={event.minute}
						stroke={color}
						strokeDasharray="4 4"
						strokeOpacity={0.9}
						strokeWidth={event.kind === "goal" ? 2 : 1.75}
						ifOverflow="extendDomain"
						label={(props) => (
							<MarkerLabel {...props} kind={event.kind} color={color} />
						)}
					/>
				);
			})}
		</>
	);
}
