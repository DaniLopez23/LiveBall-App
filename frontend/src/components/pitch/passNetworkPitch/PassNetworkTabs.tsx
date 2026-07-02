import React from "react";
import {
	BarChart2,
	ChevronDown,
	SlidersHorizontal,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/event";
import type { PassNetworkEdge, PassNetworkNode } from "@/types/passNetwork";
import type {
	PassNetworkFiltersState,
	PassNetworkRangeChangeOptions,
} from "./passNetworkFilters.types";

import PassNetworkFilters from "./PassNetworkFilters";
import PassNetworkStats from "./PassNetworkStats";

interface DisplayNetwork {
	nodes: PassNetworkNode[];
	edges: PassNetworkEdge[];
}

interface PassNetworkTabsProps {
	filters: PassNetworkFiltersState;
	onFiltersChange: (filters: PassNetworkFiltersState) => void;
	currentSecond: number;
	selectedRangeSeconds: [number, number];
	onRangeChange: (range: [number, number], options?: PassNetworkRangeChangeOptions) => void;
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
}

function PanelSection({
	id,
	title,
	icon,
	open,
	onToggle,
	children,
}: {
	id: string;
	title: string;
	icon: React.ReactNode;
	open: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}) {
	return (
		<section className="overflow-hidden rounded-md border bg-background">
			<Button
				type="button"
				variant="ghost"
				className="h-11 w-full justify-start rounded-none px-3"
				onClick={onToggle}
				aria-expanded={open}
				aria-controls={id}
			>
				{icon}
				<span className="font-semibold">{title}</span>
				<ChevronDown
					className={cn("ml-auto size-4 transition-transform", open && "rotate-180")}
				/>
			</Button>
			{open ? (
				<div id={id} className="border-t p-3">
					{children}
				</div>
			) : null}
		</section>
	);
}

const PassNetworkTabs: React.FC<PassNetworkTabsProps> = ({
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
}) => {
	const [statsOpen, setStatsOpen] = React.useState(true);
	const [filtersOpen, setFiltersOpen] = React.useState(true);
	const panelId = React.useId();

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
				<PanelSection
					id={`${panelId}-stats`}
					title="Estadísticas"
					icon={<BarChart2 className="size-4 text-muted-foreground" />}
					open={statsOpen}
					onToggle={() => setStatsOpen((value) => !value)}
				>
					<PassNetworkStats
						homeNetwork={homeNetwork}
						awayNetwork={awayNetwork}
						homeTeamName={homeTeamName}
						awayTeamName={awayTeamName}
						homeColor={homeColor}
						awayColor={awayColor}
					/>
				</PanelSection>

				<PanelSection
					id={`${panelId}-filters`}
					title="Filtros"
					icon={<SlidersHorizontal className="size-4 text-muted-foreground" />}
					open={filtersOpen}
					onToggle={() => setFiltersOpen((value) => !value)}
				>
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
				</PanelSection>
			</div>
		</div>
	);
};

export default PassNetworkTabs;
