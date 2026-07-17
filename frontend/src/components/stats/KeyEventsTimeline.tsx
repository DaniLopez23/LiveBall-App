import { useMemo, useRef, type PointerEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { getEventMatchSecond } from "@/lib/matchTime";
import {
	createMatchTimeline,
	eventToTimelineSecond,
	formatClockSecond,
	formatTimelineSecond,
} from "@/lib/matchTimeline";
import { cn } from "@/lib/utils";
import type { Event } from "@/types/event";
import { isShotEvent } from "@/types/event";
import type { TeamSide } from "@/types/stats";

export type KeyEventKind = "goal" | "shot" | "card";
export type KeyEventsTimelineTeamFilter = TeamSide | "both";

export interface KeyTimelineEvent {
	id: string;
	kind: KeyEventKind;
	minute: number;
	second: number;
	totalSeconds: number;
	matchSeconds: number;
	periodId: number;
	teamId: string | null;
	teamSide: TeamSide | null;
	playerName: string | null;
	eventName: string;
}

interface KeyEventsTimelineProps {
	events: Event[];
	homeTeamId?: string | null;
	awayTeamId?: string | null;
	homeTeamName?: string;
	awayTeamName?: string;
	homeColor?: string;
	awayColor?: string;
	currentMinute?: number | null;
	currentSecond?: number | null;
	homeScore?: number | null;
	awayScore?: number | null;
	eventKinds?: KeyEventKind[];
	teamFilter?: KeyEventsTimelineTeamFilter;
	minuteRange?: [number, number];
	selectableMinuteRange?: [number, number];
	showScore?: boolean;
	showLegend?: boolean;
	showCurrentMarker?: boolean;
	compact?: boolean;
	className?: string;
	onTimeSelect?: (minute: number) => void;
}

interface TimelineBounds {
	durationSeconds: number;
	matchEndSeconds: number | null;
	firstHalfEndSeconds: number | null;
}

const SHOT_TYPE_IDS = new Set(["13", "14", "15"]);
const GOAL_TYPE_ID = "16";
const CARD_TYPE_ID = "17";
const DEFAULT_HOME_COLOR = "#3b82f6";
const DEFAULT_AWAY_COLOR = "#f43f5e";
const UNKNOWN_TEAM_COLOR = "#64748b";

const KIND_LABELS: Record<KeyEventKind, string> = {
	goal: "Gol",
	shot: "Tiro",
	card: "Tarjeta",
};

export const ALL_KEY_EVENT_KINDS: KeyEventKind[] = ["goal", "shot", "card"];

function isFiniteNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}

function getEventKind(event: Event): KeyEventKind | null {
	if (event.type_id === GOAL_TYPE_ID) return "goal";
	if (SHOT_TYPE_IDS.has(event.type_id)) return "shot";
	if (event.type_id === CARD_TYPE_ID) return "card";
	return null;
}

function getEventTeamSide(
	teamId: string | null | undefined,
	homeTeamId?: string | null,
	awayTeamId?: string | null,
): TeamSide | null {
	if (!teamId) return null;
	if (homeTeamId != null && teamId === homeTeamId) return "home";
	if (awayTeamId != null && teamId === awayTeamId) return "away";
	return null;
}

function getEventSeconds(event: Event): number | null {
	return getEventMatchSecond(event);
}

function getTeamName(side: TeamSide | null, homeTeamName: string, awayTeamName: string) {
	if (side === "home") return homeTeamName;
	if (side === "away") return awayTeamName;
	return "Equipo";
}

function getTeamColor(
	side: TeamSide | null,
	homeColor: string,
	awayColor: string,
): string {
	if (side === "home") return homeColor;
	if (side === "away") return awayColor;
	return UNKNOWN_TEAM_COLOR;
}

export function getKeyTimelineEvents(
	events: Event[],
	homeTeamId?: string | null,
	awayTeamId?: string | null,
): KeyTimelineEvent[] {
	const timeline = createMatchTimeline(events);
	return events
		.map((event, index): KeyTimelineEvent | null => {
			const kind = getEventKind(event);
			const totalSeconds = getEventSeconds(event);
			if (!kind || totalSeconds == null) return null;

			const minute = Math.floor(totalSeconds / 60);
			const second = totalSeconds % 60;
			const teamId = event.team_id ?? null;

			return {
				id: event.id || `${event.type_id}-${minute}-${second}-${index}`,
				kind,
				minute,
				second,
				totalSeconds: eventToTimelineSecond(event, timeline),
				matchSeconds: totalSeconds,
				periodId: (event.period_id ?? 1) >= 2 ? 2 : 1,
				teamId,
				teamSide: getEventTeamSide(teamId, homeTeamId, awayTeamId),
				playerName: event.player?.name ?? null,
				eventName: event.event_name || event.type_name || KIND_LABELS[kind],
			};
		})
		.filter((event): event is KeyTimelineEvent => event !== null)
		.sort((a, b) => a.totalSeconds - b.totalSeconds || a.kind.localeCompare(b.kind));
}

export function getKeyEventsTimelineBounds(
	events: Event[],
	currentMinute?: number | null,
): TimelineBounds {
	const timeline = createMatchTimeline(events);
	const matchEndSeconds = events.length > 0 ? timeline.availableSecond : null;
	const firstHalfEndSeconds = timeline.firstHalfAvailableSecond;

	const currentSeconds = isFiniteNumber(currentMinute)
		? Math.max(0, Math.floor(currentMinute) * 60)
		: 0;
	const durationSeconds = Math.max(timeline.durationSecond, currentSeconds);

	return {
		durationSeconds,
		matchEndSeconds,
		firstHalfEndSeconds,
	};
}

export function getScoreAtTimelineSecond(
	events: Event[],
	homeTeamId: string,
	awayTeamId: string,
	limitSeconds: number,
) {
	const timeline = createMatchTimeline(events);
	let home = 0;
	let away = 0;

	for (const event of events) {
		if (!isShotEvent(event) || event.type_id !== GOAL_TYPE_ID) continue;

		const totalSeconds = eventToTimelineSecond(event, timeline);
		if (totalSeconds == null || totalSeconds > limitSeconds) continue;

		const teamId = event.team_id ? String(event.team_id) : null;
		if (!teamId) continue;

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

export function getTimelineEndMinute(events: Event[], fallbackMinute = 90): number {
	const { durationSeconds, matchEndSeconds } = getKeyEventsTimelineBounds(events);

	return matchEndSeconds != null
		? Math.max(0, Math.ceil(durationSeconds / 60))
		: fallbackMinute;
}

export function getAvailableTimelineMinute(events: Event[], fallbackMinute = 0): number {
	if (events.length === 0) return fallbackMinute;
	return Math.max(fallbackMinute, Math.floor(createMatchTimeline(events).availableSecond / 60));
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

export default function KeyEventsTimeline({
	events,
	homeTeamId,
	awayTeamId,
	homeTeamName = "Local",
	awayTeamName = "Visitante",
	homeColor = DEFAULT_HOME_COLOR,
	awayColor = DEFAULT_AWAY_COLOR,
	currentMinute,
	currentSecond,
	homeScore,
	awayScore,
	eventKinds = ALL_KEY_EVENT_KINDS,
	teamFilter = "both",
	minuteRange,
	selectableMinuteRange,
	showScore = true,
	showLegend = true,
	showCurrentMarker = true,
	compact = false,
	className,
	onTimeSelect,
}: KeyEventsTimelineProps) {
	const trackRef = useRef<HTMLDivElement | null>(null);
	const activePointerIdRef = useRef<number | null>(null);
	const activeKinds = useMemo(() => new Set(eventKinds), [eventKinds]);
	const timeline = useMemo(() => createMatchTimeline(events), [events]);
	const { durationSeconds, matchEndSeconds, firstHalfEndSeconds } = useMemo(
		() => getKeyEventsTimelineBounds(events, currentMinute),
		[events, currentMinute],
	);
	const timelineEvents = useMemo(() => {
		const [startMinute, endMinute] = minuteRange ?? [0, Number.POSITIVE_INFINITY];
		const startSeconds = startMinute * 60;
		const endSeconds = endMinute * 60 + 59;

		return getKeyTimelineEvents(events, homeTeamId, awayTeamId).filter((event) => {
			if (!activeKinds.has(event.kind)) return false;
			if (event.totalSeconds < startSeconds || event.totalSeconds > endSeconds) return false;
			if (teamFilter === "both") return true;
			return event.teamSide === teamFilter;
		});
	}, [activeKinds, awayTeamId, events, homeTeamId, minuteRange, teamFilter]);

	const selectedSecond =
		currentSecond != null && Number.isFinite(currentSecond)
			? Math.max(0, currentSecond)
			: currentMinute != null && Number.isFinite(currentMinute)
				? Math.max(0, currentMinute * 60)
				: null;
	const boundedCurrentSecond =
		selectedSecond == null ? null : Math.min(durationSeconds, selectedSecond);
	const currentPercent =
		boundedCurrentSecond == null || durationSeconds <= 0
			? 0
			: (boundedCurrentSecond / durationSeconds) * 100;
	const halfPercent =
		durationSeconds <= 0
			? 0
			: Math.min(100, Math.max(0, (timeline.firstHalfEndSecond / durationSeconds) * 100));
	const playedSeconds = Math.min(
		durationSeconds,
		boundedCurrentSecond ?? matchEndSeconds ?? 0,
	);
	const playedPercent =
		durationSeconds <= 0
			? 0
			: Math.min(100, Math.max(0, (playedSeconds / durationSeconds) * 100));
	const firstHalfEndLabel = firstHalfEndSeconds == null
		? "-"
		: formatClockSecond(firstHalfEndSeconds);
	const matchEndLabel = formatTimelineSecond(durationSeconds, timeline, 2);
	const hasScore = showScore && homeScore != null && awayScore != null;

	const clampSelectableMinute = (minute: number) => {
		const [startMinute, endMinute] = selectableMinuteRange ?? [
			0,
			Math.floor(durationSeconds / 60),
		];

		return Math.min(endMinute, Math.max(startMinute, minute));
	};

	const selectMinuteFromClientX = (clientX: number) => {
		if (!onTimeSelect || durationSeconds <= 0) return;

		const element = trackRef.current;
		if (!element) return;

		const rect = element.getBoundingClientRect();
		if (rect.width <= 0) return;

		const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
		onTimeSelect(clampSelectableMinute(Math.round((ratio * durationSeconds) / 60)));
	};

	const handleTrackPointerDown = (event: PointerEvent<HTMLDivElement>) => {
		if (!onTimeSelect) return;
		selectMinuteFromClientX(event.clientX);
	};

	const handleThumbPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
		if (!onTimeSelect) return;

		event.preventDefault();
		event.stopPropagation();
		activePointerIdRef.current = event.pointerId;
		event.currentTarget.setPointerCapture(event.pointerId);
		selectMinuteFromClientX(event.clientX);
	};

	const handleThumbPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
		if (activePointerIdRef.current !== event.pointerId) return;
		selectMinuteFromClientX(event.clientX);
	};

	const handleThumbPointerEnd = (event: PointerEvent<HTMLSpanElement>) => {
		if (activePointerIdRef.current !== event.pointerId) return;

		activePointerIdRef.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	};

	return (
		<div className={cn("min-w-0", className)}>
			<div className="mb-2 flex flex-wrap items-center justify-between gap-2">
				{showLegend ? (
					<div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
						{ALL_KEY_EVENT_KINDS.filter((kind) => activeKinds.has(kind)).map((kind) => (
							<span key={kind} className="inline-flex items-center gap-1.5">
								<span className="inline-flex size-5 items-center justify-center rounded-full border bg-background text-foreground">
									<TimelineEventIcon kind={kind} />
								</span>
								{KIND_LABELS[kind]}
							</span>
						))}
					</div>
				) : (
					<span />
				)}

				{hasScore ? (
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
				) : null}
			</div>

			<div className={cn("relative", compact ? "pt-2" : "pt-4")}>
				<div
					ref={trackRef}
					role={onTimeSelect ? "slider" : undefined}
					aria-disabled={!onTimeSelect}
					aria-label={onTimeSelect ? "Seleccionar minuto en el timeline" : undefined}
					aria-valuemin={selectableMinuteRange?.[0] ?? 0}
					aria-valuemax={selectableMinuteRange?.[1] ?? Math.floor(durationSeconds / 60)}
					aria-valuenow={boundedCurrentSecond == null ? undefined : Math.floor(boundedCurrentSecond / 60)}
					onPointerDown={handleTrackPointerDown}
					className={cn(
						"relative block h-16 w-full touch-none rounded-md border border-border/80 bg-background px-0",
						onTimeSelect ? "cursor-pointer" : "cursor-default",
					)}
				>
					<span className="absolute inset-x-3 top-1/2 h-4 -translate-y-1/2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
						<span
							className="absolute inset-y-0 left-0 bg-slate-500/60 dark:bg-slate-300/40"
							style={{ width: `${playedPercent}%` }}
						/>
					</span>

					<span
					className="absolute top-1 bottom-1 z-10 w-2 -translate-x-1/2 border-x border-border bg-background"
						style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${halfPercent / 100})` }}
					>
						<span className="absolute left-1/2 top-0 -translate-x-1/2 rounded bg-background px-1 text-[10px] font-semibold tabular-nums text-muted-foreground">
							1P&nbsp;&nbsp;|&nbsp;&nbsp;2P
						</span>
					</span>

					{timelineEvents.map((event, index) => {
						const percent =
							durationSeconds > 0
								? Math.min(100, Math.max(0, (event.totalSeconds / durationSeconds) * 100))
								: 0;
						const color = getTeamColor(event.teamSide, homeColor, awayColor);
						const teamName = getTeamName(event.teamSide, homeTeamName, awayTeamName);
						const label = `${KIND_LABELS[event.kind]} ${teamName} ${formatClockSecond(
							event.matchSeconds,
						)}`;

						return (
							<span
								key={`${event.kind}-${event.id}-${index}`}
								className="group absolute top-1/2 z-20 flex h-12 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
								style={{ left: `calc(0.75rem + (100% - 1.5rem) * ${percent / 100})` }}
								aria-label={label}
							>
								<span
									className="absolute bottom-2 top-3 w-px rounded-full shadow-sm"
									style={{ backgroundColor: color }}
								/>
								<span
									className="absolute top-0 inline-flex size-6 items-center justify-center rounded-full border bg-background shadow-sm"
									style={{ borderColor: color, color }}
								>
									<TimelineEventIcon kind={event.kind} />
								</span>
								<span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-52 -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-left text-[11px] font-medium text-popover-foreground shadow-md group-hover:block group-focus-visible:block">
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

					{showCurrentMarker && boundedCurrentSecond != null ? (
						<span
							role={onTimeSelect ? "button" : undefined}
							tabIndex={onTimeSelect ? 0 : undefined}
							className={cn(
								"absolute top-0 bottom-0 z-30 flex w-8 -translate-x-1/2 touch-none flex-col items-center justify-center text-emerald-600",
								onTimeSelect ? "cursor-grab active:cursor-grabbing" : "cursor-default",
							)}
							style={{
								left: `calc(0.75rem + (100% - 1.5rem) * ${currentPercent / 100})`,
							}}
							aria-label={`Minuto actual ${formatTimelineSecond(
								boundedCurrentSecond,
								timeline,
								timeline.currentPeriodId === 2 ? 2 : 1,
							)}`}
							onPointerDown={handleThumbPointerDown}
							onPointerMove={handleThumbPointerMove}
							onPointerUp={handleThumbPointerEnd}
							onPointerCancel={handleThumbPointerEnd}
						>
							<span className="absolute top-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-white shadow-sm">
								{formatTimelineSecond(
									boundedCurrentSecond,
									timeline,
									timeline.currentPeriodId === 2 ? 2 : 1,
								)}
							</span>
							<span className="absolute top-6 h-0 w-0 border-l-[7px] border-r-[7px] border-t-[9px] border-l-transparent border-r-transparent border-t-emerald-600" />
							<span className="absolute bottom-1 top-8 w-1 rounded-full bg-emerald-600 shadow-sm" />
						</span>
					) : null}
				</div>

				<div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 text-[11px] text-muted-foreground">
					<div className="flex min-w-0 items-center justify-between gap-2">
						<span className="truncate">Inicio de partido (0')</span>
						<span className="shrink-0 tabular-nums text-foreground">Ult. 1P {firstHalfEndLabel}</span>
					</div>
					<div className="flex min-w-0 items-center justify-between gap-2">
						<span className="shrink-0 tabular-nums text-foreground">Inicio 2P 45:00</span>
						<span className="shrink-0 tabular-nums text-foreground">Final {matchEndLabel}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
