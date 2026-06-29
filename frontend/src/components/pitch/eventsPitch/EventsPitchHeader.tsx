import React from "react";
import { Camera, HelpCircle, Maximize } from "lucide-react";
import { PitchLegendPopup } from "@/components/pitch/PitchLegendPopup";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EventsPitchHeaderProps {
  canCapture?: boolean;
  onCaptureClick?: () => void;
  onFullscreenClick?: () => void;
}

function MarkerExample({
  shape,
  color = "#3b82f6",
}: {
  shape: "circle" | "square" | "diamond" | "triangle" | "pentagon" | "out" | "colors";
  color?: string;
}) {
  if (shape === "colors") {
    return (
      <span className="flex items-center gap-1.5">
        <span className="size-4 rounded-full border border-black/20 bg-blue-500" />
        <span className="size-4 rounded-full border border-black/20 bg-red-500" />
      </span>
    );
  }

  return (
    <svg viewBox="0 0 44 32" className="h-8 w-11 overflow-visible">
      {shape === "circle" ? (
        <>
          <circle cx="13" cy="16" r="7" fill={color} />
          <path d="M20 16H36M31 11L36 16L31 21" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ) : null}
      {shape === "square" ? <rect x="14" y="7" width="18" height="18" rx="1" fill={color} /> : null}
      {shape === "diamond" ? <path d="M23 5L34 16L23 27L12 16Z" fill={color} /> : null}
      {shape === "triangle" ? <path d="M22 5L35 26H9Z" fill={color} /> : null}
      {shape === "pentagon" ? <path d="M22 4L35 13L30 28H14L9 13Z" fill={color} /> : null}
      {shape === "out" ? (
        <g>
          <rect x="5" y="7" width="34" height="18" rx="9" fill={color} />
          <text x="22" y="16.5" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill="#111827">12 - OUT</text>
        </g>
      ) : null}
      {shape !== "out" && shape !== "circle" ? (
        <text x="22" y="16.5" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight="700" fill="#111827">12</text>
      ) : null}
      {shape === "circle" ? (
        <text x="13" y="16.5" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="#111827">12</text>
      ) : null}
    </svg>
  );
}

const legendItems = [
  { label: "Círculo", description: "Pase. La flecha indica su dirección.", visual: <MarkerExample shape="circle" /> },
  { label: "Cuadrado", description: "Tiro y trayectoria hacia la portería.", visual: <MarkerExample shape="square" color="#ef4444" /> },
  { label: "Rombo", description: "Falta cometida.", visual: <MarkerExample shape="diamond" /> },
  { label: "Triángulo", description: "Acción defensiva, como entrada o recuperación.", visual: <MarkerExample shape="triangle" color="#ef4444" /> },
  { label: "Pentágono", description: "Regate o duelo individual.", visual: <MarkerExample shape="pentagon" /> },
  { label: "Etiqueta OUT", description: "El balón ha salido del terreno de juego.", visual: <MarkerExample shape="out" color="#ef4444" /> },
  { label: "Colores", description: "Azul para el equipo local y rojo para el visitante.", visual: <MarkerExample shape="colors" /> },
  { label: "Dorsal y orden", description: "El dorsal aparece dentro del marcador y el número de secuencia debajo.", visual: <span className="text-center text-xs font-bold leading-tight">12<br /><span className="text-[10px] text-muted-foreground">3</span></span> },
];

export function EventsPitchHeader({
  canCapture = true,
  onCaptureClick,
  onFullscreenClick,
}: EventsPitchHeaderProps) {
  const [legendOpen, setLegendOpen] = React.useState(false);
  const legendButtonRef = React.useRef<HTMLElement | null>(null);

  return (
    <div className="relative flex items-center py-1">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">Campograma de eventos</span>
        <span ref={legendButtonRef}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 text-muted-foreground"
            onClick={() => setLegendOpen((value) => !value)}
            aria-expanded={legendOpen}
            aria-controls="events-pitch-legend"
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
        id="events-pitch-legend"
        ariaLabel="Leyenda del campograma"
        title="Leyenda de eventos"
        items={legendItems}
        onClose={() => setLegendOpen(false)}
      />

      <div className="ml-auto flex items-center gap-4">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-6 text-muted-foreground",
            !canCapture && "opacity-45",
          )}
          disabled={!canCapture}
          onClick={onCaptureClick}
          title="Capturar campograma"
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
