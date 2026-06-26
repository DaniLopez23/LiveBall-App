import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import KeyEventsTimeline, {
	ALL_KEY_EVENT_KINDS,
	getScoreAtTimelineSecond,
	getTimelineEndMinute,
	type KeyEventKind,
	type KeyEventsTimelineTeamFilter,
} from "@/components/stats/KeyEventsTimeline";
import { formatMatchTime, getMaxEventSecond } from "@/lib/matchTime";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import useMatchSelectionStore from "@/store/matchSelectionStore";
import type {
	WidgetComponentProps,
	WidgetPanelProps,
} from "@/features/dashboard/types/dashboard.types";
import {
	CheckboxList,
	SectionTitle,
	SelectField,
	SwitchField,
	TextField,
} from "@/features/dashboard/widgets/widgetControls";

export type KeyEventsTimelineConfig = {
	title: string;
	showScore: boolean;
	showLegend: boolean;
	showCurrentMarker: boolean;
};

export type KeyEventsTimelineFilters = {
	team: KeyEventsTimelineTeamFilter;
	eventKinds: KeyEventKind[];
	minuteRange: [number, number];
};

export const DEFAULT_KEY_EVENTS_TIMELINE_CONFIG: KeyEventsTimelineConfig = {
	title: "Timeline de eventos clave",
	showScore: true,
	showLegend: true,
	showCurrentMarker: false,
};

export const DEFAULT_KEY_EVENTS_TIMELINE_FILTERS: KeyEventsTimelineFilters = {
	team: "both",
	eventKinds: [...ALL_KEY_EVENT_KINDS],
	minuteRange: [0, 90],
};

const EVENT_KIND_OPTIONS: Array<{
	value: KeyEventKind;
	label: string;
	description: string;
}> = [
	{
		value: "goal",
		label: "Goles",
		description: "Acciones de gol y goles en propia puerta.",
	},
	{
		value: "shot",
		label: "Tiros",
		description: "Disparos fuera, al palo o parados.",
	},
	{
		value: "card",
		label: "Tarjetas",
		description: "Amonestaciones y expulsiones.",
	},
];

function getSafeEventKinds(value: KeyEventKind[] | undefined): KeyEventKind[] {
	if (!Array.isArray(value)) return [...ALL_KEY_EVENT_KINDS];

	return value.filter((kind): kind is KeyEventKind =>
		ALL_KEY_EVENT_KINDS.includes(kind as KeyEventKind),
	);
}

function hasFinishedMatchState(events: ReturnType<typeof useEventsStore.getState>["events"]) {
	return events.some((event) => event.match_state === "match_finished");
}

export function KeyEventsTimelineWidget({
	config,
	filters,
}: WidgetComponentProps<KeyEventsTimelineConfig, KeyEventsTimelineFilters>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const gameId = game?.game_id ?? null;
	const selectedMatchStatus = useMatchSelectionStore((state) => {
		const selectedGameId = state.selectedGameId ?? gameId;
		return state.matches.find((match) => match.game_id === selectedGameId)?.status ?? null;
	});
	const homeTeamId = game?.home_team.team_id ?? null;
	const awayTeamId = game?.away_team.team_id ?? null;
	const timelineEndMinute = useMemo(() => getTimelineEndMinute(events, 90), [events]);
	const minuteRange: [number, number] = [0, timelineEndMinute];
	const isMatchFinished =
		selectedMatchStatus === "finished" || hasFinishedMatchState(events);
	const latestEventSecond = events.length > 0 ? getMaxEventSecond(events) : null;
	const markerSecond = !isMatchFinished ? latestEventSecond : null;
	const scoreLimitSecond =
		markerSecond ?? Math.max(0, timelineEndMinute * 60 + 59);
	const score =
		homeTeamId && awayTeamId
			? getScoreAtTimelineSecond(
					events,
					homeTeamId,
					awayTeamId,
					scoreLimitSecond,
				)
			: { home: 0, away: 0 };
	const eventKinds = getSafeEventKinds(filters.eventKinds);
	const badges = [
		filters.team === "both"
			? "Ambos equipos"
			: filters.team === "home"
				? game?.home_team.team_name ?? "Local"
				: game?.away_team.team_name ?? "Visitante",
		`0'-${timelineEndMinute}'`,
		isMatchFinished
			? "Finalizado"
			: markerSecond != null
				? `Actual ${formatMatchTime(markerSecond)}`
				: "Sin eventos",
	];

	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="truncate text-sm font-semibold">
						{config.title || DEFAULT_KEY_EVENTS_TIMELINE_CONFIG.title}
					</h3>
				</div>
				<div className="flex flex-wrap justify-end gap-2">
					{badges.map((badge) => (
						<Badge key={badge} variant="outline" className="rounded-md">
							{badge}
						</Badge>
					))}
				</div>
			</div>

			<div className="flex min-h-0 flex-1 items-center">
				<KeyEventsTimeline
					events={events}
					homeTeamId={homeTeamId}
					awayTeamId={awayTeamId}
					homeTeamName={game?.home_team.team_name ?? "Local"}
					awayTeamName={game?.away_team.team_name ?? "Visitante"}
					currentSecond={markerSecond ?? undefined}
					homeScore={score.home}
					awayScore={score.away}
					eventKinds={eventKinds}
					teamFilter={filters.team}
					minuteRange={minuteRange}
					showScore={config.showScore ?? true}
					showLegend={config.showLegend ?? true}
					showCurrentMarker={markerSecond != null}
					className="w-full"
				/>
			</div>
		</div>
	);
}

export function KeyEventsTimelineWidgetConfig({
	value,
	onChange,
}: WidgetPanelProps<KeyEventsTimelineConfig>) {
	const config = {
		...DEFAULT_KEY_EVENTS_TIMELINE_CONFIG,
		...value,
	};

	return (
		<div className="space-y-4">
			<SectionTitle>Timeline</SectionTitle>
			<TextField
				label="Titulo"
				value={config.title}
				onChange={(title) => onChange({ ...config, title })}
			/>
			<SwitchField
				label="Marcador"
				description="Muestra el marcador calculado hasta el final de la ventana."
				checked={config.showScore}
				onChange={(showScore) => onChange({ ...config, showScore })}
			/>
			<SwitchField
				label="Leyenda"
				description="Muestra los tipos de eventos presentes en la barra."
				checked={config.showLegend}
				onChange={(showLegend) => onChange({ ...config, showLegend })}
			/>
		</div>
	);
}

export function KeyEventsTimelineWidgetFilters({
	value,
	onChange,
}: WidgetPanelProps<KeyEventsTimelineFilters, KeyEventsTimelineConfig>) {
	const game = useGameStore((state) => state.game);
	const filters = {
		...DEFAULT_KEY_EVENTS_TIMELINE_FILTERS,
		...value,
		eventKinds: getSafeEventKinds(value.eventKinds),
	};

	return (
		<div className="grid gap-3">
			<SelectField
				label="Equipo"
				value={filters.team}
				onChange={(team) => {
					if (team === "both" || team === "home" || team === "away") {
						onChange({ ...filters, team });
					}
				}}
				options={[
					{ value: "both", label: "Ambos" },
					{ value: "home", label: game?.home_team.team_name ?? "Local" },
					{ value: "away", label: game?.away_team.team_name ?? "Visitante" },
				]}
			/>
			<CheckboxList
				options={EVENT_KIND_OPTIONS}
				value={filters.eventKinds}
				onChange={(eventKinds) =>
					onChange({
						...filters,
						eventKinds: getSafeEventKinds(eventKinds as KeyEventKind[]),
					})
				}
			/>
		</div>
	);
}
