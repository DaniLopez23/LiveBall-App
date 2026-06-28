import React from "react";
import { createPortal } from "react-dom";

interface PitchLegendItem {
	label: string;
	description: string;
}

interface PitchLegendPopupProps {
	open: boolean;
	anchorRef: React.RefObject<HTMLElement | null>;
	id: string;
	ariaLabel: string;
	items: PitchLegendItem[];
	onClose: () => void;
}

const POPUP_WIDTH = 320;
const POPUP_HEIGHT_ESTIMATE = 280;
const VIEWPORT_GAP = 8;

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

function getPopupPosition(anchor: HTMLElement | null) {
	if (typeof window === "undefined" || !anchor) {
		return { left: 16, top: 72 };
	}

	const rect = anchor.getBoundingClientRect();
	const maxLeft = Math.max(VIEWPORT_GAP, window.innerWidth - POPUP_WIDTH - VIEWPORT_GAP);
	const maxTop = Math.max(
		VIEWPORT_GAP,
		window.innerHeight - POPUP_HEIGHT_ESTIMATE - VIEWPORT_GAP,
	);
	const left = clamp(rect.left, VIEWPORT_GAP, maxLeft);
	const preferredTop = rect.bottom + VIEWPORT_GAP;
	const fallbackTop = rect.top - POPUP_HEIGHT_ESTIMATE - VIEWPORT_GAP;
	const fitsBelow = preferredTop + POPUP_HEIGHT_ESTIMATE <= window.innerHeight - VIEWPORT_GAP;
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
}: PitchLegendPopupProps) {
	const [position, setPosition] = React.useState({ left: 16, top: 72 });

	React.useEffect(() => {
		if (!open) return;

		const updatePosition = () => {
			setPosition(getPopupPosition(anchorRef.current));
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
	}, [anchorRef, onClose, open]);

	if (!open || typeof document === "undefined") return null;

	return createPortal(
		<div
			id={id}
			role="dialog"
			aria-label={ariaLabel}
			className="fixed z-[70] w-80 rounded-lg border bg-background p-3 text-sm shadow-xl"
			style={{ left: position.left, top: position.top }}
		>
			<div className="mb-2 flex items-center justify-between gap-3">
				<p className="font-semibold">Leyenda</p>
				<button
					type="button"
					onClick={onClose}
					className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
				>
					Cerrar
				</button>
			</div>
			<div className="space-y-2">
				{items.map((item) => (
					<div key={item.label} className="grid grid-cols-[7rem_1fr] gap-2">
						<span className="font-medium text-foreground">{item.label}</span>
						<span className="text-muted-foreground">{item.description}</span>
					</div>
				))}
			</div>
		</div>,
		document.body,
	);
}
