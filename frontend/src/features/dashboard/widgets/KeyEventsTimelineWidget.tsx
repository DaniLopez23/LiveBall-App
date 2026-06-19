import { useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import KeyEventsTimeline, {
	ALL_KEY_EVENT_KINDS,
	getAvailableTimelineMinute,
	getScoreAtTimelineSecond,
	type KeyEventKind,
	type KeyEventsTimelineTeamFilter,
} from "@/components/stats/KeyEventsTimeline";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import type {
	WidgetComponentProps,
	WidgetPanelProps,
} from "@/features/dashboard/types/dashboard.types";
import {
	CheckboxList,
	MinuteRangeField,
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

function clampMinuteRange(
	value: [number, number],
	maxMinute: number,
): [number, number] {
	const boundedMaxMinute = Math.max(0, Math.floor(maxMinute));
	const start = Math.min(boundedMaxMinute, Math.max(0, value[0]));
	const end = Math.min(boundedMaxMinute, Math.max(start, value[1]));

	return [start, end];
}

export function KeyEventsTimelineWidget({
	config,
	filters,
}: WidgetComponentProps<KeyEventsTimelineConfig, KeyEventsTimelineFilters>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const homeTeamId = game?.home_team.team_id ?? null;
	const awayTeamId = game?.away_team.team_id ?? null;
	const maxMinute = useMemo(() => getAvailableTimelineMinute(events), [events]);
	const minuteRange = clampMinuteRange(filters.minuteRange, maxMinute);
	const currentMinute = minuteRange[1];
	const showCurrentMarker = config.showCurrentMarker ?? false;
	const score =
		homeTeamId && awayTeamId
			? getScoreAtTimelineSecond(
					events,
					homeTeamId,
					awayTeamId,
					currentMinute * 60 + 59,
				)
			: { home: 0, away: 0 };
	const eventKinds = getSafeEventKinds(filters.eventKinds);
	const badges = [
		filters.team === "both"
			? "Ambos equipos"
			: filters.team === "home"
				? game?.home_team.team_name ?? "Local"
				: game?.away_team.team_name ?? "Visitante",
		`${minuteRange[0]}'-${minuteRange[1]}'`,
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
					currentMinute={showCurrentMarker ? currentMinute : undefined}
					homeScore={score.home}
					awayScore={score.away}
					eventKinds={eventKinds}
					teamFilter={filters.team}
					minuteRange={minuteRange}
					showScore={config.showScore ?? true}
					showLegend={config.showLegend ?? true}
					showCurrentMarker={showCurrentMarker}
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
			<SwitchField
				label="Minuto seleccionado"
				description="Muestra el indicador del final de la ventana temporal."
				checked={config.showCurrentMarker}
				onChange={(showCurrentMarker) => onChange({ ...config, showCurrentMarker })}
			/>
		</div>
	);
}

export function KeyEventsTimelineWidgetFilters({
	value,
	onChange,
}: WidgetPanelProps<KeyEventsTimelineFilters, KeyEventsTimelineConfig>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const maxMinute = useMemo(() => getAvailableTimelineMinute(events), [events]);
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
			<MinuteRangeField
				label="Eventos visibles"
				value={filters.minuteRange}
				maxMinute={maxMinute}
				onChange={(minuteRange) => onChange({ ...filters, minuteRange })}
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
