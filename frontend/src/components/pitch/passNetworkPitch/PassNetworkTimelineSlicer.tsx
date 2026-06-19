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
import { cn } from "@/lib/utils";
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
	minuteRange: [number, number];
	currentMinute: number;
	maxMinute: number;
	disabled?: boolean;
	className?: string;
	onMinuteRangeChange: (minuteRange: [number, number]) => void;
	onCurrentMinuteChange: (minute: number) => void;
}

const TIMELINE_END_MINUTE = 90;
const TIMELINE_END_SECONDS = TIMELINE_END_MINUTE * 60;
const KIND_LABELS: Record<KeyEventKind, string> = {
	goal: "Gol",
	shot: "Tiro",
	card: "Tarjeta",
};
const UNKNOWN_TEAM_COLOR = "#64748b";

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function getEventSeconds(event: Event): number | null {
	if (typeof event.min !== "number" || !Number.isFinite(event.min)) return null;

	const minute = Math.max(0, Math.floor(event.min));
	const second =
		typeof event.sec === "number" && Number.isFinite(event.sec)
			? clamp(Math.floor(event.sec), 0, 59)
			: 0;

	return minute * 60 + second;
}

function getLastAvailableSecond(events: Event[], maxMinute: number): number {
	const lastEventSecond = events.reduce((latestSecond, event) => {
		const eventSecond = getEventSeconds(event);
		return eventSecond == null ? latestSecond : Math.max(latestSecond, eventSecond);
	}, 0);

	return clamp(Math.max(lastEventSecond, Math.floor(maxMinute) * 60), 0, TIMELINE_END_SECONDS);
}

function minuteToPercent(minute: number): number {
	return clamp((minute / TIMELINE_END_MINUTE) * 100, 0, 100);
}

function secondToPercent(second: number): number {
	return clamp((second / TIMELINE_END_SECONDS) * 100, 0, 100);
}

function formatMinute(minute: number): string {
	return `${Math.round(minute)}'`;
}

function formatMatchTime(totalSeconds: number): string {
	const safeSeconds = Math.max(0, Math.floor(totalSeconds));
	const minute = Math.floor(safeSeconds / 60);
	const second = safeSeconds % 60;

	return `${minute}:${String(second).padStart(2, "0")}`;
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
	minuteRange,
	currentMinute,
	maxMinute,
	disabled = false,
	className,
	onMinuteRangeChange,
	onCurrentMinuteChange,
}: PassNetworkTimelineSlicerProps) {
	const trackRef = useRef<HTMLDivElement | null>(null);
	const [dragTarget, setDragTarget] = useState<"start" | "end" | "current" | null>(null);
	const maxSelectableMinute = clamp(Math.floor(maxMinute), 0, TIMELINE_END_MINUTE);
	const startMinute = clamp(Math.min(minuteRange[0], minuteRange[1]), 0, maxSelectableMinute);
	const endMinute = clamp(Math.max(minuteRange[0], minuteRange[1]), startMinute, maxSelectableMinute);
	const current = clamp(currentMinute, startMinute, endMinute);
	const lastAvailableSecond = useMemo(
		() => getLastAvailableSecond(events, maxMinute),
		[events, maxMinute],
	);
	const timelineEvents = useMemo(
		() =>
			getKeyTimelineEvents(events, homeTeamId, awayTeamId).filter(
				(event) =>
					ALL_KEY_EVENT_KINDS.includes(event.kind) &&
					event.totalSeconds <= TIMELINE_END_SECONDS,
			),
		[awayTeamId, events, homeTeamId],
	);

	const selectedStartPercent = minuteToPercent(startMinute);
	const selectedEndPercent = minuteToPercent(endMinute);
	const selectedWidthPercent = Math.max(0, selectedEndPercent - selectedStartPercent);
	const currentPercent = minuteToPercent(current);
	const playedPercent = secondToPercent(lastAvailableSecond);

	const getMinuteFromClientX = (clientX: number): number => {
		const element = trackRef.current;
		if (!element) return startMinute;

		const rect = element.getBoundingClientRect();
		if (rect.width <= 0) return startMinute;

		const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
		return clamp(Math.round(ratio * TIMELINE_END_MINUTE), 0, maxSelectableMinute);
	};

	const commitRange = (nextStart: number, nextEnd: number) => {
		const normalizedStart = clamp(Math.min(nextStart, nextEnd), 0, maxSelectableMinute);
		const normalizedEnd = clamp(Math.max(nextStart, nextEnd), normalizedStart, maxSelectableMinute);
		const nextCurrent = clamp(current, normalizedStart, normalizedEnd);

		onMinuteRangeChange([normalizedStart, normalizedEnd]);
		if (nextCurrent !== currentMinute) {
			onCurrentMinuteChange(nextCurrent);
		}
	};

	const applyDrag = (target: "start" | "end" | "current", clientX: number) => {
		if (disabled) return;

		const minute = getMinuteFromClientX(clientX);
		if (target === "start") {
			commitRange(Math.min(minute, endMinute), endMinute);
			return;
		}

		if (target === "end") {
			commitRange(startMinute, Math.max(minute, startMinute));
			return;
		}

		onCurrentMinuteChange(clamp(minute, startMinute, endMinute));
	};

	const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (disabled) return;

		const minute = getMinuteFromClientX(event.clientX);
		const target =
			minute < startMinute
				? "start"
				: minute > endMinute
					? "end"
					: "current";

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

	const handleThumbPointerDown =
		(target: "start" | "end" | "current") => (event: PointerEvent<HTMLSpanElement>) => {
			if (disabled) return;

			event.preventDefault();
			event.stopPropagation();
			setDragTarget(target);
			trackRef.current?.setPointerCapture(event.pointerId);
			applyDrag(target, event.clientX);
		};

	const handleThumbKeyDown =
		(target: "start" | "end" | "current") => (event: KeyboardEvent<HTMLSpanElement>) => {
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

			if (direction !== 0) {
				event.preventDefault();
				const delta = direction * step;

				if (target === "start") {
					commitRange(clamp(startMinute + delta, 0, endMinute), endMinute);
					return;
				}

				if (target === "end") {
					commitRange(startMinute, clamp(endMinute + delta, startMinute, maxSelectableMinute));
					return;
				}

				onCurrentMinuteChange(clamp(current + delta, startMinute, endMinute));
				return;
			}

			if (event.key !== "Home" && event.key !== "End") return;

			event.preventDefault();
			if (target === "start") {
				commitRange(event.key === "Home" ? 0 : endMinute, endMinute);
				return;
			}

			if (target === "end") {
				commitRange(startMinute, event.key === "Home" ? startMinute : maxSelectableMinute);
				return;
			}

			onCurrentMinuteChange(event.key === "Home" ? startMinute : endMinute);
		};

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
						className="absolute inset-y-0 bg-primary/30 ring-1 ring-inset ring-primary/35"
						style={{
							left: `${selectedStartPercent}%`,
							width: `${selectedWidthPercent}%`,
						}}
					/>
				</div>

				<span className="absolute left-3 top-[4.7rem] text-[10px] font-medium tabular-nums text-muted-foreground">
					0'
				</span>
				<span className="absolute right-3 top-[4.7rem] text-[10px] font-medium tabular-nums text-muted-foreground">
					90'
				</span>

				{timelineEvents.map((event, index) => {
					const percent = secondToPercent(event.totalSeconds);
					const color = getTeamColor(event.teamSide, homeColor, awayColor);
					const teamName = getTeamName(event.teamSide, homeTeamName, awayTeamName);

					return (
						<span
							key={`${event.kind}-${event.id}-${index}`}
							className="group absolute top-12 z-20 flex h-14 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
							style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${percent / 100})` }}
							aria-label={`${KIND_LABELS[event.kind]} ${formatMatchTime(event.totalSeconds)}`}
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
									{KIND_LABELS[event.kind]} - {formatMatchTime(event.totalSeconds)}
								</span>
								<span className="block text-muted-foreground">
									{teamName}
									{event.playerName ? ` - ${event.playerName}` : ""}
								</span>
							</span>
						</span>
					);
				})}

				{(["start", "end"] as const).map((target) => {
					const minute = target === "start" ? startMinute : endMinute;
					const percent = target === "start" ? selectedStartPercent : selectedEndPercent;

					return (
						<span
							key={target}
							role="slider"
							tabIndex={disabled ? undefined : 0}
							aria-label={target === "start" ? "Inicio del rango" : "Final del rango"}
							aria-valuemin={0}
							aria-valuemax={maxSelectableMinute}
							aria-valuenow={minute}
							className={cn(
								"absolute top-3 z-30 flex h-[4.65rem] w-9 -translate-x-1/2 touch-none flex-col items-center",
								disabled ? "cursor-not-allowed" : "cursor-ew-resize",
							)}
							style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${percent / 100})` }}
							onPointerDown={handleThumbPointerDown(target)}
							onKeyDown={handleThumbKeyDown(target)}
						>
							<span className="h-10 w-1.5 rounded-full bg-primary shadow-sm ring-2 ring-background" />
							<span className="mt-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-primary-foreground shadow-sm">
								{formatMinute(minute)}
							</span>
						</span>
					);
				})}

				<span
					role="slider"
					tabIndex={disabled ? undefined : 0}
					aria-label="Minuto de evolucion"
					aria-valuemin={startMinute}
					aria-valuemax={endMinute}
					aria-valuenow={current}
					className={cn(
						"absolute top-4 z-40 flex h-[4.2rem] w-8 -translate-x-1/2 touch-none flex-col items-center text-emerald-600",
						disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing",
					)}
					style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${currentPercent / 100})` }}
					onPointerDown={handleThumbPointerDown("current")}
					onKeyDown={handleThumbKeyDown("current")}
				>
					<span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm">
						{formatMinute(current)}
					</span>
					<span className="mt-0.5 h-0 w-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-emerald-600" />
					<span className="h-9 w-1 rounded-full bg-emerald-600 shadow-sm ring-2 ring-background" />
				</span>
			</div>
		</div>
	);
}
