import React, { useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import PassNetworkPitch from "@/components/pitch/passNetworkPitch/PassNetworkPitch";
import PassNetworkTabs from "@/components/pitch/passNetworkPitch/PassNetworkTabs";
import { usePassNetworkPlayback } from "@/components/pitch/passNetworkPitch/usePassNetworkPlayback";
import {
	DEFAULT_PASS_NETWORK_FILTERS,
	type PassNetworkFiltersState,
	type PassNetworkRangeChangeOptions,
} from "@/components/pitch/passNetworkPitch/passNetworkFilters.types";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	buildPassingNetworkForRange,
	type BuiltPassNetwork,
} from "@/lib/passNetworkAggregation";
import {
	BUCKET_SIZE_SECONDS,
	clamp,
	derivePassingNetworkRange,
} from "@/lib/matchTime";
import {
	createMatchTimeline,
	eventToTimelineSecond,
	formatTimelineRange,
	timelineRangeToMatchRange,
	type MatchTimelineModel,
} from "@/lib/matchTimeline";
import useEventsStore from "@/store/eventsStore";
import useGameStore from "@/store/gameStore";
import usePassNetworksStore from "@/store/passNetworksStore";
import { isShotEvent } from "@/types/event";
import type { Event } from "@/types/event";
import type { SnapshotPassNetworks, TeamPassNetwork } from "@/types/passNetwork";

const HOME_COLOR = "#3b82f6";
const AWAY_COLOR = "#f43f5e";

const getNetworksMaxSecond = (byTeamId: SnapshotPassNetworks): number =>
	Object.values(byTeamId).reduce(
		(maxSecond, network) =>
			Math.max(maxSecond, network.temporal?.matchTimeSeconds ?? 0),
		0,
	);

const normalizePassNetworkFilters = (
	filters: Partial<PassNetworkFiltersState>,
	maxSecond: number,
): PassNetworkFiltersState => {
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
	filters: PassNetworkFiltersState,
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
	filters: PassNetworkFiltersState,
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
	const timeline = createMatchTimeline(events);
	let home = 0;
	let away = 0;

	if (!homeTeamId || !awayTeamId) return { home, away };

	for (const event of events) {
		if (!isShotEvent(event) || event.type_id !== "16") continue;
		const eventSecond = eventToTimelineSecond(event, timeline);
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
	filters: PassNetworkFiltersState,
	timeline: MatchTimelineModel,
): BuiltPassNetwork | null => {
	const matchRange = timelineRangeToMatchRange(range, timeline);
	return buildPassingNetworkForRange(network, matchRange[0], matchRange[1], {
		minPasses: filters.minPasses,
		nodePositionMode: filters.nodePositionMode,
	});
};

const buildStatsNetwork = (
	network: TeamPassNetwork | null,
	range: [number, number],
	filters: PassNetworkFiltersState,
	timeline: MatchTimelineModel,
): BuiltPassNetwork | null => {
	const matchRange = timelineRangeToMatchRange(range, timeline);
	return buildPassingNetworkForRange(network, matchRange[0], matchRange[1], {
		minPasses: 1,
		nodePositionMode: filters.nodePositionMode,
	});
};

function formatRangeLabel(range: [number, number], timeline: MatchTimelineModel): string {
	return `Min ${formatTimelineRange(range, timeline)}`;
}

const PassNetworkPage: React.FC = () => {
	const game = useGameStore((state) => state.game);
	const byTeamId = usePassNetworksStore((state) => state.byTeamId);
	const events = useEventsStore((state) => state.events);
	const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
	const [filters, setFilters] = useState<PassNetworkFiltersState>(
		DEFAULT_PASS_NETWORK_FILTERS,
	);

	const timeline = useMemo(() => createMatchTimeline(events), [events]);
	const maxSecond = events.length > 0
		? timeline.availableSecond
		: getNetworksMaxSecond(byTeamId);
	const normalizedFilters = normalizePassNetworkFilters(filters, maxSecond);
	const selectedRangeSeconds = getSelectedRange(normalizedFilters, maxSecond);
	const displayRangeSeconds = getDisplayRange(normalizedFilters, maxSecond);
	const currentSecond = displayRangeSeconds[1];
	const homeNetwork = game ? byTeamId[game.home_team.team_id] : null;
	const awayNetwork = game ? byTeamId[game.away_team.team_id] : null;
	const filteredHomeNetwork = useMemo(
		() => buildDisplayNetwork(homeNetwork, displayRangeSeconds, normalizedFilters, timeline),
		[displayRangeSeconds, homeNetwork, normalizedFilters, timeline],
	);
	const filteredAwayNetwork = useMemo(
		() => buildDisplayNetwork(awayNetwork, displayRangeSeconds, normalizedFilters, timeline),
		[awayNetwork, displayRangeSeconds, normalizedFilters, timeline],
	);
	const statsHomeNetwork = useMemo(
		() => buildStatsNetwork(homeNetwork, displayRangeSeconds, normalizedFilters, timeline),
		[displayRangeSeconds, homeNetwork, normalizedFilters, timeline],
	);
	const statsAwayNetwork = useMemo(
		() => buildStatsNetwork(awayNetwork, displayRangeSeconds, normalizedFilters, timeline),
		[awayNetwork, displayRangeSeconds, normalizedFilters, timeline],
	);
	const homeNodes = filteredHomeNetwork?.nodes ?? [];
	const homeEdges = filteredHomeNetwork?.edges ?? [];
	const awayNodes = filteredAwayNetwork?.nodes ?? [];
	const awayEdges = filteredAwayNetwork?.edges ?? [];
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
	const networkRangeLabel = formatRangeLabel(displayRangeSeconds, timeline);

	const handleFiltersChange = (nextFilters: PassNetworkFiltersState) => {
		setFilters(normalizePassNetworkFilters(nextFilters, maxSecond));
	};

	const handleRangeChange = (
		range: [number, number],
		options?: PassNetworkRangeChangeOptions,
	) => {
		handleFiltersChange({
			...normalizedFilters,
			rangeStartSecond: range[0],
			rangeEndSecond: range[1],
			momentSecond: options?.resetMoment ? range[1] : normalizedFilters.momentSecond,
			followLive: options?.followLive ?? false,
		});
	};
	const handleCurrentSecondChange = (second: number) => {
		handleFiltersChange({
			...normalizedFilters,
			momentSecond: clamp(second, selectedRangeSeconds[0], selectedRangeSeconds[1]),
			followLive: false,
		});
	};

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
		handleFiltersChange({
			...normalizedFilters,
			rangeEndSecond: maxSecond,
			momentSecond: undefined,
			followLive: true,
		});
	};

	return (
		<div className="flex min-h-full flex-col gap-4 p-4">
			<div className="flex flex-wrap items-center gap-2">
				<h1 className="text-2xl font-bold">Redes de Pases</h1>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setIsMobilePanelOpen(true)}
					className="ml-auto xl:hidden"
				>
					<SlidersHorizontal className="size-4" />
					Filtros
				</Button>
			</div>

			<div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:h-150 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)_minmax(0,1fr)]">
				<div className="flex h-[min(72svh,34rem)] min-h-0 flex-col rounded-lg bg-slate-100 p-2 dark:bg-slate-800 xl:h-auto">
					<div className="min-h-0 flex-1">
						<PassNetworkPitch
							nodes={homeNodes}
							edges={homeEdges}
							color={HOME_COLOR}
							orientation="vertical"
							animated
							noDataMessage={homeNodes.length > 0 ? undefined : "No hay datos suficientes"}
							teamName={game?.home_team.team_name ?? "Equipo Local"}
							rangeLabel={networkRangeLabel}
						/>
					</div>
				</div>

				<div className="hidden min-h-0 flex-col xl:flex">
					<PassNetworkTabs
						filters={normalizedFilters}
						onFiltersChange={handleFiltersChange}
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
						homeScoreAtMinute={scoreAtSecond.home}
						awayScoreAtMinute={scoreAtSecond.away}
						homeNetwork={statsHomeNetwork}
						awayNetwork={statsAwayNetwork}
						homeTeamName={game?.home_team.team_name ?? "Equipo Local"}
						awayTeamName={game?.away_team.team_name ?? "Equipo Visitante"}
						homeColor={HOME_COLOR}
						awayColor={AWAY_COLOR}
						maxMinute={Math.ceil(maxSecond / 60)}
					/>
				</div>

				<div className="flex h-[min(72svh,34rem)] min-h-0 flex-col rounded-lg bg-slate-100 p-2 dark:bg-slate-800 xl:h-auto">
					<div className="min-h-0 flex-1">
						<PassNetworkPitch
							nodes={awayNodes}
							edges={awayEdges}
							color={AWAY_COLOR}
							orientation="vertical"
							mirrorX
							animated
							noDataMessage={awayNodes.length > 0 ? undefined : "No hay datos suficientes"}
							teamName={game?.away_team.team_name ?? "Equipo Visitante"}
							rangeLabel={networkRangeLabel}
						/>
					</div>
				</div>
			</div>

			<Sheet open={isMobilePanelOpen} onOpenChange={setIsMobilePanelOpen}>
				<SheetContent
					side="bottom"
					className="h-[85svh] max-h-[46rem] gap-0 rounded-t-lg p-0"
				>
					<SheetHeader className="sr-only">
						<SheetTitle>Panel de red de pases</SheetTitle>
					</SheetHeader>
					<PassNetworkTabs
						filters={normalizedFilters}
						onFiltersChange={handleFiltersChange}
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
						homeScoreAtMinute={scoreAtSecond.home}
						awayScoreAtMinute={scoreAtSecond.away}
						homeNetwork={statsHomeNetwork}
						awayNetwork={statsAwayNetwork}
						homeTeamName={game?.home_team.team_name ?? "Equipo Local"}
						awayTeamName={game?.away_team.team_name ?? "Equipo Visitante"}
						homeColor={HOME_COLOR}
						awayColor={AWAY_COLOR}
						maxMinute={Math.ceil(maxSecond / 60)}
					/>
				</SheetContent>
			</Sheet>
		</div>
	);
};

export default PassNetworkPage;
