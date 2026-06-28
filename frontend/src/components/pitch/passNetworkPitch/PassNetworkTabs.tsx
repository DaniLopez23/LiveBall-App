import { BarChart2, ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/event";
import type { PassNetworkEdge, PassNetworkNode } from "@/types/passNetwork";
import type { PassNetworkFiltersState } from "./passNetworkFilters.types";

import PassNetworkFilters from "./PassNetworkFilters";
import PassNetworkStats from "./PassNetworkStats";

interface DisplayNetwork {
	nodes: PassNetworkNode[];
	edges: PassNetworkEdge[];
}

interface PassNetworkTabsProps {
	isOpen: boolean;
	onToggle: () => void;
	filters: PassNetworkFiltersState;
	onFiltersChange: (filters: PassNetworkFiltersState) => void;
	currentSecond: number;
	selectedRangeSeconds: [number, number];
	onRangeChange: (range: [number, number], options?: { followLive?: boolean }) => void;
	onCurrentSecondChange: (second: number) => void;
	onReturnToLive: () => void;
	isPlaying: boolean;
	onPlay: () => void;
	onPause: () => void;
	onResetPlayback: () => void;
	canPlay: boolean;
	events: Event[];
	homeTeamId: string | null;
	awayTeamId: string | null;
	homeScoreAtMinute: number;
	awayScoreAtMinute: number;
	homeNetwork: DisplayNetwork | null;
	awayNetwork: DisplayNetwork | null;
	homeTeamName: string;
	awayTeamName: string;
	homeColor: string;
	awayColor: string;
	maxMinute: number;
	defaultValue?: "stats" | "filters";
	showToggle?: boolean;
}

const triggerClassName =
	"bg-muted/60 hover:bg-muted border-b-border data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:border-border data-[state=active]:border-b-slate-100 dark:data-[state=active]:border-b-slate-800 min-h-10 rounded-none rounded-t border border-transparent px-3 gap-1.5 text-xs data-[state=active]:-mb-px data-[state=active]:shadow-none!";

const toggleButtonClassName =
	"text-muted-foreground hover:text-foreground hover:bg-muted/60";

const PassNetworkTabs: React.FC<PassNetworkTabsProps> = ({
	isOpen,
	onToggle,
	filters,
	onFiltersChange,
	currentSecond,
	selectedRangeSeconds,
	onRangeChange,
	onCurrentSecondChange,
	onReturnToLive,
	isPlaying,
	onPlay,
	onPause,
	onResetPlayback,
	canPlay,
	events,
	homeTeamId,
	awayTeamId,
	homeScoreAtMinute,
	awayScoreAtMinute,
	homeNetwork,
	awayNetwork,
	homeTeamName,
	awayTeamName,
	homeColor,
	awayColor,
	maxMinute,
	defaultValue = "stats",
	showToggle = true,
}) => {
	if (!isOpen) {
		return (
			<div className="flex h-full items-center justify-center">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					onClick={onToggle}
					className={toggleButtonClassName}
					aria-label="Mostrar panel"
				>
					<ChevronLeft className="size-4" />
				</Button>
			</div>
		);
	}

	return (
		<Tabs defaultValue={defaultValue} className="flex h-full flex-col">
			<div
				className={cn(
					"flex flex-wrap items-center border-b shrink-0 px-2 py-1 bg-muted/40",
					!showToggle && "pr-12",
				)}
			>
				<TabsList className="min-w-0 flex-wrap bg-transparent justify-start rounded-none border-0 p-0 h-auto min-h-10 gap-0">
					<TabsTrigger value="stats" className={triggerClassName}>
						<BarChart2 className="size-3.5" />
						Estadisticas
					</TabsTrigger>
					<TabsTrigger value="filters" className={triggerClassName}>
						<SlidersHorizontal className="size-3.5" />
						Filtros
					</TabsTrigger>
				</TabsList>

				{showToggle && (
					<Button
						type="button"
						variant="ghost"
						size="icon-xs"
						onClick={onToggle}
						className={`ml-auto ${toggleButtonClassName}`}
						aria-label="Ocultar panel"
					>
						<ChevronRight className="size-4" />
					</Button>
				)}
			</div>

			<TabsContent value="stats" className="flex-1 overflow-auto p-3">
				<PassNetworkStats
					homeNetwork={homeNetwork}
					awayNetwork={awayNetwork}
					homeTeamName={homeTeamName}
					awayTeamName={awayTeamName}
					homeColor={homeColor}
					awayColor={awayColor}
				/>
			</TabsContent>

			<TabsContent value="filters" className="flex-1 overflow-auto p-4">
				<PassNetworkFilters
					filters={filters}
					onChange={onFiltersChange}
					currentSecond={currentSecond}
					selectedRangeSeconds={selectedRangeSeconds}
					onRangeChange={onRangeChange}
					onCurrentSecondChange={onCurrentSecondChange}
					onReturnToLive={onReturnToLive}
					isPlaying={isPlaying}
					onPlay={onPlay}
					onPause={onPause}
					onResetPlayback={onResetPlayback}
					canPlay={canPlay}
					events={events}
					homeTeamId={homeTeamId}
					awayTeamId={awayTeamId}
					homeTeamName={homeTeamName}
					awayTeamName={awayTeamName}
					homeColor={homeColor}
					awayColor={awayColor}
					homeScoreAtMinute={homeScoreAtMinute}
					awayScoreAtMinute={awayScoreAtMinute}
					maxSecond={maxMinute * 60}
				/>
			</TabsContent>
		</Tabs>
	);
};

export default PassNetworkTabs;
