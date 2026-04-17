import React from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider-14";
import { cn } from "@/lib/utils";
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
	homeScoreAtMinute: number;
	awayScoreAtMinute: number;
}

const MOMENT_PRESETS = [
	{ label: "1ª Parte", range: [0, 45] as [number, number] },
	{ label: "2ª Parte", range: [45, 90] as [number, number] },
	{ label: "Completo", range: [0, 90] as [number, number] },
] as const;

const getMomentPresetLabel = (minuteRange: [number, number]): string => {
	const preset = MOMENT_PRESETS.find(
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
	homeScoreAtMinute,
	awayScoreAtMinute,
}) => {
	const [activePointerId, setActivePointerId] = React.useState<number | null>(null);
	const progressTrackRef = React.useRef<HTMLDivElement | null>(null);
	const [startMinute, endMinute] = filters.minuteRange;
	const clampedMinute = Math.min(endMinute, Math.max(startMinute, currentMinute));
	const progressStart = (startMinute / 90) * 100;
	const progressEnd = (clampedMinute / 90) * 100;
	const progressWidth = Math.max(0, progressEnd - progressStart);
	const canPlay = startMinute < endMinute;
	const selectedPresetLabel = getMomentPresetLabel(filters.minuteRange);

	const handleMinuteRangeChange = (values: number[]) => {
		const first = values[0] ?? 0;
		const second = values[1] ?? first;
		onChange({
			...filters,
			minuteRange: [Math.min(first, second), Math.max(first, second)] as [number, number],
		});
	};

	const setMinuteFromPointer = (clientX: number) => {
		const element = progressTrackRef.current;
		if (!element) return;

		const rect = element.getBoundingClientRect();
		if (rect.width <= 0) return;

		const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		const rawMinute = Math.round(ratio * 90);
		const nextMinute = Math.min(endMinute, Math.max(startMinute, rawMinute));

		onCurrentMinuteChange(nextMinute);
	};

	const handleProgressPointerDown: React.PointerEventHandler<HTMLButtonElement> = (event) => {
		event.preventDefault();
		onPause();
		setActivePointerId(event.pointerId);
		event.currentTarget.setPointerCapture(event.pointerId);
		setMinuteFromPointer(event.clientX);
	};

	const handleProgressPointerMove: React.PointerEventHandler<HTMLButtonElement> = (event) => {
		if (activePointerId !== event.pointerId) return;
		setMinuteFromPointer(event.clientX);
	};

	const handleProgressPointerEnd: React.PointerEventHandler<HTMLButtonElement> = (event) => {
		if (activePointerId !== event.pointerId) return;
		setActivePointerId(null);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	return (
		<div className="flex h-full flex-col gap-5">
			{/* Section 1: Momento */}
			<div>
				<div className="mb-2 rounded-lg border border-primary/35 bg-primary/5 p-4 shadow-sm">
					<div className="grid grid-cols-[auto_1fr_auto] items-start gap-2">
						<p className="text-sm font-semibold uppercase tracking-wide text-primary">
							Momento
						</p>
						<span className="justify-self-center rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
							{homeScoreAtMinute} - {awayScoreAtMinute}
						</span>
						<span className="rounded-full bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
							{selectedPresetLabel}
						</span>
					</div>

					<div className="mt-3 text-xs text-muted-foreground">
						Define la ventana de minutos y reproduce la evolucion de la red de pases.
					</div>

					<div className="mt-4 space-y-3">
						<div className="relative px-1 pt-6">
							<div
								ref={progressTrackRef}
								className="pointer-events-none absolute inset-x-1 top-0 h-6"
							>
								<span className="absolute inset-x-0 top-2 h-1.5 rounded-full bg-primary/20" />
								<span
									className="absolute top-2 h-1.5 rounded-full bg-emerald-500/35"
									style={{
										left: `${progressStart}%`,
										width: `${progressWidth}%`,
									}}
								/>

								<button
									type="button"
									aria-label="Mover minuto actual"
									className="pointer-events-auto absolute top-0 z-20 flex h-6 w-6 -translate-x-1/2 touch-none select-none cursor-grab flex-col items-center active:cursor-grabbing"
									style={{ left: `${progressEnd}%` }}
									onPointerDown={handleProgressPointerDown}
									onPointerMove={handleProgressPointerMove}
									onPointerUp={handleProgressPointerEnd}
									onPointerCancel={handleProgressPointerEnd}
								>
									<span className="mt-0.5 h-3 w-1 rounded-full bg-emerald-600 shadow-sm" />
									<span className="-mt-0.5 h-0 w-0 border-l-[6px] border-r-[6px] border-t-8 border-l-transparent border-r-transparent border-t-emerald-600" />
								</button>
							</div>

							<Slider
								min={0}
								max={90}
								step={1}
								value={filters.minuteRange}
								onValueChange={handleMinuteRangeChange}
								className="relative z-10"
							/>
						</div>

						<div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
							<span>{startMinute}&apos;</span>
							<span>
								Minuto actual: <strong className="text-foreground">{clampedMinute}&apos;</strong>
							</span>
							<span>{endMinute}&apos;</span>
						</div>
					</div>

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
						{MOMENT_PRESETS.map(({ label, range }) => {
							const active =
								filters.minuteRange[0] === range[0] &&
								filters.minuteRange[1] === range[1];

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
				onClick={() => onChange(DEFAULT_PASS_NETWORK_FILTERS)}
				className="mt-auto inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
			>
				<RotateCcw className="size-3.5" />
				Restablecer filtros por defecto
			</button>
		</div>
	);
};

export default PassNetworkFilters;
