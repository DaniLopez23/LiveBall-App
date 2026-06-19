import React from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider-14";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/event";
import PassNetworkTimelineSlicer from "./PassNetworkTimelineSlicer";
import {
	DEFAULT_PASS_NETWORK_FILTERS,
	type PassNetworkFiltersState,
} from "./passNetworkFilters.types";

interface PassNetworkFiltersProps {
	filters: PassNetworkFiltersState;
	onChange: (filters: PassNetworkFiltersState) => void;
	currentMinute: number;
	isPlaying: boolean;
	onPlay: () => void;
	onPause: () => void;
	onResetPlayback: () => void;
	onCurrentMinuteChange: (minute: number) => void;
	events: Event[];
	homeTeamId: string | null;
	awayTeamId: string | null;
	homeTeamName: string;
	awayTeamName: string;
	homeColor: string;
	awayColor: string;
	homeScoreAtMinute: number;
	awayScoreAtMinute: number;
	maxMinute: number;
}

const getMomentPresets = (maxMinute: number) => {
	const boundedMaxMinute = Math.max(0, Math.floor(maxMinute));

	if (boundedMaxMinute <= 45) {
		return [{ label: "Completo", range: [0, boundedMaxMinute] as [number, number] }];
	}

	return [
		{ label: "1ª Parte", range: [0, 45] as [number, number] },
		{ label: "2ª Parte", range: [45, boundedMaxMinute] as [number, number] },
		{ label: "Completo", range: [0, boundedMaxMinute] as [number, number] },
	];
};

const getMomentPresetLabel = (
	minuteRange: [number, number],
	maxMinute: number,
): string => {
	const preset = getMomentPresets(maxMinute).find(
		(item) =>
			item.range[0] === minuteRange[0] &&
			item.range[1] === minuteRange[1],
	);

	return preset?.label ?? "Ventana personalizada";
};

const PassNetworkFilters: React.FC<PassNetworkFiltersProps> = ({
	filters,
	onChange,
	currentMinute,
	isPlaying,
	onPlay,
	onPause,
	onResetPlayback,
	onCurrentMinuteChange,
	events,
	homeTeamId,
	awayTeamId,
	homeTeamName,
	awayTeamName,
	homeColor,
	awayColor,
	homeScoreAtMinute,
	awayScoreAtMinute,
	maxMinute,
}) => {
	const boundedMaxMinute = Math.max(0, Math.floor(maxMinute));
	const [rawStartMinute, rawEndMinute] = filters.minuteRange;
	const startMinute = Math.min(boundedMaxMinute, Math.max(0, rawStartMinute));
	const endMinute = Math.min(boundedMaxMinute, Math.max(startMinute, rawEndMinute));
	const clampedMinute = Math.min(endMinute, Math.max(startMinute, currentMinute));
	const canPlay = startMinute < endMinute;
	const momentPresets = getMomentPresets(boundedMaxMinute);
	const selectedPresetLabel = getMomentPresetLabel([startMinute, endMinute], boundedMaxMinute);

	return (
		<div className="flex h-full flex-col gap-5">
			{/* Section 1: Momento */}
			<div>
				<div className="mb-2 rounded-lg border border-primary/35 bg-primary/5 p-4 shadow-sm">
					<div className="grid grid-cols-[1fr_auto] items-start gap-2">
						<p className="text-sm font-semibold uppercase tracking-wide text-primary">
							Momento
						</p>
						<span className="rounded-full bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
							{selectedPresetLabel}
						</span>
					</div>

					<PassNetworkTimelineSlicer
						events={events}
						homeTeamId={homeTeamId}
						awayTeamId={awayTeamId}
						homeTeamName={homeTeamName}
						awayTeamName={awayTeamName}
						homeColor={homeColor}
						awayColor={awayColor}
						homeScore={homeScoreAtMinute}
						awayScore={awayScoreAtMinute}
						minuteRange={[startMinute, endMinute]}
						currentMinute={clampedMinute}
						maxMinute={boundedMaxMinute}
						disabled={boundedMaxMinute === 0}
						className="mt-3"
						onMinuteRangeChange={(minuteRange) => {
							onPause();
							onChange({
								...filters,
								minuteRange,
							});
						}}
						onCurrentMinuteChange={(minute) => {
							onPause();
							onCurrentMinuteChange(minute);
						}}
					/>

					<div className="mt-4 flex items-center justify-center gap-2">
						<button
							type="button"
							onClick={onPlay}
							disabled={!canPlay}
							className={cn(
								"inline-flex items-center justify-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
								isPlaying
									? "border-primary/60 bg-primary/10 text-primary"
									: "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
							)}
						>
							<Play className="size-3.5" />
							Play
						</button>

						<button
							type="button"
							onClick={onPause}
							disabled={!isPlaying}
							className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-45"
						>
							<Pause className="size-3.5" />
							Pause
						</button>

						<button
							type="button"
							onClick={onResetPlayback}
							className="inline-flex items-center justify-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
						>
							<RotateCcw className="size-3.5" />
							Reinicio
						</button>
					</div>

					<Separator className="my-4" />

					<div className="mt-4 flex gap-1">
						{momentPresets.map(({ label, range }) => {
							const active =
								startMinute === range[0] &&
								endMinute === range[1];

							return (
								<button
									key={label}
									type="button"
									onClick={() =>
										onChange({
											...filters,
											minuteRange: range,
										})
									}
									className={cn(
										"flex-1 rounded-md border px-1 py-1 text-xs transition-colors",
										active
											? "bg-primary text-primary-foreground border-primary"
											: "bg-background text-muted-foreground border-input hover:bg-muted/60 hover:text-foreground",
									)}
								>
									{label}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<Separator />

			{/* Section 2: Relacion entre nodos */}
			<div>
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
					Pases minimos por relacion
				</p>
				<div className="flex items-center gap-2">
					<span className="text-xs text-muted-foreground w-4 text-right">1</span>
					<Slider
						min={1}
						max={20}
						step={1}
						value={[filters.minPasses]}
						onValueChange={(v) =>
							onChange({
								...filters,
								minPasses: v[0] ?? 1,
							})
						}
						className="flex-1"
					/>
					<span className="text-xs font-semibold text-foreground w-8 text-right">
						{filters.minPasses}
					</span>
				</div>
			</div>

			<Separator />

			{/* Section 3: Posicion media del nodo */}
			<div>
				<p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
					Posicion media del Jugador (Nodo)
				</p>
				<div className="flex flex-col gap-1">
					{([
						{ label: "Posicion media global", value: "global" as const },
						{ label: "Posicion media dando el pase", value: "given" as const },
						{ label: "Posicion media recibiendo el pase", value: "received" as const },
					] as const).map((option) => {
						const active = filters.nodePositionMode === option.value;
						return (
							<button
								key={option.value}
								type="button"
								onClick={() =>
									onChange({
										...filters,
										nodePositionMode: option.value,
									})
								}
								className={cn(
									"w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
									active
										? "bg-primary text-primary-foreground border-primary"
										: "bg-background text-muted-foreground border-input hover:bg-muted/60 hover:text-foreground",
								)}
							>
								{option.label}
							</button>
						);
					})}
				</div>
			</div>

			<Separator />

			<button
				type="button"
				onClick={() =>
					onChange({
						...DEFAULT_PASS_NETWORK_FILTERS,
						minuteRange: [0, boundedMaxMinute],
					})
				}
				className="mt-auto inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
			>
				<RotateCcw className="size-3.5" />
				Restablecer filtros por defecto
			</button>
		</div>
	);
};

export default PassNetworkFilters;
