import {
	useMemo,
	useRef,
	useState,
	type KeyboardEvent,
	type PointerEvent,
} from "react";

import {
	ALL_KEY_EVENT_KINDS,
	getKeyTimelineEvents,
	type KeyEventKind,
} from "@/components/stats/KeyEventsTimeline";
import { Badge } from "@/components/ui/badge";
import {
	BUCKET_SIZE_SECONDS,
	DEFAULT_TIMELINE_END_SECONDS,
	clamp,
	snapSecondToBucket,
} from "@/lib/matchTime";
import {
	createMatchTimeline,
	formatClockSecond,
	formatTimelineRange,
	formatTimelineSecond,
} from "@/lib/matchTimeline";
import { cn } from "@/lib/utils";
import type {
	PassNetworkRangeChangeOptions,
	PassingNetworkMode,
} from "./passNetworkFilters.types";
import type { Event } from "@/types/event";
import type { TeamSide } from "@/types/stats";

interface PassNetworkTimelineSlicerProps {
	events: Event[];
	homeTeamId: string | null;
	awayTeamId: string | null;
	homeTeamName: string;
	awayTeamName: string;
	homeColor: string;
	awayColor: string;
	homeScore: number;
	awayScore: number;
	mode: PassingNetworkMode;
	selectedRangeSeconds: [number, number];
	currentSecond: number;
	maxSecond: number;
	followLive: boolean;
	bucketSizeSeconds?: number;
	disabled?: boolean;
	className?: string;
	onRangeChange: (range: [number, number], options?: PassNetworkRangeChangeOptions) => void;
	onCurrentSecondChange: (second: number) => void;
}

const KIND_LABELS: Record<KeyEventKind, string> = {
	goal: "Gol",
	shot: "Tiro",
	card: "Tarjeta",
};
const UNKNOWN_TEAM_COLOR = "#64748b";

function secondToPercent(second: number, timelineEndSecond: number): number {
	if (timelineEndSecond <= 0) return 0;
	return clamp((second / timelineEndSecond) * 100, 0, 100);
}

function getTeamName(side: TeamSide | null, homeTeamName: string, awayTeamName: string) {
	if (side === "home") return homeTeamName;
	if (side === "away") return awayTeamName;
	return "Equipo";
}

function getTeamColor(side: TeamSide | null, homeColor: string, awayColor: string) {
	if (side === "home") return homeColor;
	if (side === "away") return awayColor;
	return UNKNOWN_TEAM_COLOR;
}

function BallTimelineIcon() {
	return (
		<svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
			<g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
				<circle cx={8} cy={8} r={4.7} strokeWidth={1.4} />
				<path d="M8 5.4 10.4 7.1 9.5 10 6.5 10 5.6 7.1Z" strokeWidth={1.1} />
				<path d="M8 5.4V3.5M10.4 7.1l1.7-.8M9.5 10l1.1 1.5M6.5 10l-1.1 1.5M5.6 7.1l-1.7-.8" strokeWidth={1} />
			</g>
		</svg>
	);
}

function BootTimelineIcon() {
	return (
		<img
			src="/bota-de-futbol.png"
			alt=""
			draggable={false}
			className="size-3.5 object-contain"
		/>
	);
}

function CardTimelineIcon() {
	return (
		<svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
			<rect
				x={5}
				y={2.5}
				width={7}
				height={11}
				rx={1}
				fill="#facc15"
				stroke="currentColor"
				strokeWidth={1.4}
				transform="rotate(10 8 8)"
			/>
		</svg>
	);
}

function TimelineEventIcon({ kind }: { kind: KeyEventKind }) {
	if (kind === "goal") return <BallTimelineIcon />;
	if (kind === "shot") return <BootTimelineIcon />;
	return <CardTimelineIcon />;
}

export default function PassNetworkTimelineSlicer({
	events,
	homeTeamId,
	awayTeamId,
	homeTeamName,
	awayTeamName,
	homeColor,
	awayColor,
	homeScore,
	awayScore,
	mode,
	selectedRangeSeconds,
	currentSecond,
	maxSecond,
	followLive,
	bucketSizeSeconds = BUCKET_SIZE_SECONDS,
	disabled = false,
	className,
	onRangeChange,
	onCurrentSecondChange,
}: PassNetworkTimelineSlicerProps) {
	const trackRef = useRef<HTMLDivElement | null>(null);
	const dragOffsetRef = useRef(0);
	const [dragTarget, setDragTarget] = useState<"start" | "end" | "cursor" | "window" | null>(null);
	const timeline = useMemo(() => createMatchTimeline(events), [events]);
	const timelineEndSecond = Math.max(
		DEFAULT_TIMELINE_END_SECONDS,
		timeline.durationSecond,
		maxSecond,
		selectedRangeSeconds[1],
	);
	const maxSelectableSecond = Math.max(0, maxSecond);
	const rangeStartSecond = clamp(
		Math.min(selectedRangeSeconds[0], selectedRangeSeconds[1]),
		0,
		maxSelectableSecond,
	);
	const rangeEndSecond = clamp(
		Math.max(selectedRangeSeconds[0], selectedRangeSeconds[1]),
		rangeStartSecond,
		maxSelectableSecond,
	);
	const selectedDuration = Math.max(bucketSizeSeconds, rangeEndSecond - rangeStartSecond);
	const current = clamp(currentSecond, 0, maxSelectableSecond);
	const cursorSecond = clamp(current, rangeStartSecond, rangeEndSecond);
	const lastAvailableSecond = Math.max(0, maxSecond);
	const timelineEvents = useMemo(
		() =>
			getKeyTimelineEvents(events, homeTeamId, awayTeamId).filter(
				(event) =>
					ALL_KEY_EVENT_KINDS.includes(event.kind) &&
					event.totalSeconds <= timelineEndSecond,
			),
		[awayTeamId, events, homeTeamId, timelineEndSecond],
	);

	const selectedStartPercent = secondToPercent(rangeStartSecond, timelineEndSecond);
	const selectedEndPercent = secondToPercent(rangeEndSecond, timelineEndSecond);
	const selectedWidthPercent = Math.max(0, selectedEndPercent - selectedStartPercent);
	const cursorPercent = secondToPercent(cursorSecond, timelineEndSecond);
	const cursorWidthPercent = Math.max(0, cursorPercent - selectedStartPercent);
	const playedPercent = secondToPercent(lastAvailableSecond, timelineEndSecond);
	const halfPercent = secondToPercent(timeline.firstHalfEndSecond, timelineEndSecond);

	const getSecondFromClientX = (clientX: number): number => {
		const element = trackRef.current;
		if (!element) return current;

		const rect = element.getBoundingClientRect();
		if (rect.width <= 0) return current;

		const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
		return clamp(
			snapSecondToBucket(ratio * timelineEndSecond, bucketSizeSeconds),
			0,
			maxSelectableSecond,
		);
	};

	const commitCumulativeStart = (startSecond: number, followLiveValue = false) => {
		const nextStart = clamp(
			snapSecondToBucket(startSecond, bucketSizeSeconds),
			0,
			rangeEndSecond,
		);

		onRangeChange([nextStart, rangeEndSecond], { followLive: followLiveValue });
	};

	const commitCumulativeEnd = (endSecond: number, followLiveValue = false) => {
		const nextEnd = clamp(
			snapSecondToBucket(endSecond, bucketSizeSeconds),
			rangeStartSecond,
			maxSelectableSecond,
		);

		onRangeChange([rangeStartSecond, nextEnd], { followLive: followLiveValue });
	};

	const commitCumulativeCursor = (second: number) => {
		onCurrentSecondChange(
			clamp(
				snapSecondToBucket(second, bucketSizeSeconds),
				rangeStartSecond,
				rangeEndSecond,
			),
		);
	};

	const commitWindowStart = (startSecond: number, followLiveValue = false) => {
		const maxStart = Math.max(0, maxSelectableSecond - selectedDuration);
		const nextStart = clamp(snapSecondToBucket(startSecond, bucketSizeSeconds), 0, maxStart);
		const nextEnd = clamp(nextStart + selectedDuration, nextStart, maxSelectableSecond);
		onRangeChange([nextStart, nextEnd], { followLive: followLiveValue });
	};

	const applyDrag = (target: "start" | "end" | "cursor" | "window", clientX: number) => {
		if (disabled) return;

		const second = getSecondFromClientX(clientX);
		if (target === "start") {
			commitCumulativeStart(second, false);
			return;
		}

		if (target === "end") {
			commitCumulativeEnd(second, false);
			return;
		}

		if (target === "cursor") {
			commitCumulativeCursor(second);
			return;
		}

		commitWindowStart(second - dragOffsetRef.current, false);
	};

	const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (disabled) return;

		const second = getSecondFromClientX(event.clientX);
		const target = (() => {
			if (mode === "sliding") return "window" as const;
			const nearStart = Math.abs(second - rangeStartSecond) <= bucketSizeSeconds;
			const nearEnd = Math.abs(second - rangeEndSecond) <= bucketSizeSeconds;
			if (nearStart || nearEnd) {
				return Math.abs(second - rangeStartSecond) <= Math.abs(second - rangeEndSecond)
					? ("start" as const)
					: ("end" as const);
			}
			return second >= rangeStartSecond && second <= rangeEndSecond
				? ("cursor" as const)
				: Math.abs(second - rangeStartSecond) <= Math.abs(second - rangeEndSecond)
					? ("start" as const)
					: ("end" as const);
		})();

		if (target === "window") {
			dragOffsetRef.current =
				second >= rangeStartSecond && second <= rangeEndSecond
					? second - rangeStartSecond
					: selectedDuration / 2;
		}

		setDragTarget(target);
		event.currentTarget.setPointerCapture(event.pointerId);
		applyDrag(target, event.clientX);
	};

	const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
		if (!dragTarget) return;
		applyDrag(dragTarget, event.clientX);
	};

	const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
		setDragTarget(null);
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	const handleWindowPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
		if (disabled) return;

		event.preventDefault();
		event.stopPropagation();
		const second = getSecondFromClientX(event.clientX);
		dragOffsetRef.current = clamp(second - rangeStartSecond, 0, selectedDuration);
		setDragTarget("window");
		trackRef.current?.setPointerCapture(event.pointerId);
	};

	const handleCumulativePointerDown =
		(target: "start" | "end" | "cursor") => (event: PointerEvent<HTMLSpanElement>) => {
			if (disabled) return;

			event.preventDefault();
			event.stopPropagation();
			setDragTarget(target);
			trackRef.current?.setPointerCapture(event.pointerId);
			applyDrag(target, event.clientX);
		};

	const handleKeyDown =
		(target: "start" | "end" | "cursor" | "window") =>
		(event: KeyboardEvent<HTMLSpanElement>) => {
		if (disabled) return;

		const step = event.key === "PageUp" || event.key === "PageDown" ? 5 : 1;
		const direction =
			event.key === "ArrowRight" || event.key === "ArrowUp" || event.key === "PageUp"
				? 1
				: event.key === "ArrowLeft" ||
					  event.key === "ArrowDown" ||
					  event.key === "PageDown"
					? -1
					: 0;

		if (direction === 0) return;

		event.preventDefault();
		const delta = direction * step * bucketSizeSeconds;
		if (target === "window") {
			commitWindowStart(rangeStartSecond + delta, false);
			return;
		}

		if (target === "start") {
			commitCumulativeStart(rangeStartSecond + delta, false);
			return;
		}

		if (target === "cursor") {
			commitCumulativeCursor(cursorSecond + delta);
			return;
		}

		commitCumulativeEnd(rangeEndSecond + delta, false);
	};

	const rangeLabel = formatTimelineRange([rangeStartSecond, rangeEndSecond], timeline);

	return (
		<div className={cn("min-w-0", className)}>
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
				<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
					{ALL_KEY_EVENT_KINDS.map((kind) => (
						<span key={kind} className="inline-flex items-center gap-1.5">
							<span className="inline-flex size-5 items-center justify-center rounded-full border bg-background text-foreground">
								<TimelineEventIcon kind={kind} />
							</span>
							{KIND_LABELS[kind]}
						</span>
					))}
					<span className="inline-flex items-center gap-1.5">
						<span
							className={cn(
								"size-2 rounded-full",
								followLive ? "bg-emerald-500" : "bg-muted-foreground",
							)}
						/>
						{followLive ? "Directo" : "Manual"}
					</span>
				</div>

				<Badge
					variant="outline"
					className="rounded-md border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
				>
					<span className="max-w-20 truncate" style={{ color: homeColor }}>
						{homeTeamName}
					</span>
					<span className="mx-1.5 tabular-nums text-foreground">
						{homeScore} - {awayScore}
					</span>
					<span className="max-w-20 truncate" style={{ color: awayColor }}>
						{awayTeamName}
					</span>
				</Badge>
			</div>

			<div
				ref={trackRef}
				role="group"
				aria-label="Seleccion temporal de red de pases"
				onPointerDown={handleTrackPointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerEnd}
				onPointerCancel={handlePointerEnd}
				className={cn(
					"relative h-28 touch-none select-none rounded-lg border border-border/80 bg-background px-0 pt-5 shadow-sm",
					disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
				)}
			>
				<div className="absolute inset-x-3 top-12 h-5 -translate-y-1/2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
					<span
						className="absolute inset-y-0 left-0 bg-slate-500/55 dark:bg-slate-300/35"
						style={{ width: `${playedPercent}%` }}
					/>
					<span
						className={cn(
							"absolute inset-y-0 ring-1 ring-inset",
							mode === "sliding"
								? "bg-primary/35 ring-primary/55"
								: "bg-emerald-500/25 ring-emerald-500/35",
						)}
						style={{
							left: `${selectedStartPercent}%`,
							width: `${selectedWidthPercent}%`,
						}}
					/>
					{mode === "cumulative" ? (
						<span
							className="absolute inset-y-0 left-0 bg-primary/25"
							style={{
								left: `${selectedStartPercent}%`,
								width: `${cursorWidthPercent}%`,
							}}
						/>
					) : null}
				</div>
				<span
					className="pointer-events-none absolute top-7 z-30 h-10 w-2 -translate-x-1/2 border-x border-border bg-background"
					style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${halfPercent / 100})` }}
				>
					<span className="absolute -top-4 left-1/2 w-max -translate-x-1/2 rounded bg-background px-1 text-[10px] font-semibold text-muted-foreground">
						1P | 2P
					</span>
				</span>

				<span className="absolute left-3 top-[4.7rem] text-[10px] font-medium tabular-nums text-muted-foreground">
					00:00
				</span>
				<span className="absolute right-3 top-[4.7rem] text-[10px] font-medium tabular-nums text-muted-foreground">
					{formatTimelineSecond(timelineEndSecond, timeline, 2)}
				</span>

				{timelineEvents.map((event, index) => {
					const percent = secondToPercent(event.totalSeconds, timelineEndSecond);
					const color = getTeamColor(event.teamSide, homeColor, awayColor);
					const teamName = getTeamName(event.teamSide, homeTeamName, awayTeamName);

					return (
						<span
							key={`${event.kind}-${event.id}-${index}`}
							className="group absolute top-12 z-20 flex h-14 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
							style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${percent / 100})` }}
							aria-label={`${KIND_LABELS[event.kind]} ${formatClockSecond(event.matchSeconds)}`}
						>
							<span
								className="absolute bottom-2 top-5 w-px rounded-full shadow-sm"
								style={{ backgroundColor: color }}
							/>
							<span
								className="absolute top-0 inline-flex size-6 items-center justify-center rounded-full border bg-background shadow-sm"
								style={{ borderColor: color, color }}
							>
								<TimelineEventIcon kind={event.kind} />
							</span>
							<span className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-max max-w-52 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-left text-[11px] font-medium text-popover-foreground shadow-md group-hover:block group-focus-visible:block">
								<span className="block">
									{KIND_LABELS[event.kind]} - {formatClockSecond(event.matchSeconds)}
								</span>
								<span className="block text-muted-foreground">
									{teamName}
									{event.playerName ? ` - ${event.playerName}` : ""}
								</span>
							</span>
						</span>
					);
				})}

				{mode === "sliding" ? (
					<span
						role="slider"
						tabIndex={disabled ? undefined : 0}
						aria-label="Ventana movil de red de pases"
						aria-valuemin={0}
						aria-valuemax={maxSelectableSecond}
						aria-valuenow={rangeEndSecond}
						className={cn(
							"absolute top-12 z-40 flex h-5 -translate-y-1/2 touch-none flex-col items-center",
							disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
						)}
						style={{
							left: `calc(0.75rem + (100% - 1.5rem) * ${selectedStartPercent / 100})`,
							width: `calc((100% - 1.5rem) * ${selectedWidthPercent / 100})`,
						}}
						onPointerDown={handleWindowPointerDown}
						onKeyDown={handleKeyDown("window")}
					>
						<span className="h-full w-full rounded-full border border-primary bg-primary/25 shadow-sm ring-2 ring-background" />
						<span className="mt-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground shadow-sm">
							{rangeLabel}
						</span>
					</span>
				) : null}

				{mode === "cumulative"
					? ([
							{ target: "start" as const, second: rangeStartSecond, percent: selectedStartPercent },
							{ target: "end" as const, second: rangeEndSecond, percent: selectedEndPercent },
						]).map(({ target, second, percent }) => (
							<span
								key={target}
								role="slider"
								tabIndex={disabled ? undefined : 0}
								aria-label={target === "start" ? "Inicio del rango acumulado" : "Final del rango acumulado"}
								aria-valuemin={0}
								aria-valuemax={maxSelectableSecond}
								aria-valuenow={second}
								className={cn(
									"absolute top-4 z-50 flex h-[4.2rem] w-8 -translate-x-1/2 touch-none flex-col items-center text-emerald-600",
									disabled ? "cursor-not-allowed" : "cursor-ew-resize",
								)}
								style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${percent / 100})` }}
								onPointerDown={handleCumulativePointerDown(target)}
								onKeyDown={handleKeyDown(target)}
							>
								<span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm">
							{formatTimelineSecond(
								second,
								timeline,
								target === "end" ? 1 : 2,
							)}
								</span>
								<span className="mt-0.5 h-0 w-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-emerald-600" />
								<span className="h-9 w-1 rounded-full bg-emerald-600 shadow-sm ring-2 ring-background" />
							</span>
						))
					: null}

				{mode === "cumulative" ? (
					<span
						role="slider"
						tabIndex={disabled ? undefined : 0}
						aria-label="Instante de evolucion de la red de pases"
						aria-valuemin={rangeStartSecond}
						aria-valuemax={rangeEndSecond}
						aria-valuenow={cursorSecond}
						className={cn(
							"absolute top-12 z-60 flex h-5 w-8 -translate-x-1/2 -translate-y-1/2 touch-none flex-col items-center text-primary",
							disabled ? "cursor-not-allowed" : "cursor-ew-resize",
						)}
						style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${cursorPercent / 100})` }}
						onPointerDown={handleCumulativePointerDown("cursor")}
						onKeyDown={handleKeyDown("cursor")}
					>
						<span className="h-full w-1 rounded-full bg-primary shadow-sm ring-2 ring-background" />
						<span className="mt-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground shadow-sm">
							{formatTimelineSecond(cursorSecond, timeline, 2)}
						</span>
					</span>
				) : null}
			</div>
		</div>
	);
}
