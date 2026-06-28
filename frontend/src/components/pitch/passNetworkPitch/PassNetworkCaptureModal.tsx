import React from "react";
import { createPortal } from "react-dom";
import { Camera, Download, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Orientation } from "@/store/optaPitchConfigStore";
import type { PassNetworkEdge, PassNetworkNode } from "@/types/passNetwork";
import PassNetworkPitchBoard from "./PassNetworkPitchBoard";

interface PassNetworkCaptureModalProps {
	open: boolean;
	nodes: PassNetworkNode[];
	edges: PassNetworkEdge[];
	color?: string;
	orientation?: Orientation;
	mirrorX?: boolean;
	fieldColor?: string;
	teamName?: string;
	rangeLabel?: string;
	onClose: () => void;
}

interface SummaryLine {
	label: string;
	value: string;
}

const LOGO_URL = "/app_logo.PNG";

function getTotalPasses(edges: PassNetworkEdge[]): number {
	return edges.reduce((total, edge) => total + edge.pass_count, 0);
}

function getPlayerName(nodes: PassNetworkNode[], playerId: string): string {
	return nodes.find((node) => node.player_id === playerId)?.player_name ?? playerId;
}

function getTopConnection(nodes: PassNetworkNode[], edges: PassNetworkEdge[]): string {
	const topConnection = edges.reduce<PassNetworkEdge | null>(
		(bestEdge, edge) =>
			bestEdge == null || edge.pass_count > bestEdge.pass_count ? edge : bestEdge,
		null,
	);

	if (!topConnection) return "-";

	return `${getPlayerName(nodes, topConnection.from_player_id)} -> ${getPlayerName(
		nodes,
		topConnection.to_player_id,
	)} (${topConnection.pass_count})`;
}

function buildSummaryLines({
	nodes,
	edges,
	teamName,
	rangeLabel,
}: {
	nodes: PassNetworkNode[];
	edges: PassNetworkEdge[];
	teamName?: string;
	rangeLabel?: string;
}): SummaryLine[] {
	const lines: SummaryLine[] = [
		{ label: "Equipo", value: teamName ?? "Equipo" },
		{ label: "Jugadores", value: String(nodes.length) },
		{ label: "Conexiones", value: String(edges.length) },
		{ label: "Pases", value: String(getTotalPasses(edges)) },
		{ label: "Conexion principal", value: getTopConnection(nodes, edges) },
	];

	if (rangeLabel) {
		lines.splice(1, 0, { label: "Rango", value: rangeLabel });
	}

	return lines;
}

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`No se pudo cargar la imagen ${src}`));
		image.src = src;
	});
}

function drawRoundedRect(
	context: CanvasRenderingContext2D,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
) {
	const r = Math.min(radius, width / 2, height / 2);
	context.beginPath();
	context.moveTo(x + r, y);
	context.lineTo(x + width - r, y);
	context.quadraticCurveTo(x + width, y, x + width, y + r);
	context.lineTo(x + width, y + height - r);
	context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
	context.lineTo(x + r, y + height);
	context.quadraticCurveTo(x, y + height, x, y + height - r);
	context.lineTo(x, y + r);
	context.quadraticCurveTo(x, y, x + r, y);
	context.closePath();
}

function drawWrappedText(
	context: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	maxWidth: number,
	lineHeight: number,
) {
	const words = text.split(" ");
	let line = "";
	let currentY = y;

	for (const word of words) {
		const nextLine = line ? `${line} ${word}` : word;
		if (context.measureText(nextLine).width > maxWidth && line) {
			context.fillText(line, x, currentY);
			line = word;
			currentY += lineHeight;
		} else {
			line = nextLine;
		}
	}

	if (line) {
		context.fillText(line, x, currentY);
	}

	return currentY + lineHeight;
}

function triggerPngDownload(canvas: HTMLCanvasElement, fileName: string) {
	const link = document.createElement("a");
	link.download = fileName;
	link.href = canvas.toDataURL("image/png");
	link.click();
}

const PassNetworkCaptureModal: React.FC<PassNetworkCaptureModalProps> = ({
	open,
	nodes,
	edges,
	color,
	orientation,
	mirrorX,
	fieldColor,
	teamName,
	rangeLabel,
	onClose,
}) => {
	const pitchPreviewRef = React.useRef<HTMLDivElement | null>(null);
	const [isDownloading, setIsDownloading] = React.useState(false);
	const summaryLines = React.useMemo(
		() => buildSummaryLines({ nodes, edges, teamName, rangeLabel }),
		[nodes, edges, teamName, rangeLabel],
	);
	const title = "Captura de red de pases";
	const subtitle = `${teamName ?? "Equipo"} - ${nodes.length} jugadores - ${edges.length} conexiones`;

	React.useEffect(() => {
		if (!open) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};

		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [open, onClose]);

	const handleDownload = React.useCallback(async () => {
		const svg = pitchPreviewRef.current?.querySelector("svg");
		if (!svg || nodes.length === 0) return;

		setIsDownloading(true);

		try {
			const clone = svg.cloneNode(true) as SVGSVGElement;
			clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
			const viewBox = (clone.getAttribute("viewBox") ?? "0 0 300 200")
				.split(/\s+/)
				.map(Number);
			const viewBoxWidth = viewBox[2] && viewBox[2] > 0 ? viewBox[2] : 300;
			const viewBoxHeight = viewBox[3] && viewBox[3] > 0 ? viewBox[3] : 200;
			const pitchAspect = viewBoxWidth / viewBoxHeight;
			const exportWidth = 1200;
			const exportHeight = Math.max(1, Math.round(exportWidth / pitchAspect));
			clone.setAttribute("width", String(exportWidth));
			clone.setAttribute("height", String(exportHeight));

			const svgBlob = new Blob([new XMLSerializer().serializeToString(clone)], {
				type: "image/svg+xml;charset=utf-8",
			});
			const svgUrl = URL.createObjectURL(svgBlob);
			const pitchImage = await loadImage(svgUrl);
			URL.revokeObjectURL(svgUrl);

			const logoImage = await loadImage(LOGO_URL).catch(() => null);
			const canvas = document.createElement("canvas");
			canvas.width = 1600;
			canvas.height = 1000;

			const context = canvas.getContext("2d");
			if (!context) return;

			context.fillStyle = "#f8fafc";
			context.fillRect(0, 0, canvas.width, canvas.height);

			context.fillStyle = "#0f172a";
			context.font = "700 44px system-ui, sans-serif";
			context.fillText(title, 64, 82);
			context.fillStyle = "#475569";
			context.font = "500 23px system-ui, sans-serif";
			drawWrappedText(context, rangeLabel ? `${subtitle} - ${rangeLabel}` : subtitle, 64, 122, 1380, 30);

			context.fillStyle = "#ffffff";
			drawRoundedRect(context, 56, 172, 362, 684, 18);
			context.fill();
			context.strokeStyle = "#dbe3ef";
			context.lineWidth = 2;
			context.stroke();

			context.fillStyle = "#0f172a";
			context.font = "700 24px system-ui, sans-serif";
			context.fillText("Resumen", 88, 220);

			let y = 266;
			for (const line of summaryLines) {
				context.fillStyle = "#64748b";
				context.font = "600 17px system-ui, sans-serif";
				context.fillText(line.label.toUpperCase(), 88, y);
				context.fillStyle = "#0f172a";
				context.font = "700 22px system-ui, sans-serif";
				y = drawWrappedText(context, line.value, 88, y + 28, 282, 28) + 10;
			}

			context.fillStyle = "#ffffff";
			drawRoundedRect(context, 448, 172, 1096, 684, 18);
			context.fill();
			context.strokeStyle = "#dbe3ef";
			context.stroke();

			const maxPitchWidth = 1036;
			const maxPitchHeight = 624;
			let pitchWidth = maxPitchWidth;
			let pitchHeight = pitchWidth / pitchAspect;
			if (pitchHeight > maxPitchHeight) {
				pitchHeight = maxPitchHeight;
				pitchWidth = pitchHeight * pitchAspect;
			}
			const pitchX = 448 + (1096 - pitchWidth) / 2;
			const pitchY = 172 + (684 - pitchHeight) / 2;
			context.drawImage(pitchImage, pitchX, pitchY, pitchWidth, pitchHeight);

			if (logoImage) {
				context.save();
				context.globalAlpha = 0.13;
				context.drawImage(logoImage, 1140, 690, 300, 150);
				context.restore();
			}

			context.fillStyle = "rgba(15, 23, 42, 0.72)";
			context.font = "700 20px system-ui, sans-serif";
			context.fillText("LiveBall", 1368, 900);

			const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
			triggerPngDownload(canvas, `liveball-red-pases-${stamp}.png`);
		} finally {
			setIsDownloading(false);
		}
	}, [edges.length, nodes.length, rangeLabel, subtitle, summaryLines, title]);

	if (!open || typeof document === "undefined") return null;

	return createPortal(
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
			role="dialog"
			aria-modal="true"
			aria-label="Captura de red de pases"
			onClick={onClose}
		>
			<div
				className="relative flex h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-background shadow-2xl"
				onClick={(event) => event.stopPropagation()}
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
					<div className="flex flex-wrap items-center gap-3">
						<span className="inline-flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
							<Camera className="size-4" />
						</span>
						<div className="min-w-0">
							<h3 className="text-lg font-semibold text-foreground">{title}</h3>
							<p className="truncate text-sm text-muted-foreground">{subtitle}</p>
						</div>
					</div>
				</div>

				<div className="grid min-h-0 flex-1 grid-cols-1 gap-4 bg-slate-100 p-4 dark:bg-slate-800 lg:grid-cols-[18rem_1fr]">
					<aside className="flex min-h-0 flex-col rounded-lg border bg-background p-4">
						<h4 className="text-sm font-semibold">Resumen de captura</h4>
						<div className="mt-4 space-y-3 overflow-auto pr-1">
							{summaryLines.map((line) => (
								<div key={line.label}>
									<p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
										{line.label}
									</p>
									<p className="mt-0.5 text-sm font-medium text-foreground">
										{line.value}
									</p>
								</div>
							))}
						</div>
						<Button
							type="button"
							className="mt-4"
							onClick={handleDownload}
							disabled={nodes.length === 0 || isDownloading}
						>
							<Download className="size-4" />
							{isDownloading ? "Preparando..." : "Descargar imagen"}
						</Button>
					</aside>

					<div
						ref={pitchPreviewRef}
						className="min-h-0 rounded-lg bg-slate-900/5 p-3 dark:bg-slate-900/35"
					>
						{nodes.length === 0 ? (
							<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
								No hay red visible para capturar.
							</div>
						) : (
							<PassNetworkPitchBoard
								nodes={nodes}
								edges={edges}
								color={color}
								orientation={orientation}
								mirrorX={mirrorX}
								fieldColor={fieldColor}
							/>
						)}
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
};

export default PassNetworkCaptureModal;
