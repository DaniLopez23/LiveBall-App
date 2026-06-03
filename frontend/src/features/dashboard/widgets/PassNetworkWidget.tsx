import { useEffect, useMemo, useState } from "react";
import { Pause, Play } from "lucide-react";

import PassNetworkFilters from "@/components/pitch/passNetworkPitch/PassNetworkFilters";
import PassNetworkPitch from "@/components/pitch/passNetworkPitch/PassNetworkPitch";
import PassNetworkStats from "@/components/pitch/passNetworkPitch/PassNetworkStats";
import {
	DEFAULT_PASS_NETWORK_FILTERS,
	type NodePositionMode,
} from "@/components/pitch/passNetworkPitch/passNetworkFilters.types";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider-14";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import usePassNetworksStore from "@/store/passNetworksStore";
import { isShotEvent, type Event } from "@/types/event";
import type {
	MinutePositionStat,
	PassNetworkEdge,
	PassNetworkNode,
	TeamPassNetwork,
} from "@/types/passNetwork";
import type {
	WidgetComponentProps,
	WidgetPanelProps,
} from "@/features/dashboard/types/dashboard.types";
import {
	SectionTitle,
	SwitchField,
} from "@/features/dashboard/widgets/widgetControls";

export type PassNetworkConfig = {
	showStats: boolean;
	showMoment: boolean;
};

export type PassNetworkWidgetFilters = {
	minPasses: number;
	minuteRange: [number, number];
	nodePositionMode: NodePositionMode;
	momentMinute?: number;
};

export const DEFAULT_PASS_NETWORK_CONFIG: PassNetworkConfig = {
	showStats: true,
	showMoment: false,
};

export const DEFAULT_PASS_NETWORK_WIDGET_FILTERS: PassNetworkWidgetFilters = {
	...DEFAULT_PASS_NETWORK_FILTERS,
};

const HOME_COLOR = "#3b82f6";
const AWAY_COLOR = "#f43f5e";
const PLAYBACK_TICK_MS = 650;

function getMaxEventMinute(events: Event[]) {
	return events.reduce((maxMinute, event) => Math.max(maxMinute, event.min ?? 0), 0);
}

const sumMinuteStats = (
	stats: MinutePositionStat[],
	[minMinute, maxMinute]: [number, number],
): MinutePositionStat => {
	const start = Math.max(0, minMinute);
	const end = Math.min(Math.max(0, stats.length - 1), Math.max(start, maxMinute));
	let count = 0;
	let x_sum = 0;
	let y_sum = 0;

	for (let minute = start; minute <= end; minute += 1) {
		const stat = stats[minute];
		if (!stat) continue;
		count += stat.count ?? 0;
		x_sum += stat.x_sum ?? 0;
		y_sum += stat.y_sum ?? 0;
	}

	return { count, x_sum, y_sum };
};

const applyNodePositionMode = (
	node: PassNetworkNode,
	mode: NodePositionMode,
): PassNetworkNode => {
	if (mode === "given") {
		return {
			...node,
			avg_position_total: node.avg_position_given,
		};
	}

	if (mode === "received") {
		return {
			...node,
			avg_position_total: node.avg_position_received,
		};
	}

	return node;
};

const filterNetworkByFilters = (
	network: TeamPassNetwork | null,
	filters: PassNetworkWidgetFilters,
): { nodes: PassNetworkNode[]; edges: PassNetworkEdge[] } | null => {
	if (!network) return null;

	const filteredEdges: PassNetworkEdge[] = network.edges
		.map((edge) => {
			const stat = sumMinuteStats(edge.minute_position_stats, filters.minuteRange);
			if (stat.count < filters.minPasses) return null;

			return {
				...edge,
				pass_count: stat.count,
				avg_position: {
					x: stat.count > 0 ? stat.x_sum / stat.count : edge.avg_position.x,
					y: stat.count > 0 ? stat.y_sum / stat.count : edge.avg_position.y,
				},
			};
		})
		.filter((edge): edge is PassNetworkEdge => edge !== null);

	const connectedPlayerIds = new Set<string>();
	for (const edge of filteredEdges) {
		connectedPlayerIds.add(edge.from_player_id);
		connectedPlayerIds.add(edge.to_player_id);
	}

	const filteredNodes = network.nodes
		.filter((node) => connectedPlayerIds.has(node.player_id))
		.map((node) => {
			const given = sumMinuteStats(node.minute_given_stats, filters.minuteRange);
			const received = sumMinuteStats(node.minute_received_stats, filters.minuteRange);
			const totalCount = given.count + received.count;

			return {
				...node,
				passes_given: given.count,
				passes_received: received.count,
				pass_count: given.count,
				avg_position_given: {
					x: given.count > 0 ? given.x_sum / given.count : node.avg_position_given.x,
					y: given.count > 0 ? given.y_sum / given.count : node.avg_position_given.y,
				},
				avg_position_received: {
					x:
						received.count > 0
							? received.x_sum / received.count
							: node.avg_position_received.x,
					y:
						received.count > 0
							? received.y_sum / received.count
							: node.avg_position_received.y,
				},
				avg_position_total: {
					x:
						totalCount > 0
							? (given.x_sum + received.x_sum) / totalCount
							: node.avg_position_total.x,
					y:
						totalCount > 0
							? (given.y_sum + received.y_sum) / totalCount
							: node.avg_position_total.y,
				},
			};
		})
		.map((node) => applyNodePositionMode(node, filters.nodePositionMode));

	return {
		nodes: filteredNodes,
		edges: filteredEdges,
	};
};

const clampMinute = (
	minute: number,
	[minMinute, maxMinute]: [number, number],
): number => Math.min(maxMinute, Math.max(minMinute, minute));

function normalizePassNetworkFilters(
	filters: PassNetworkWidgetFilters,
	maxMinute: number,
): PassNetworkWidgetFilters {
	const boundedMaxMinute = Math.max(0, Math.floor(maxMinute));
	const startMinute = Math.min(boundedMaxMinute, Math.max(0, filters.minuteRange[0]));
	const endMinute = Math.min(
		boundedMaxMinute,
		Math.max(startMinute, filters.minuteRange[1]),
	);
	const momentMinute =
		filters.momentMinute == null
			? undefined
			: clampMinute(filters.momentMinute, [startMinute, endMinute]);

	return {
		...filters,
		minuteRange: [startMinute, endMinute],
		momentMinute,
	};
}

function getScoreAtMinute(
	events: Event[],
	homeTeamId: string | undefined,
	awayTeamId: string | undefined,
	limitMinute: number,
) {
	let home = 0;
	let away = 0;

	if (!homeTeamId || !awayTeamId) return { home, away };

	for (const event of events) {
		if (!isShotEvent(event) || event.type_id !== "16") continue;
		const minute = event.min ?? 0;
		if (minute > limitMinute) continue;
		const teamId = event.team_id ? String(event.team_id) : null;

		if (event.own_goal) {
			if (teamId === homeTeamId) away += 1;
			if (teamId === awayTeamId) home += 1;
			continue;
		}

		if (teamId === homeTeamId) home += 1;
		if (teamId === awayTeamId) away += 1;
	}

	return { home, away };
}

export function PassNetworkWidget({
	config,
	filters,
	onFiltersChange,
}: WidgetComponentProps<PassNetworkConfig, PassNetworkWidgetFilters>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const byTeamId = usePassNetworksStore((state) => state.byTeamId);
	const maxMinute = getMaxEventMinute(events);
	const normalizedFilters = normalizePassNetworkFilters(filters, maxMinute);
	const [isPlaying, setIsPlaying] = useState(false);
	const [rangeStart, rangeEnd] = normalizedFilters.minuteRange;
	const momentMinute = normalizedFilters.momentMinute ?? rangeEnd;
	const shouldUseMoment = config.showMoment || normalizedFilters.momentMinute != null;
	const effectiveFilters = shouldUseMoment
		? {
				...normalizedFilters,
				minuteRange: [rangeStart, momentMinute] as [number, number],
			}
		: normalizedFilters;
	const homeNetwork = game ? byTeamId[game.home_team.team_id] : null;
	const awayNetwork = game ? byTeamId[game.away_team.team_id] : null;
	const filteredHomeNetwork = filterNetworkByFilters(homeNetwork, effectiveFilters);
	const filteredAwayNetwork = filterNetworkByFilters(awayNetwork, effectiveFilters);
	const homeNodes = filteredHomeNetwork?.nodes ?? [];
	const homeEdges = filteredHomeNetwork?.edges ?? [];
	const awayNodes = filteredAwayNetwork?.nodes ?? [];
	const awayEdges = filteredAwayNetwork?.edges ?? [];
	const sliderMax = Math.max(1, maxMinute);

	const setMomentMinute = (minute: number) => {
		onFiltersChange?.({
			...normalizedFilters,
			momentMinute: clampMinute(minute, normalizedFilters.minuteRange),
		});
	};

	useEffect(() => {
		if (!isPlaying) return;
		if (rangeStart >= rangeEnd) {
			setIsPlaying(false);
			return;
		}

		const intervalId = window.setInterval(() => {
			const nextMinute = momentMinute >= rangeEnd ? rangeStart : momentMinute + 1;
			setMomentMinute(nextMinute);

			if (nextMinute >= rangeEnd) {
				setIsPlaying(false);
			}
		}, PLAYBACK_TICK_MS);

		return () => window.clearInterval(intervalId);
	}, [isPlaying, momentMinute, rangeEnd, rangeStart]);

	return (
		<div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
			{config.showMoment ? (
				<div className="rounded-md border bg-background p-3 lg:col-span-2">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
						<div className="flex shrink-0 items-center gap-2">
							<button
								type="button"
								onClick={() => {
									if (momentMinute >= rangeEnd) {
										setMomentMinute(rangeStart);
									}
									setIsPlaying(true);
								}}
								disabled={rangeStart >= rangeEnd}
								className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
							>
								<Play className="size-4" />
								<span className="sr-only">Play</span>
							</button>
							<button
								type="button"
								onClick={() => setIsPlaying(false)}
								disabled={!isPlaying}
								className="inline-flex size-8 items-center justify-center rounded-md border bg-background text-foreground transition-colors hover:bg-muted/60 disabled:pointer-events-none disabled:opacity-50"
							>
								<Pause className="size-4" />
								<span className="sr-only">Pause</span>
							</button>
						</div>
						<div className="min-w-0 flex-1">
							<Slider
								min={0}
								max={sliderMax}
								step={1}
								disabled={maxMinute === 0}
								value={[momentMinute]}
								onValueChange={(value) => {
									setIsPlaying(false);
									setMomentMinute(value[0] ?? rangeStart);
								}}
							/>
						</div>
						<div className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
							Min {momentMinute}'
						</div>
					</div>
				</div>
			) : null}

			<div className="flex min-h-0 flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<p className="truncate text-xs font-semibold" style={{ color: HOME_COLOR }}>
						{game?.home_team.team_name ?? "Equipo Local"}
					</p>
					<Badge variant="outline" className="rounded-md">
						{homeEdges.length} conexiones
					</Badge>
				</div>
				<div className="min-h-[13rem] flex-1 overflow-hidden rounded-md bg-slate-100 p-2 dark:bg-slate-800">
					<PassNetworkPitch
						nodes={homeNodes}
						edges={homeEdges}
						color={HOME_COLOR}
						orientation="vertical"
						animated
						noDataMessage={homeNodes.length > 0 ? undefined : "No hay datos suficientes"}
					/>
				</div>
			</div>

			<div className="flex min-h-0 flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<p className="truncate text-xs font-semibold" style={{ color: AWAY_COLOR }}>
						{game?.away_team.team_name ?? "Equipo Visitante"}
					</p>
					<Badge variant="outline" className="rounded-md">
						{awayEdges.length} conexiones
					</Badge>
				</div>
				<div className="min-h-[13rem] flex-1 overflow-hidden rounded-md bg-slate-100 p-2 dark:bg-slate-800">
					<PassNetworkPitch
						nodes={awayNodes}
						edges={awayEdges}
						color={AWAY_COLOR}
						orientation="vertical"
						mirrorX
						animated
						noDataMessage={awayNodes.length > 0 ? undefined : "No hay datos suficientes"}
					/>
				</div>
			</div>

			{config.showStats ? (
				<div className="min-h-52 overflow-hidden rounded-md border bg-background p-3 lg:col-span-2">
					<PassNetworkStats
						filters={effectiveFilters}
						homeNetwork={homeNetwork}
						awayNetwork={awayNetwork}
						homeTeamName={game?.home_team.team_name ?? "Equipo Local"}
						awayTeamName={game?.away_team.team_name ?? "Equipo Visitante"}
						homeColor={HOME_COLOR}
						awayColor={AWAY_COLOR}
					/>
				</div>
			) : null}
		</div>
	);
}

export function PassNetworkWidgetConfig({
	value,
	onChange,
}: WidgetPanelProps<PassNetworkConfig>) {
	return (
		<div className="space-y-4">
			<SectionTitle>Datos visibles</SectionTitle>
			<SwitchField
				label="Mostrar estadisticas"
				description="Incluye resumen de buckets y jugadores destacados de la red."
				checked={value.showStats}
				onChange={(showStats) => onChange({ ...value, showStats })}
			/>
			<SwitchField
				label="Mostrar momento"
				description="Muestra controles simples de play/pause y minuto actual en el widget."
				checked={value.showMoment}
				onChange={(showMoment) => onChange({ ...value, showMoment })}
			/>
		</div>
	);
}

export function PassNetworkWidgetFilters({
	value,
	onChange,
}: WidgetPanelProps<PassNetworkWidgetFilters>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const [isPlaying, setIsPlaying] = useState(false);
	const lastEventMinute = useMemo(() => getMaxEventMinute(events), [events]);
	const normalizedFilters = normalizePassNetworkFilters(value, lastEventMinute);
	const currentMinute = normalizedFilters.momentMinute ?? normalizedFilters.minuteRange[1];
	const [rangeStart, rangeEnd] = normalizedFilters.minuteRange;
	const scoreAtMinute = useMemo(
		() =>
			getScoreAtMinute(
				events,
				game?.home_team.team_id,
				game?.away_team.team_id,
				currentMinute,
			),
		[events, game?.away_team.team_id, game?.home_team.team_id, currentMinute],
	);

	useEffect(() => {
		if (!isPlaying) return;

		const intervalId = window.setInterval(() => {
			const normalizedMinute = clampMinute(currentMinute, [rangeStart, rangeEnd]);

			if (normalizedMinute >= rangeEnd) {
				setIsPlaying(false);
				onChange({ ...normalizedFilters, momentMinute: rangeEnd });
				return;
			}

			onChange({ ...normalizedFilters, momentMinute: Math.min(rangeEnd, normalizedMinute + 1) });
		}, PLAYBACK_TICK_MS);

		return () => window.clearInterval(intervalId);
	}, [currentMinute, isPlaying, normalizedFilters, onChange, rangeEnd, rangeStart]);

	return (
		<PassNetworkFilters
			filters={normalizedFilters}
			onChange={(nextFilters) =>
				onChange(
					normalizePassNetworkFilters(
						{
							...normalizedFilters,
							...nextFilters,
						},
						lastEventMinute,
					),
				)
			}
			currentMinute={currentMinute}
			isPlaying={isPlaying}
			onPlay={() => {
				if (rangeStart === rangeEnd) return;
				if (currentMinute >= rangeEnd || currentMinute < rangeStart) {
					onChange({ ...normalizedFilters, momentMinute: rangeStart });
				}
				setIsPlaying(true);
			}}
			onPause={() => setIsPlaying(false)}
			onResetPlayback={() => {
				setIsPlaying(false);
				onChange({ ...normalizedFilters, momentMinute: rangeStart });
			}}
			onCurrentMinuteChange={(minute) => {
				setIsPlaying(false);
				onChange({
					...normalizedFilters,
					momentMinute: clampMinute(minute, normalizedFilters.minuteRange),
				});
			}}
			homeScoreAtMinute={scoreAtMinute.home}
			awayScoreAtMinute={scoreAtMinute.away}
			maxMinute={lastEventMinute}
		/>
	);
}
