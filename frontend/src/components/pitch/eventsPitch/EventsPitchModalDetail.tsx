import React from "react";
import { X } from "lucide-react";
import EventsPitch from "@/components/pitch/eventsPitch/EventsPitch";
import { type OptaEvent } from "@/components/pitch/figures/OptaMarkers";
import type { Game } from "@/types/game";
import { isShotEvent } from "@/types/event";

interface EventsPitchModalDetailProps {
	open: boolean;
	event: OptaEvent | null;
	events: OptaEvent[];
	game?: Game | null;
	actionLabel: string;
	outcomeLabel?: string;
	onClose: () => void;
}

function formatTime(min?: number | null, sec?: number | null): string {
	if (min == null) return "--:--";
	const mm = String(min).padStart(2, "0");
	const ss = String(sec ?? 0).padStart(2, "0");
	return `${mm}:${ss}`;
}

function hexToRgba(hex: string, alpha: number): string {
	const clean = hex.replace("#", "");
	const full = clean.length === 3
		? clean.split("").map((c) => c + c).join("")
		: clean;

	if (full.length !== 6) return `rgba(255, 255, 255, ${alpha})`;

	const r = Number.parseInt(full.slice(0, 2), 16);
	const g = Number.parseInt(full.slice(2, 4), 16);
	const b = Number.parseInt(full.slice(4, 6), 16);
	return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const EventsPitchModalDetail: React.FC<EventsPitchModalDetailProps> = ({
	open,
	event,
	events,
	game,
	actionLabel,
	outcomeLabel,
	onClose,
}) => {
	React.useEffect(() => {
		if (!open) return;

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, onClose]);

	const selectedIndex = React.useMemo(() => {
		if (!event) return -1;
		return events.findIndex((e) => e.id === event.id);
	}, [events, event]);

	const contextEvents = React.useMemo(() => {
		if (selectedIndex < 0) return [];
		if (!event) return [];
		const start = Math.max(0, selectedIndex - 3);
		const end = isShotEvent(event) ? selectedIndex + 1 : Math.min(events.length, selectedIndex + 4);
		return events.slice(start, end);
	}, [events, event, selectedIndex]);

	const teamColors = React.useMemo(() => {
		if (!game) return {};
		return {
			[game.home_team.team_id]: "#3b82f6",
			[game.away_team.team_id]: "#ef4444",
		};
	}, [game]);

	const eventColors = React.useMemo(() => {
		if (!event) return {};

		const selectedId = event.id;
		const colorByEventId: Record<string, string> = {};

		for (const contextEvent of contextEvents) {
			const base =
				(contextEvent.team_id && teamColors[contextEvent.team_id]) || "#ffffff";
			colorByEventId[contextEvent.id] =
				contextEvent.id === selectedId ? base : hexToRgba(base, 0.35);
		}

		return colorByEventId;
	}, [contextEvents, event, teamColors]);

	if (!open || !event) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
			role="dialog"
			aria-modal="true"
			aria-label="Detalle de evento"
			onClick={onClose}
		>
			<div
				className="relative flex h-[85vh] w-full max-w-5xl flex-col rounded-xl border bg-background shadow-2xl"
				onClick={(e) => e.stopPropagation()}
			>
				<button
					type="button"
					onClick={onClose}
					className="absolute right-4 top-4 z-10 inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
					aria-label="Cerrar modal"
				>
					<X className="size-4" />
				</button>

				<div className="border-b px-6 py-4 pr-14">
					<div className="flex items-center gap-3">
						<h3 className="text-lg font-semibold text-foreground">
							{event.event_name || actionLabel} · {formatTime(event.min, event.sec)}
						</h3>
						{event.outcome != null && outcomeLabel ? (
							<span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium text-foreground/90">
								{outcomeLabel}
							</span>
						) : null}
					</div>
				</div>

				<div className="min-h-0 flex-1 bg-slate-100 p-4 dark:bg-slate-800">
					<EventsPitch
						events={contextEvents}
						mode="last"
						teamColors={teamColors}
						eventColors={eventColors}
						orientation="horizontal"
						showHeader={false}
					/>
				</div>
			</div>
		</div>
	);
};

export default EventsPitchModalDetail;
