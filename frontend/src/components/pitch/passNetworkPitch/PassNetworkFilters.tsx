import React from "react";
import { Pause, Play, Radio, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider-14";
import { formatMatchTime, clamp, getEventMatchSecond } from "@/lib/matchTime";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/event";
import PassNetworkTimelineSlicer from "./PassNetworkTimelineSlicer";
import {
	DEFAULT_PASS_NETWORK_FILTERS,
	type PassingNetworkMode,
	type PassNetworkFiltersState,
} from "./passNetworkFilters.types";

interface PassNetworkFiltersProps {
	filters: PassNetworkFiltersState;
	onChange: (filters: PassNetworkFiltersState) => void;
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
	homeTeamName: string;
	awayTeamName: string;
	homeColor: string;
	awayColor: string;
	homeScoreAtMinute: number;
	awayScoreAtMinute: number;
	maxSecond: number;
}

const WINDOW_PRESETS_SECONDS = [5 * 60, 10 * 60, 15 * 60];
const FIRST_HALF_SECONDS = 45 * 60;

const modeOptions: Array<{ value: PassingNetworkMode; label: string }> = [
	{ value: "cumulative", label: "Acumulado" },
	{ value: "sliding", label: "Ventana movil" },
];

const clampDuration = (durationSeconds: number, maxSecond: number): number => {
	const maxDuration = Math.max(60, maxSecond);
	return clamp(Math.max(60, Math.round(durationSeconds)), 60, maxDuration);
};

const getCumulativePeriodPresets = (events: Event[], maxSecond: number) => {
	const boundedMaxSecond = Math.max(0, Math.floor(maxSecond));
	const firstPeriodEnd = events.reduce((latestSecond, event) => {
		if (event.period_id !== 1) return latestSecond;
		const eventSecond = getEventMatchSecond(event);
		return eventSecond == null ? latestSecond : Math.max(latestSecond, eventSecond);
	}, 0);
	const secondPeriodStart = events.reduce<number | null>((earliestSecond, event) => {
		if (event.period_id !== 2) return earliestSecond;
		const eventSecond = getEventMatchSecond(event);
		if (eventSecond == null) return earliestSecond;
		return earliestSecond == null ? eventSecond : Math.min(earliestSecond, eventSecond);
	}, null);
	const extraTimeStart = events.reduce<number | null>((earliestSecond, event) => {
		if ((event.period_id ?? 0) < 3) return earliestSecond;
		const eventSecond = getEventMatchSecond(event);
		if (eventSecond == null) return earliestSecond;
		return earliestSecond == null ? eventSecond : Math.min(earliestSecond, eventSecond);
	}, null);
	const hasSecondHalf =
		secondPeriodStart != null ||
		(boundedMaxSecond > FIRST_HALF_SECONDS && firstPeriodEnd <= FIRST_HALF_SECONDS);

	if (!hasSecondHalf) {
		return [{ label: "Completo", range: [0, boundedMaxSecond] as [number, number] }];
	}

	const secondHalfStart = clamp(
		secondPeriodStart ?? FIRST_HALF_SECONDS,
		FIRST_HALF_SECONDS,
		boundedMaxSecond,
	);
	const secondHalfEnd = clamp(
		extraTimeStart ?? boundedMaxSecond,
		secondHalfStart,
		boundedMaxSecond,
	);

	return [
		{ label: "Primera parte", range: [0, secondHalfStart] as [number, number] },
		{ label: "Segunda parte", range: [secondHalfStart, secondHalfEnd] as [number, number] },
		{ label: "Completo", range: [0, boundedMaxSecond] as [number, number] },
	];
};

const PassNetworkFilters: React.FC<PassNetworkFiltersProps> = ({
	filters,
	onChange,
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
	homeTeamName,
	awayTeamName,
	homeColor,
	awayColor,
	homeScoreAtMinute,
	awayScoreAtMinute,
	maxSecond,
}) => {
	const [rangeStartSecond, rangeEndSecond] = selectedRangeSeconds;
	const customDurationMinutes = Math.max(
		1,
		Math.round(filters.windowDurationSeconds / 60),
	);
	const isLiveDisabled = filters.followLive && currentSecond >= maxSecond;
	const cumulativePeriodPresets = getCumulativePeriodPresets(events, maxSecond);
	const displayEndSecond =
		filters.mode === "cumulative"
			? clamp(currentSecond, rangeStartSecond, rangeEndSecond)
			: rangeEndSecond;

	return (
		<div className="flex h-full flex-col gap-5">
			<div>
				<div className="mb-2 rounded-lg border border-primary/35 bg-primary/5 p-4 shadow-sm">
					<div className="grid grid-cols-[1fr_auto] items-start gap-2">
						<p className="text-sm font-semibold uppercase tracking-wide text-primary">
							Seleccion de intervalos de tiempo
						</p>
						<span className="rounded-full bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
							{filters.mode === "cumulative" ? "Acumulado" : "Ventana movil"}
						</span>
					</div>

					<div className="mt-3 grid grid-cols-2 gap-1 rounded-md border bg-background p-1">
						{modeOptions.map((option) => {
							const active = filters.mode === option.value;
							return (
								<button
									key={option.value}
									type="button"
									onClick={() => {
										onPause();
										onChange({
											...filters,
											mode: option.value,
										});
									}}
									className={cn(
										"inline-flex items-center justify-center gap-1.5 rounded px-2 py-1.5 text-xs font-medium transition-colors",
										active
											? "bg-primary text-primary-foreground"
											: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
									)}
								>
									<Radio className="size-3.5" />
									{option.label}
								</button>
							);
						})}
					</div>

					{filters.mode === "sliding" ? (
						<div className="mt-4">
							<div className="flex flex-wrap items-center gap-1">
								{WINDOW_PRESETS_SECONDS.map((duration) => {
									const active =
										filters.windowDurationMode === "preset" &&
										filters.windowDurationSeconds === duration;
									return (
										<button
											key={duration}
											type="button"
											onClick={() => {
												onPause();
												onChange({
													...filters,
													windowDurationSeconds: clampDuration(duration, maxSecond),
													windowDurationMode: "preset",
												});
											}}
											className={cn(
												"rounded-md border px-2 py-1 text-xs transition-colors",
												active
													? "border-primary bg-primary text-primary-foreground"
													: "border-input bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
											)}
										>
											{duration / 60} min
										</button>
									);
								})}
								<button
									type="button"
									onClick={() => {
										onPause();
										onChange({
											...filters,
											windowDurationMode: "custom",
										});
									}}
									className={cn(
										"rounded-md border px-2 py-1 text-xs transition-colors",
										filters.windowDurationMode === "custom"
											? "border-primary bg-primary text-primary-foreground"
											: "border-input bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
									)}
								>
									Personalizado
								</button>
								<Input
									type="number"
									min={1}
									step={1}
									disabled={filters.windowDurationMode !== "custom"}
									aria-label="Duracion personalizada en minutos"
									value={customDurationMinutes}
									onChange={(event) => {
										const minutes = Number(event.target.value);
										if (!Number.isFinite(minutes) || minutes <= 0) return;
										onPause();
										onChange({
											...filters,
											windowDurationSeconds: clampDuration(minutes * 60, maxSecond),
											windowDurationMode: "custom",
										});
									}}
									className="h-8 w-20 text-right text-xs"
								/>
							</div>
						</div>
					) : null}

					{filters.mode === "cumulative" ? (
						<div className="mt-4">
							<p className="mb-2 text-xs font-medium text-muted-foreground">
								Tramo del partido
							</p>
							<div
								className={cn(
									"grid gap-1 rounded-md border bg-background p-1",
									cumulativePeriodPresets.length === 1 ? "grid-cols-1" : "grid-cols-3",
								)}
							>
								{cumulativePeriodPresets.map(({ label, range }) => {
									const active =
										rangeStartSecond === range[0] && rangeEndSecond === range[1];
									return (
										<button
											key={label}
											type="button"
											onClick={() => {
												onPause();
												onRangeChange(range, { followLive: false });
											}}
											className={cn(
												"rounded px-2 py-1.5 text-xs font-medium transition-colors",
												active
													? "bg-primary text-primary-foreground"
													: "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
											)}
										>
											{label}
										</button>
									);
								})}
							</div>
						</div>
					) : null}

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
						mode={filters.mode}
						selectedRangeSeconds={selectedRangeSeconds}
						currentSecond={currentSecond}
						maxSecond={maxSecond}
						followLive={filters.followLive}
						disabled={maxSecond === 0}
						className="mt-4"
						onRangeChange={onRangeChange}
						onCurrentSecondChange={onCurrentSecondChange}
					/>

					<div className="mt-4 flex flex-wrap items-center justify-center gap-2">
						<Button
							type="button"
							size="sm"
							onClick={onPlay}
							disabled={!canPlay || isPlaying}
							className="h-8 gap-1.5 text-xs"
						>
							<Play className="size-3.5" />
							Play
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onPause}
							disabled={!isPlaying}
							className="h-8 gap-1.5 text-xs"
						>
							<Pause className="size-3.5" />
							Pausa
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onResetPlayback}
							className="h-8 gap-1.5 text-xs"
						>
							<RotateCcw className="size-3.5" />
							Reiniciar
						</Button>
					</div>

					<div className="mt-4 flex flex-wrap items-center justify-between gap-2">
						<p className="text-xs font-medium text-muted-foreground">
							Mostrando desde{" "}
							<span className="tabular-nums text-foreground">
								{formatMatchTime(rangeStartSecond)}
							</span>{" "}
							hasta{" "}
							<span className="tabular-nums text-foreground">
								{formatMatchTime(displayEndSecond)}
							</span>
						</p>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onReturnToLive}
							disabled={isLiveDisabled}
							className="h-8 gap-1.5 text-xs"
						>
							<Radio className="size-3.5" />
							Volver al directo
						</Button>
					</div>
				</div>
			</div>

			<Separator />

			<div>
				<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Pases minimos por relacion
				</p>
				<div className="flex items-center gap-2">
					<span className="w-4 text-right text-xs text-muted-foreground">1</span>
					<Slider
						min={1}
						max={20}
						step={1}
						value={[filters.minPasses]}
						onValueChange={(value) =>
							onChange({
								...filters,
								minPasses: value[0] ?? 1,
							})
						}
						className="flex-1"
					/>
					<span className="w-8 text-right text-xs font-semibold text-foreground">
						{filters.minPasses}
					</span>
				</div>
			</div>

			<Separator />

			<div>
				<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					Posicion media del jugador
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
										? "border-primary bg-primary text-primary-foreground"
										: "border-input bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
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
				onClick={() => {
					onPause();
					onChange({
						...DEFAULT_PASS_NETWORK_FILTERS,
						rangeStartSecond: 0,
						rangeEndSecond: maxSecond,
						minuteRange: [0, Math.floor(maxSecond / 60)],
					});
				}}
				className="mt-auto inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
			>
				<RotateCcw className="size-3.5" />
				Restablecer filtros por defecto
			</button>
		</div>
	);
};

export default PassNetworkFilters;
