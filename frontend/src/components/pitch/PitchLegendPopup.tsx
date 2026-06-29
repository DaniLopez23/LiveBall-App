import React from "react";
import { createPortal } from "react-dom";

interface PitchLegendItem {
	label: string;
	description: string;
	visual?: React.ReactNode;
}

interface PitchLegendPopupProps {
	open: boolean;
	anchorRef: React.RefObject<HTMLElement | null>;
	id: string;
	ariaLabel: string;
	items: PitchLegendItem[];
	onClose: () => void;
	title?: string;
}

const POPUP_WIDTH = 352;
const VIEWPORT_GAP = 8;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function getPopupPosition(anchor: HTMLElement | null, itemCount: number) {
	if (typeof window === "undefined" || !anchor) {
		return { left: 16, top: 72 };
	}

	const rect = anchor.getBoundingClientRect();
	const popupHeightEstimate = Math.min(
		window.innerHeight - VIEWPORT_GAP * 2,
		72 + itemCount * 54,
	);
	const maxLeft = Math.max(VIEWPORT_GAP, window.innerWidth - POPUP_WIDTH - VIEWPORT_GAP);
	const maxTop = Math.max(
		VIEWPORT_GAP,
		window.innerHeight - popupHeightEstimate - VIEWPORT_GAP,
	);
	const left = clamp(rect.left, VIEWPORT_GAP, maxLeft);
	const preferredTop = rect.bottom + VIEWPORT_GAP;
	const fallbackTop = rect.top - popupHeightEstimate - VIEWPORT_GAP;
	const fitsBelow = preferredTop + popupHeightEstimate <= window.innerHeight - VIEWPORT_GAP;
	const top = fitsBelow
		? preferredTop
		: clamp(fallbackTop, VIEWPORT_GAP, maxTop);

	return { left, top };
}

export function PitchLegendPopup({
	open,
	anchorRef,
	id,
	ariaLabel,
	items,
	onClose,
	title = "Leyenda",
}: PitchLegendPopupProps) {
	const [position, setPosition] = React.useState({ left: 16, top: 72 });

	React.useEffect(() => {
		if (!open) return;

		const updatePosition = () => {
			setPosition(getPopupPosition(anchorRef.current, items.length));
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		updatePosition();
		document.addEventListener("keydown", onKeyDown);
		window.addEventListener("resize", updatePosition);
		window.addEventListener("scroll", updatePosition, true);

		return () => {
			document.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("resize", updatePosition);
			window.removeEventListener("scroll", updatePosition, true);
		};
	}, [anchorRef, items.length, onClose, open]);

	if (!open || typeof document === "undefined") return null;

	return createPortal(
		<div
			id={id}
			role="dialog"
			aria-label={ariaLabel}
			className="fixed z-[70] max-h-[calc(100svh-1rem)] w-[min(22rem,calc(100vw-1rem))] overflow-y-auto rounded-lg border bg-background p-3 text-sm shadow-xl"
			style={{ left: position.left, top: position.top }}
		>
			<div className="mb-2 flex items-center justify-between gap-3">
				<p className="font-semibold">{title}</p>
				<button
					type="button"
					onClick={onClose}
					className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					Cerrar
				</button>
			</div>
			<div className="space-y-1.5">
				{items.map((item) => (
					<div
						key={item.label}
						className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-2 rounded-md border border-border/60 bg-muted/25 p-2"
					>
						<div className="flex min-h-8 items-center justify-center" aria-hidden="true">
							{item.visual ?? (
								<span className="size-2 rounded-full bg-muted-foreground/55" />
							)}
						</div>
						<div className="min-w-0">
							<p className="font-medium leading-tight text-foreground">{item.label}</p>
							<p className="mt-0.5 text-xs leading-snug text-muted-foreground">
								{item.description}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>,
		document.body,
	);
}
