import { useEffect, useMemo, useState } from "react";

import PassNetworkFilters from "@/components/pitch/passNetworkPitch/PassNetworkFilters";
import PassNetworkPitch from "@/components/pitch/passNetworkPitch/PassNetworkPitch";
import PassNetworkStats from "@/components/pitch/passNetworkPitch/PassNetworkStats";
import {
	DEFAULT_PASS_NETWORK_FILTERS,
	type NodePositionMode,
} from "@/components/pitch/passNetworkPitch/passNetworkFilters.types";
import { Badge } from "@/components/ui/badge";
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
};

export type PassNetworkWidgetFilters = {
	minPasses: number;
	minuteRange: [number, number];
	nodePositionMode: NodePositionMode;
};

export const DEFAULT_PASS_NETWORK_CONFIG: PassNetworkConfig = {
	showStats: true,
};

export const DEFAULT_PASS_NETWORK_WIDGET_FILTERS: PassNetworkWidgetFilters = {
	...DEFAULT_PASS_NETWORK_FILTERS,
};

const HOME_COLOR = "#3b82f6";
const AWAY_COLOR = "#f43f5e";
const PLAYBACK_TICK_MS = 650;

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
}: WidgetComponentProps<PassNetworkConfig, PassNetworkWidgetFilters>) {
	const game = useGameStore((state) => state.game);
	const byTeamId = usePassNetworksStore((state) => state.byTeamId);
	const homeNetwork = game ? byTeamId[game.home_team.team_id] : null;
	const awayNetwork = game ? byTeamId[game.away_team.team_id] : null;
	const filteredHomeNetwork = filterNetworkByFilters(homeNetwork, filters);
	const filteredAwayNetwork = filterNetworkByFilters(awayNetwork, filters);
	const homeNodes = filteredHomeNetwork?.nodes ?? [];
	const homeEdges = filteredHomeNetwork?.edges ?? [];
	const awayNodes = filteredAwayNetwork?.nodes ?? [];
	const awayEdges = filteredAwayNetwork?.edges ?? [];

	return (
		<div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
						filters={filters}
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
	const [currentMinute, setCurrentMinute] = useState(value.minuteRange[1]);
	const [rangeStart, rangeEnd] = value.minuteRange;
	const lastEventMinute = useMemo(() => {
		if (events.length === 0) return 90;
		return Math.max(0, Math.floor(events[events.length - 1]?.min ?? 0));
	}, [events]);
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
		setCurrentMinute((minute) => clampMinute(minute, value.minuteRange));
	}, [value.minuteRange]);

	useEffect(() => {
		if (!isPlaying) return;

		const intervalId = window.setInterval(() => {
			setCurrentMinute((minute) => {
				const normalizedMinute = clampMinute(minute, [rangeStart, rangeEnd]);

				if (normalizedMinute >= rangeEnd) {
					setIsPlaying(false);
					return rangeEnd;
				}

				return Math.min(rangeEnd, normalizedMinute + 1);
			});
		}, PLAYBACK_TICK_MS);

		return () => window.clearInterval(intervalId);
	}, [isPlaying, rangeEnd, rangeStart]);

	return (
		<PassNetworkFilters
			filters={value}
			onChange={onChange}
			currentMinute={currentMinute}
			isPlaying={isPlaying}
			onPlay={() => {
				if (rangeStart === rangeEnd) return;
				setCurrentMinute((minute) =>
					minute >= rangeEnd || minute < rangeStart ? rangeStart : minute,
				);
				setIsPlaying(true);
			}}
			onPause={() => setIsPlaying(false)}
			onResetPlayback={() => {
				setIsPlaying(false);
				setCurrentMinute(rangeStart);
			}}
			onCurrentMinuteChange={(minute) => {
				setIsPlaying(false);
				setCurrentMinute(clampMinute(minute, value.minuteRange));
			}}
			homeScoreAtMinute={scoreAtMinute.home}
			awayScoreAtMinute={scoreAtMinute.away}
			maxMinute={lastEventMinute}
		/>
	);
}
