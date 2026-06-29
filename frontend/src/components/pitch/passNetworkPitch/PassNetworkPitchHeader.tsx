import React from "react";
import { Camera, HelpCircle, Maximize } from "lucide-react";

import { PitchLegendPopup } from "@/components/pitch/PitchLegendPopup";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PassNetworkPitchHeaderProps {
	teamName?: string;
	connectionCount?: number;
	canCapture?: boolean;
	onCaptureClick?: () => void;
	onFullscreenClick?: () => void;
}

const legendItems = [
	{ label: "Nodo", description: "Jugador situado en su posicion media." },
	{ label: "Tamano del nodo", description: "Mayor volumen de pases dados y recibidos." },
	{ label: "Linea", description: "Conexion de pase entre dos jugadores." },
	{ label: "Grosor", description: "Mas pases en esa relacion." },
	{ label: "Intensidad", description: "Mas color indica mayor peso." },
	{ label: "Flecha", description: "Direccion principal del pase." },
	{
		label: "Dirección de ataque",
		description: "En este campograma el equipo ataca de abajo hacia arriba.",
	},
	{ label: "Hover", description: "Detalle de jugador o conexion." },
];

export function PassNetworkPitchHeader({
	teamName,
	connectionCount,
	canCapture = true,
	onCaptureClick,
	onFullscreenClick,
}: PassNetworkPitchHeaderProps) {
	const [legendOpen, setLegendOpen] = React.useState(false);
	const legendButtonRef = React.useRef<HTMLElement | null>(null);

	return (
		<div className="relative flex items-center py-1">
			<div className="flex min-w-0 items-center gap-1">
				<span className="truncate text-sm font-medium">
					{teamName ? `Red de pases - ${teamName}` : "Red de pases"}
				</span>
				{typeof connectionCount === "number" ? (
					<span className="hidden shrink-0 rounded-md border bg-background px-2 py-0.5 text-[11px] text-muted-foreground sm:inline-flex">
						{connectionCount} conexiones
					</span>
				) : null}
				<span ref={legendButtonRef} className="shrink-0">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-6 text-muted-foreground"
						onClick={() => setLegendOpen((value) => !value)}
						aria-expanded={legendOpen}
						aria-controls="pass-network-pitch-legend"
						title="Ver leyenda"
					>
						<HelpCircle className="size-4" />
						<span className="sr-only">Ver leyenda</span>
					</Button>
				</span>
			</div>

			<PitchLegendPopup
				open={legendOpen}
				anchorRef={legendButtonRef}
				id="pass-network-pitch-legend"
				ariaLabel="Leyenda de la red de pases"
				title="Leyenda de la red de pases"
				items={legendItems}
				onClose={() => setLegendOpen(false)}
			/>

			<div className="ml-auto flex shrink-0 items-center gap-3">
				{typeof connectionCount === "number" ? (
					<span className="rounded-md border bg-background px-2 py-0.5 text-[11px] text-muted-foreground sm:hidden">
						{connectionCount}
					</span>
				) : null}
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn("size-6 text-muted-foreground", !canCapture && "opacity-45")}
					disabled={!canCapture}
					onClick={onCaptureClick}
					title="Capturar red de pases"
				>
					<Camera className="size-5" />
					<span className="sr-only">Captura</span>
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className="size-6 text-muted-foreground"
					onClick={onFullscreenClick}
					title="Ver en pantalla completa"
				>
					<Maximize className="size-5" />
					<span className="sr-only">Pantalla completa</span>
				</Button>
			</div>
		</div>
	);
}
