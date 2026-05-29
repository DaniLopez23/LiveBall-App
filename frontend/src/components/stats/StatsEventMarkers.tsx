import { ReferenceLine } from "recharts";

import type { Event } from "@/types/event";

export interface StatsEventMarker {
	id: string;
	minute: number;
	kind: "shot" | "goal";
	teamId: string | null;
}

interface StatsEventMarkersProps {
	events: StatsEventMarker[];
}

interface MarkerLabelProps {
	kind: StatsEventMarker["kind"];
	viewBox?: {
		x?: number;
		y?: number;
	};
}

const SHOT_TYPE_IDS = new Set(["13", "14", "15"]);
const GOAL_TYPE_ID = "16";

export function getStatsEventMarkers(events: Event[]): StatsEventMarker[] {
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
		<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
			<path d="M4.2 5.3c2.6 1.2 4.7 1.8 7.6 1.9l.7 2.5c-2.5.7-6 .5-8.8-.5l.5-3.9Z" strokeWidth={1.35} />
			<path d="M3.6 9.1c1.7 2 5.5 3.1 9.2 2.6.6-.1.8.8.2 1.1-3.9 1.7-8.8.5-10.8-2.1l1.4-1.6Z" strokeWidth={1.35} />
			<path d="M6.4 7.1 6 8.6M8.5 7.6 8 9.2M10.6 7.8l-.3 1.5" strokeWidth={1} />
		</g>
	);
}

function MarkerLabel({ kind, viewBox }: MarkerLabelProps) {
	const x = viewBox?.x;
	const y = viewBox?.y;
	if (x == null || y == null) return null;

	const isGoal = kind === "goal";

	return (
		<g
			transform={`translate(${x - 8}, ${Math.max(2, y - 22)})`}
			className={isGoal ? "text-amber-500" : "text-foreground"}
		>
			<circle
				cx={8}
				cy={8}
				r={8}
				className="fill-background stroke-border"
				strokeWidth={1.5}
			/>
			{isGoal ? <BallIcon /> : <BootIcon />}
		</g>
	);
}

export default function StatsEventMarkers({ events }: StatsEventMarkersProps) {
	return (
		<>
			{events.map((event) => (
				<ReferenceLine
					key={`${event.kind}-${event.id}`}
					x={event.minute}
					stroke={event.kind === "goal" ? "#f59e0b" : "hsl(var(--foreground))"}
					strokeDasharray="4 4"
					strokeOpacity={event.kind === "goal" ? 0.9 : 0.45}
					strokeWidth={1.5}
					label={(props) => <MarkerLabel {...props} kind={event.kind} />}
				/>
			))}
		</>
	);
}
