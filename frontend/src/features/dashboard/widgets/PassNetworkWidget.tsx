import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Filter, Network } from "lucide-react";

import PassNetworkFilters from "@/components/pitch/passNetworkPitch/PassNetworkFilters";
import PassNetworkPitch from "@/components/pitch/passNetworkPitch/PassNetworkPitch";
import PassNetworkStats from "@/components/pitch/passNetworkPitch/PassNetworkStats";
import { usePassNetworkPlayback } from "@/components/pitch/passNetworkPitch/usePassNetworkPlayback";
import {
	DEFAULT_PASS_NETWORK_FILTERS,
} from "@/components/pitch/passNetworkPitch/passNetworkFilters.types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
	buildPassingNetworkForRange,
	type BuiltPassNetwork,
} from "@/lib/passNetworkAggregation";
import {
	BUCKET_SIZE_SECONDS,
	clamp,
	derivePassingNetworkRange,
	formatMatchTime,
	getEventMatchSecond,
	getMaxEventSecond,
} from "@/lib/matchTime";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import usePassNetworksStore from "@/store/passNetworksStore";
import { isShotEvent, type Event } from "@/types/event";
import type { SnapshotPassNetworks, TeamPassNetwork } from "@/types/passNetwork";
import type {
	WidgetComponentProps,
	WidgetPanelProps,
} from "@/features/dashboard/types/dashboard.types";
import {
	SectionTitle,
	SwitchField,
} from "@/features/dashboard/widgets/widgetControls";
import type {
	PassNetworkConfig,
	PassNetworkWidgetFilters,
} from "@/features/dashboard/widgets/PassNetworkWidget.defaults";

const HOME_COLOR = "#3b82f6";
const AWAY_COLOR = "#f43f5e";

const getNetworksMaxSecond = (byTeamId: SnapshotPassNetworks): number =>
	Object.values(byTeamId).reduce(
		(maxSecond, network) =>
			Math.max(maxSecond, network.temporal?.matchTimeSeconds ?? 0),
		0,
	);

const normalizePassNetworkFilters = (
	filters: Partial<PassNetworkWidgetFilters>,
	maxSecond: number,
): PassNetworkWidgetFilters => {
	const merged = {
		...DEFAULT_PASS_NETWORK_FILTERS,
		...filters,
	};
	const availableSecond = Math.max(0, Math.floor(maxSecond));
	const fallbackEndSecond =
		typeof merged.rangeEndSecond === "number"
			? merged.rangeEndSecond
			: (merged.momentMinute ?? merged.minuteRange?.[1] ?? 0) * 60;
	const fallbackStartSecond =
		typeof merged.rangeStartSecond === "number"
			? merged.rangeStartSecond
			: (merged.minuteRange?.[0] ?? 0) * 60;
	const rangeEndSecond = clamp(fallbackEndSecond, 0, availableSecond);
	const rangeStartSecond = clamp(fallbackStartSecond, 0, rangeEndSecond);
	const windowDurationSeconds = clamp(
		Math.max(BUCKET_SIZE_SECONDS, merged.windowDurationSeconds),
		BUCKET_SIZE_SECONDS,
		Math.max(BUCKET_SIZE_SECONDS, availableSecond || BUCKET_SIZE_SECONDS),
	);
	const mode = merged.mode === "sliding" ? "sliding" : "cumulative";
	const selectedRange = derivePassingNetworkRange({
		mode,
		startSecond: rangeStartSecond,
		endSecond: merged.followLive ? availableSecond : rangeEndSecond,
		windowDurationSeconds,
	});
	const momentSecond =
		typeof merged.momentSecond === "number"
			? clamp(merged.momentSecond, selectedRange[0], selectedRange[1])
			: undefined;
	const displayRange =
		mode === "cumulative"
			? [selectedRange[0], momentSecond ?? selectedRange[1]]
			: selectedRange;

	return {
		...merged,
		mode,
		windowDurationSeconds,
		windowDurationMode: merged.windowDurationMode === "custom" ? "custom" : "preset",
		rangeStartSecond,
		rangeEndSecond,
		momentSecond,
		followLive: merged.followLive ?? true,
		minuteRange: [
			Math.floor(displayRange[0] / 60),
			Math.floor(displayRange[1] / 60),
		],
	};
};

const getSelectedRange = (
	filters: PassNetworkWidgetFilters,
	maxSecond: number,
): [number, number] => {
	const endSecond = filters.followLive
		? maxSecond
		: clamp(filters.rangeEndSecond ?? maxSecond, 0, maxSecond);

	return derivePassingNetworkRange({
		mode: filters.mode,
		startSecond: filters.rangeStartSecond ?? 0,
		endSecond,
		windowDurationSeconds: filters.windowDurationSeconds,
	});
};

const getDisplayRange = (
	filters: PassNetworkWidgetFilters,
	maxSecond: number,
): [number, number] => {
	const selectedRange = getSelectedRange(filters, maxSecond);
	if (filters.mode !== "cumulative") return selectedRange;

	return [
		selectedRange[0],
		clamp(filters.momentSecond ?? selectedRange[1], selectedRange[0], selectedRange[1]),
	];
};

function getScoreAtSecond(
	events: Event[],
	homeTeamId: string | undefined,
	awayTeamId: string | undefined,
	limitSecond: number,
) {
	let home = 0;
	let away = 0;

	if (!homeTeamId || !awayTeamId) return { home, away };

	for (const event of events) {
		if (!isShotEvent(event) || event.type_id !== "16") continue;
		const eventSecond = getEventMatchSecond(event);
		if (eventSecond == null || eventSecond > limitSecond) continue;
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

const buildDisplayNetwork = (
	network: TeamPassNetwork | null,
	range: [number, number],
	filters: PassNetworkWidgetFilters,
): BuiltPassNetwork | null =>
	buildPassingNetworkForRange(network, range[0], range[1], {
		minPasses: filters.minPasses,
		nodePositionMode: filters.nodePositionMode,
	});

type PassNetworkTeam = "home" | "away";
type PassNetworkWidgetView = "network" | "stats" | "filters";

function useWidgetSize() {
	const ref = useRef<HTMLDivElement>(null);
	const [size, setSize] = useState({ width: 0, height: 0 });

	useEffect(() => {
		const element = ref.current;
		if (!element) return;

		const updateSize = () => {
			setSize({ width: element.clientWidth, height: element.clientHeight });
		};
		updateSize();

		const observer = new ResizeObserver(updateSize);
		observer.observe(element);
		return () => observer.disconnect();
	}, []);

	return { ref, ...size };
}

function PassNetworkTeamPanel({
	teamName,
	color,
	nodes,
	edges,
	rangeLabel,
	mirrorX = false,
}: {
	teamName: string;
	color: string;
	nodes: BuiltPassNetwork["nodes"];
	edges: BuiltPassNetwork["edges"];
	rangeLabel: string;
	mirrorX?: boolean;
}) {
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="min-h-[13rem] flex-1 overflow-hidden rounded-md bg-slate-100 p-2 dark:bg-slate-800">
				<PassNetworkPitch
					nodes={nodes}
					edges={edges}
					color={color}
					orientation="vertical"
					mirrorX={mirrorX}
					animated
					noDataMessage={nodes.length > 0 ? undefined : "No hay datos suficientes"}
					teamName={teamName}
					rangeLabel={rangeLabel}
				/>
			</div>
		</div>
	);
}

function formatRangeLabel(range: [number, number]): string {
	return `Min ${formatMatchTime(range[0])} - ${formatMatchTime(range[1])}`;
}

export function PassNetworkWidget({
	config,
	filters,
	mode,
	onFiltersChange,
}: WidgetComponentProps<PassNetworkConfig, PassNetworkWidgetFilters>) {
	const game = useGameStore((state) => state.game);
	const events = useEventsStore((state) => state.events);
	const byTeamId = usePassNetworksStore((state) => state.byTeamId);
	const maxSecond = Math.max(getMaxEventSecond(events), getNetworksMaxSecond(byTeamId));
	const normalizedFilters = normalizePassNetworkFilters(filters, maxSecond);
	const selectedRangeSeconds = getSelectedRange(normalizedFilters, maxSecond);
	const displayRangeSeconds = getDisplayRange(normalizedFilters, maxSecond);
	const currentSecond = displayRangeSeconds[1];
	const homeNetwork = game ? byTeamId[game.home_team.team_id] : null;
	const awayNetwork = game ? byTeamId[game.away_team.team_id] : null;
	const filteredHomeNetwork = useMemo(
		() => buildDisplayNetwork(homeNetwork, displayRangeSeconds, normalizedFilters),
		[displayRangeSeconds, homeNetwork, normalizedFilters],
	);
	const filteredAwayNetwork = useMemo(
		() => buildDisplayNetwork(awayNetwork, displayRangeSeconds, normalizedFilters),
		[awayNetwork, displayRangeSeconds, normalizedFilters],
	);
	const homeNodes = filteredHomeNetwork?.nodes ?? [];
	const homeEdges = filteredHomeNetwork?.edges ?? [];
	const awayNodes = filteredAwayNetwork?.nodes ?? [];
	const awayEdges = filteredAwayNetwork?.edges ?? [];

	const updateFilters = (nextFilters: PassNetworkWidgetFilters) => {
		onFiltersChange?.(normalizePassNetworkFilters(nextFilters, maxSecond));
	};
	const handleRangeChange = (
		range: [number, number],
		options?: { followLive?: boolean },
	) =>
		updateFilters({
			...normalizedFilters,
			rangeStartSecond: range[0],
			rangeEndSecond: range[1],
			followLive: options?.followLive ?? false,
		});
	const handleCurrentSecondChange = (second: number) =>
		updateFilters({
			...normalizedFilters,
			momentSecond: clamp(second, selectedRangeSeconds[0], selectedRangeSeconds[1]),
			followLive: false,
		});
	const playback = usePassNetworkPlayback({
		mode: normalizedFilters.mode,
		selectedRangeSeconds,
		currentSecond,
		maxSecond,
		onRangeChange: handleRangeChange,
		onCurrentSecondChange: handleCurrentSecondChange,
	});
	const handleReturnToLive = () => {
		playback.pause();
		updateFilters({
			...normalizedFilters,
			rangeEndSecond: maxSecond,
			momentSecond: undefined,
			followLive: true,
		});
	};

	const scoreAtSecond = useMemo(
		() =>
			getScoreAtSecond(
				events,
				game?.home_team.team_id,
				game?.away_team.team_id,
				currentSecond,
			),
		[events, game?.away_team.team_id, game?.home_team.team_id, currentSecond],
	);
	const { ref: widgetRef, width: widgetWidth, height: widgetHeight } = useWidgetSize();
	const [selectedTeam, setSelectedTeam] = useState<PassNetworkTeam>("home");
	const [activeView, setActiveView] = useState<PassNetworkWidgetView>("network");
	const isCompact =
		widgetWidth > 0 && (widgetWidth < 680 || widgetHeight > 0 && widgetHeight < 520);
	const showInlineFilters = mode === "edit" && config.showFiltersInline === true;
	const shouldUseTabbedLayout =
		showInlineFilters ||
		(config.showStats &&
			(isCompact || (widgetHeight > 0 && widgetHeight < 720)));
	const selectedTeamNetwork = selectedTeam === "home"
		? {
				name: game?.home_team.team_name ?? "Equipo Local",
				color: HOME_COLOR,
				nodes: homeNodes,
				edges: homeEdges,
				mirrorX: false,
			}
		: {
				name: game?.away_team.team_name ?? "Equipo Visitante",
				color: AWAY_COLOR,
				nodes: awayNodes,
				edges: awayEdges,
				mirrorX: true,
			};
	const networkRangeLabel = formatRangeLabel(displayRangeSeconds);

	useEffect(() => {
		if (activeView === "filters" && !showInlineFilters) {
			setActiveView("network");
			return;
		}

		if (activeView === "stats" && !config.showStats) {
			setActiveView("network");
		}
	}, [activeView, config.showStats, showInlineFilters]);

	return (
		<div ref={widgetRef} className="flex h-full min-h-0 flex-col gap-3">
			{shouldUseTabbedLayout ? (
				<Tabs
					value={activeView}
					onValueChange={(view) => {
						if (view === "network" || view === "stats" || view === "filters") {
							setActiveView(view);
						}
					}}
					className="dashboard-widget-no-drag h-full min-h-0 gap-3"
				>
					<TabsList
						className={cn(
							"grid w-full",
							config.showStats && showInlineFilters
								? "grid-cols-3"
								: "grid-cols-2",
						)}
					>
						<TabsTrigger value="network" className="gap-1.5 text-xs">
							<Network className="size-3.5" />
							Red
						</TabsTrigger>
						{config.showStats ? (
							<TabsTrigger value="stats" className="gap-1.5 text-xs">
								<BarChart3 className="size-3.5" />
								Resumen
							</TabsTrigger>
						) : null}
						{showInlineFilters ? (
							<TabsTrigger value="filters" className="gap-1.5 text-xs">
								<Filter className="size-3.5" />
								Filtros
							</TabsTrigger>
						) : null}
					</TabsList>

					<TabsContent value="network" className="min-h-0 flex-1">
						{isCompact ? (
							<div className="flex h-full min-h-0 flex-col gap-2">
								<ToggleGroup
									type="single"
									value={selectedTeam}
									onValueChange={(team) => {
										if (team === "home" || team === "away") setSelectedTeam(team);
									}}
									variant="outline"
									size="sm"
									className="grid w-full grid-cols-2"
									aria-label="Equipo cuya red de pases se muestra"
								>
									<ToggleGroupItem
										value="home"
										className="min-w-0 justify-center truncate text-xs font-semibold text-blue-700 data-[state=on]:border-blue-500 data-[state=on]:bg-blue-500/10 dark:text-blue-400"
									>
										{game?.home_team.team_name ?? "Equipo Local"}
									</ToggleGroupItem>
									<ToggleGroupItem
										value="away"
										className="min-w-0 justify-center truncate text-xs font-semibold text-rose-700 data-[state=on]:border-rose-500 data-[state=on]:bg-rose-500/10 dark:text-rose-400"
									>
										{game?.away_team.team_name ?? "Equipo Visitante"}
									</ToggleGroupItem>
								</ToggleGroup>
								<PassNetworkTeamPanel
									teamName={selectedTeamNetwork.name}
									color={selectedTeamNetwork.color}
									nodes={selectedTeamNetwork.nodes}
									edges={selectedTeamNetwork.edges}
									rangeLabel={networkRangeLabel}
									mirrorX={selectedTeamNetwork.mirrorX}
								/>
							</div>
						) : (
							<div className="grid h-full min-h-0 gap-3 min-[680px]:grid-cols-2">
								<PassNetworkTeamPanel
									teamName={game?.home_team.team_name ?? "Equipo Local"}
									color={HOME_COLOR}
									nodes={homeNodes}
									edges={homeEdges}
									rangeLabel={networkRangeLabel}
								/>
								<PassNetworkTeamPanel
									teamName={game?.away_team.team_name ?? "Equipo Visitante"}
									color={AWAY_COLOR}
									nodes={awayNodes}
									edges={awayEdges}
									rangeLabel={networkRangeLabel}
									mirrorX
								/>
							</div>
						)}
					</TabsContent>

					{config.showStats ? (
						<TabsContent value="stats" className="min-h-0 flex-1 overflow-auto">
							<div className="min-h-full rounded-md border bg-background p-3">
								<PassNetworkStats
									homeNetwork={filteredHomeNetwork}
									awayNetwork={filteredAwayNetwork}
									homeTeamName={game?.home_team.team_name ?? "Equipo Local"}
									awayTeamName={game?.away_team.team_name ?? "Equipo Visitante"}
									homeColor={HOME_COLOR}
									awayColor={AWAY_COLOR}
								/>
							</div>
						</TabsContent>
					) : null}

					{showInlineFilters ? (
						<TabsContent value="filters" className="min-h-0 flex-1 overflow-auto">
							<div className="min-h-full rounded-md border bg-background p-3">
								<PassNetworkFilters
									filters={normalizedFilters}
									onChange={updateFilters}
									currentSecond={currentSecond}
									selectedRangeSeconds={selectedRangeSeconds}
									onRangeChange={playback.handleRangeChange}
									onCurrentSecondChange={playback.handleCurrentSecondChange}
									onReturnToLive={handleReturnToLive}
									isPlaying={playback.isPlaying}
									onPlay={playback.play}
									onPause={playback.pause}
									onResetPlayback={playback.reset}
									canPlay={playback.canPlay}
									events={events}
									homeTeamId={game?.home_team.team_id ?? null}
									awayTeamId={game?.away_team.team_id ?? null}
									homeTeamName={game?.home_team.team_name ?? "Equipo Local"}
									awayTeamName={game?.away_team.team_name ?? "Equipo Visitante"}
									homeColor={HOME_COLOR}
									awayColor={AWAY_COLOR}
									homeScoreAtMinute={scoreAtSecond.home}
									awayScoreAtMinute={scoreAtSecond.away}
									maxSecond={maxSecond}
								/>
							</div>
						</TabsContent>
					) : null}
				</Tabs>
			) : (
				<>
			{isCompact ? (
				<div className="flex min-h-0 flex-1 flex-col gap-2">
					<ToggleGroup
						type="single"
						value={selectedTeam}
						onValueChange={(team) => {
							if (team === "home" || team === "away") setSelectedTeam(team);
						}}
						variant="outline"
						size="sm"
						className="grid w-full grid-cols-2"
						aria-label="Equipo cuya red de pases se muestra"
					>
						<ToggleGroupItem
							value="home"
							className="min-w-0 justify-center truncate text-xs font-semibold text-blue-700 data-[state=on]:border-blue-500 data-[state=on]:bg-blue-500/10 dark:text-blue-400"
						>
							{game?.home_team.team_name ?? "Equipo Local"}
						</ToggleGroupItem>
						<ToggleGroupItem
							value="away"
							className="min-w-0 justify-center truncate text-xs font-semibold text-rose-700 data-[state=on]:border-rose-500 data-[state=on]:bg-rose-500/10 dark:text-rose-400"
						>
							{game?.away_team.team_name ?? "Equipo Visitante"}
						</ToggleGroupItem>
					</ToggleGroup>
					<PassNetworkTeamPanel
						teamName={selectedTeamNetwork.name}
						color={selectedTeamNetwork.color}
						nodes={selectedTeamNetwork.nodes}
						edges={selectedTeamNetwork.edges}
						rangeLabel={networkRangeLabel}
						mirrorX={selectedTeamNetwork.mirrorX}
					/>
				</div>
			) : (
				<div className="grid min-h-0 flex-1 gap-3 min-[680px]:grid-cols-2">
					<PassNetworkTeamPanel
						teamName={game?.home_team.team_name ?? "Equipo Local"}
						color={HOME_COLOR}
						nodes={homeNodes}
						edges={homeEdges}
						rangeLabel={networkRangeLabel}
					/>
					<PassNetworkTeamPanel
						teamName={game?.away_team.team_name ?? "Equipo Visitante"}
						color={AWAY_COLOR}
						nodes={awayNodes}
						edges={awayEdges}
						rangeLabel={networkRangeLabel}
						mirrorX
					/>
				</div>
			)}

			{config.showStats ? (
				<div className="min-h-52 shrink-0 overflow-hidden rounded-md border bg-background p-3">
					<PassNetworkStats
						homeNetwork={filteredHomeNetwork}
						awayNetwork={filteredAwayNetwork}
						homeTeamName={game?.home_team.team_name ?? "Equipo Local"}
						awayTeamName={game?.away_team.team_name ?? "Equipo Visitante"}
						homeColor={HOME_COLOR}
						awayColor={AWAY_COLOR}
					/>
				</div>
			) : null}

			{showInlineFilters ? (
				<div className="min-h-80 shrink-0 overflow-auto rounded-md border bg-background p-3">
					<PassNetworkFilters
						filters={normalizedFilters}
						onChange={updateFilters}
						currentSecond={currentSecond}
						selectedRangeSeconds={selectedRangeSeconds}
						onRangeChange={playback.handleRangeChange}
						onCurrentSecondChange={playback.handleCurrentSecondChange}
						onReturnToLive={handleReturnToLive}
						isPlaying={playback.isPlaying}
						onPlay={playback.play}
						onPause={playback.pause}
						onResetPlayback={playback.reset}
						canPlay={playback.canPlay}
						events={events}
						homeTeamId={game?.home_team.team_id ?? null}
						awayTeamId={game?.away_team.team_id ?? null}
						homeTeamName={game?.home_team.team_name ?? "Equipo Local"}
						awayTeamName={game?.away_team.team_name ?? "Equipo Visitante"}
						homeColor={HOME_COLOR}
						awayColor={AWAY_COLOR}
						homeScoreAtMinute={scoreAtSecond.home}
						awayScoreAtMinute={scoreAtSecond.away}
						maxSecond={maxSecond}
					/>
				</div>
			) : null}
				</>
			)}
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
				description="Incluye resumen del rango temporal visible."
				checked={value.showStats}
				onChange={(showStats) => onChange({ ...value, showStats })}
			/>
			<SwitchField
				label="Mostrar filtros integrados al editar"
				description="Si se desactiva, los filtros se abren desde el boton del widget."
				checked={value.showFiltersInline === true}
				onChange={(showFiltersInline) => onChange({ ...value, showFiltersInline })}
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
	const byTeamId = usePassNetworksStore((state) => state.byTeamId);
	const maxSecond = Math.max(getMaxEventSecond(events), getNetworksMaxSecond(byTeamId));
	const normalizedFilters = normalizePassNetworkFilters(value, maxSecond);
	const selectedRangeSeconds = getSelectedRange(normalizedFilters, maxSecond);
	const displayRangeSeconds = getDisplayRange(normalizedFilters, maxSecond);
	const currentSecond = displayRangeSeconds[1];
	const scoreAtSecond = useMemo(
		() =>
			getScoreAtSecond(
				events,
				game?.home_team.team_id,
				game?.away_team.team_id,
				currentSecond,
			),
		[events, game?.away_team.team_id, game?.home_team.team_id, currentSecond],
	);

	const updateFilters = (nextFilters: PassNetworkWidgetFilters) => {
		onChange(normalizePassNetworkFilters(nextFilters, maxSecond));
	};
	const handleRangeChange = (
		range: [number, number],
		options?: { followLive?: boolean },
	) =>
		updateFilters({
			...normalizedFilters,
			rangeStartSecond: range[0],
			rangeEndSecond: range[1],
			followLive: options?.followLive ?? false,
		});
	const handleCurrentSecondChange = (second: number) =>
		updateFilters({
			...normalizedFilters,
			momentSecond: clamp(second, selectedRangeSeconds[0], selectedRangeSeconds[1]),
			followLive: false,
		});
	const playback = usePassNetworkPlayback({
		mode: normalizedFilters.mode,
		selectedRangeSeconds,
		currentSecond,
		maxSecond,
		onRangeChange: handleRangeChange,
		onCurrentSecondChange: handleCurrentSecondChange,
	});
	const handleReturnToLive = () => {
		playback.pause();
		updateFilters({
			...normalizedFilters,
			rangeEndSecond: maxSecond,
			momentSecond: undefined,
			followLive: true,
		});
	};

	return (
		<PassNetworkFilters
			filters={normalizedFilters}
			onChange={updateFilters}
			currentSecond={currentSecond}
			selectedRangeSeconds={selectedRangeSeconds}
			onRangeChange={playback.handleRangeChange}
			onCurrentSecondChange={playback.handleCurrentSecondChange}
			onReturnToLive={handleReturnToLive}
			isPlaying={playback.isPlaying}
			onPlay={playback.play}
			onPause={playback.pause}
			onResetPlayback={playback.reset}
			canPlay={playback.canPlay}
			events={events}
			homeTeamId={game?.home_team.team_id ?? null}
			awayTeamId={game?.away_team.team_id ?? null}
			homeTeamName={game?.home_team.team_name ?? "Equipo Local"}
			awayTeamName={game?.away_team.team_name ?? "Equipo Visitante"}
			homeColor={HOME_COLOR}
			awayColor={AWAY_COLOR}
			homeScoreAtMinute={scoreAtSecond.home}
			awayScoreAtMinute={scoreAtSecond.away}
			maxSecond={maxSecond}
		/>
	);
}
