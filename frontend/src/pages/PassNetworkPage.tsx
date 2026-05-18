import React, { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import useGameStore from "@/store/gameStore";
import usePassNetworksStore from "@/store/passNetworksStore";
import useEventsStore from "@/store/eventsStore";
import PassNetworkPitch from "@/components/pitch/passNetworkPitch/PassNetworkPitch";
import PassNetworkTabs from "@/components/pitch/passNetworkPitch/PassNetworkTabs";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  NodePositionMode,
  PassNetworkFiltersState,
} from "@/components/pitch/passNetworkPitch/passNetworkFilters.types";
import { DEFAULT_PASS_NETWORK_FILTERS } from "@/components/pitch/passNetworkPitch/passNetworkFilters.types";
import type {
  MinutePositionStat,
  PassNetworkEdge,
  PassNetworkNode,
  TeamPassNetwork,
} from "@/types/passNetwork";
import { isShotEvent } from "@/types/event";

const HOME_COLOR = "#3b82f6";
const AWAY_COLOR = "#ef4444";
const PLAYBACK_TICK_MS = 650;

const clampMinute = (
  minute: number,
  [minMinute, maxMinute]: [number, number],
): number => Math.min(maxMinute, Math.max(minMinute, minute));

const clampMinuteRange = (
  [minMinute, maxMinute]: [number, number],
  availableMaxMinute: number,
): [number, number] => {
  const boundedMaxMinute = Math.max(0, Math.floor(availableMaxMinute));
  const nextMinMinute = Math.min(boundedMaxMinute, Math.max(0, minMinute));
  const nextMaxMinute = Math.min(boundedMaxMinute, Math.max(0, maxMinute));

  return [
    Math.min(nextMinMinute, nextMaxMinute),
    Math.max(nextMinMinute, nextMaxMinute),
  ];
};

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

const filterNetworkByFilters = (
  network: TeamPassNetwork | null,
  filters: PassNetworkFiltersState,
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

const PassNetworkPage: React.FC = () => {
  const game = useGameStore((s) => s.game);
  const byTeamId = usePassNetworksStore((s) => s.byTeamId);
  const events = useEventsStore((s) => s.events);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [filters, setFilters] = useState<PassNetworkFiltersState>(
    DEFAULT_PASS_NETWORK_FILTERS,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMinute, setCurrentMinute] = useState(
    DEFAULT_PASS_NETWORK_FILTERS.minuteRange[1],
  );

  const [rangeStart, rangeEnd] = filters.minuteRange;

  const lastEventMinute = useMemo(() => {
    if (events.length === 0) return 0;

    return Math.max(0, Math.floor(events[events.length - 1].min ?? 0));
  }, [events]);

  const previousMaxMinuteRef = useRef(lastEventMinute);

  useEffect(() => {
    const previousMaxMinute = previousMaxMinuteRef.current;
    previousMaxMinuteRef.current = lastEventMinute;

    setFilters((currentFilters) => {
      const wasPinnedToLatestMinute = currentFilters.minuteRange[1] >= previousMaxMinute;
      const targetRange: [number, number] = wasPinnedToLatestMinute
        ? [currentFilters.minuteRange[0], lastEventMinute]
        : currentFilters.minuteRange;
      const nextMinuteRange = clampMinuteRange(targetRange, lastEventMinute);

      if (
        nextMinuteRange[0] === currentFilters.minuteRange[0] &&
        nextMinuteRange[1] === currentFilters.minuteRange[1]
      ) {
        return currentFilters;
      }

      return {
        ...currentFilters,
        minuteRange: nextMinuteRange,
      };
    });

    setCurrentMinute((minute) => {
      const wasAtLatestMinute = minute >= previousMaxMinute;
      return wasAtLatestMinute
        ? lastEventMinute
        : Math.min(lastEventMinute, Math.max(0, minute));
    });
  }, [lastEventMinute]);

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
  }, [isPlaying, rangeStart, rangeEnd]);

  const handleFiltersChange = (nextFilters: PassNetworkFiltersState) => {
    const boundedNextFilters: PassNetworkFiltersState = {
      ...nextFilters,
      minuteRange: clampMinuteRange(nextFilters.minuteRange, lastEventMinute),
    };
    const minuteRangeChanged =
      boundedNextFilters.minuteRange[0] !== filters.minuteRange[0] ||
      boundedNextFilters.minuteRange[1] !== filters.minuteRange[1];

    setFilters(boundedNextFilters);
    setIsPlaying(false);
    setCurrentMinute(
      minuteRangeChanged
        ? boundedNextFilters.minuteRange[1]
        : clampMinute(currentMinute, boundedNextFilters.minuteRange),
    );
  };

  const handlePlay = () => {
    if (rangeStart === rangeEnd) return;

    setCurrentMinute((minute) =>
      minute >= rangeEnd || minute < rangeStart ? rangeStart : minute,
    );
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleResetPlayback = () => {
    setIsPlaying(false);
    setCurrentMinute(rangeStart);
  };

  const handleCurrentMinuteChange = (minute: number) => {
    setIsPlaying(false);
    setCurrentMinute(clampMinute(minute, [rangeStart, rangeEnd]));
  };

  const playbackMinute = clampMinute(currentMinute, [rangeStart, rangeEnd]);

  const effectiveFilters: PassNetworkFiltersState = {
    ...filters,
    // The selected range controls playback bounds, but the rendered network
    // should represent the real match state at each instant (0' -> current').
    minuteRange: [0, playbackMinute],
  };

  const scoreAtMinute = useMemo(() => {
    if (!game) return { home: 0, away: 0 };

    const homeTeamId = String(game.home_team.team_id);
    const awayTeamId = String(game.away_team.team_id);
    const limitMinute = effectiveFilters.minuteRange[1];

    let homeScore = 0;
    let awayScore = 0;

    for (const event of events) {
      if (!isShotEvent(event) || event.type_id !== "16") continue;

      const minute = event.min ?? 0;
      if (minute > limitMinute) continue;

      const teamId = event.team_id ? String(event.team_id) : null;
      if (!teamId) continue;

      if (event.own_goal) {
        if (teamId === homeTeamId) awayScore += 1;
        if (teamId === awayTeamId) homeScore += 1;
        continue;
      }

      if (teamId === homeTeamId) homeScore += 1;
      if (teamId === awayTeamId) awayScore += 1;
    }

    return { home: homeScore, away: awayScore };
  }, [events, game, effectiveFilters.minuteRange]);

  const homeNetwork = game ? byTeamId[game.home_team.team_id] : null;
  const awayNetwork = game ? byTeamId[game.away_team.team_id] : null;
  const filteredHomeNetwork = filterNetworkByFilters(homeNetwork, effectiveFilters);
  const filteredAwayNetwork = filterNetworkByFilters(awayNetwork, effectiveFilters);
  const homeNodes = filteredHomeNetwork?.nodes ?? [];
  const homeEdges = filteredHomeNetwork?.edges ?? [];
  const awayNodes = filteredAwayNetwork?.nodes ?? [];
  const awayEdges = filteredAwayNetwork?.edges ?? [];
  const homeHasEnoughData = homeNodes.length > 0;
  const awayHasEnoughData = awayNodes.length > 0;

  return (
    <div className="flex flex-col p-4 gap-4 min-h-full">
      {/* Header */}
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

      {/* 3-column layout */}
      <div className="grid flex-1 grid-cols-1 gap-3 min-h-0 md:grid-cols-2 xl:h-150 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.85fr)_minmax(0,1fr)]">

        {/* Column 1: Home team pass network */}
        <div className="flex h-[min(72svh,34rem)] flex-col bg-slate-100 dark:bg-slate-800 rounded-lg p-2 min-h-0 xl:h-auto">
          <p
            className="text-xs font-semibold mb-2 truncate"
            style={{ color: HOME_COLOR }}
          >
            {game?.home_team.team_name ?? "Equipo Local"}
          </p>
          <div className="flex-1 min-h-0">
            <PassNetworkPitch
              nodes={homeNodes}
              edges={homeEdges}
              color={HOME_COLOR}
              orientation="vertical"
              animated
              noDataMessage={homeHasEnoughData ? undefined : "No hay datos suficientes"}
            />
          </div>
        </div>

        {/* Column 2: Stats / filters (placeholder) */}
        <div className="hidden flex-col bg-slate-100 dark:bg-slate-800 rounded-lg min-h-0 overflow-hidden xl:flex">
          <PassNetworkTabs
            isOpen={isPanelOpen}
            onToggle={() => setIsPanelOpen((current) => !current)}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            currentMinute={effectiveFilters.minuteRange[1]}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onResetPlayback={handleResetPlayback}
            onCurrentMinuteChange={handleCurrentMinuteChange}
            homeScoreAtMinute={scoreAtMinute.home}
            awayScoreAtMinute={scoreAtMinute.away}
            homeNetwork={homeNetwork}
            awayNetwork={awayNetwork}
            homeTeamName={game?.home_team.team_name ?? "Equipo Local"}
            awayTeamName={game?.away_team.team_name ?? "Equipo Visitante"}
            homeColor={HOME_COLOR}
            awayColor={AWAY_COLOR}
            maxMinute={lastEventMinute}
          />
        </div>

        {/* Column 3: Away team pass network */}
        <div className="flex h-[min(72svh,34rem)] flex-col bg-slate-100 dark:bg-slate-800 rounded-lg p-2 min-h-0 xl:h-auto">
          <p
            className="text-xs font-semibold mb-2 truncate"
            style={{ color: AWAY_COLOR }}
          >
            {game?.away_team.team_name ?? "Equipo Visitante"}
          </p>
          <div className="flex-1 min-h-0">
            <PassNetworkPitch
              nodes={awayNodes}
              edges={awayEdges}
              color={AWAY_COLOR}
              orientation="vertical"
              mirrorX
              animated
              noDataMessage={awayHasEnoughData ? undefined : "No hay datos suficientes"}
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
            isOpen
            showToggle={false}
            defaultValue="filters"
            onToggle={() => setIsMobilePanelOpen(false)}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            currentMinute={effectiveFilters.minuteRange[1]}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onResetPlayback={handleResetPlayback}
            onCurrentMinuteChange={handleCurrentMinuteChange}
            homeScoreAtMinute={scoreAtMinute.home}
            awayScoreAtMinute={scoreAtMinute.away}
            homeNetwork={homeNetwork}
            awayNetwork={awayNetwork}
            homeTeamName={game?.home_team.team_name ?? "Equipo Local"}
            awayTeamName={game?.away_team.team_name ?? "Equipo Visitante"}
            homeColor={HOME_COLOR}
            awayColor={AWAY_COLOR}
            maxMinute={lastEventMinute}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default PassNetworkPage;
