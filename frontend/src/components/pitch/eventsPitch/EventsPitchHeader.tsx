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

const legendItems = [
  { label: "Circulo", description: "Pase. El texto interior es el dorsal." },
  { label: "Cuadrado", description: "Tiro." },
  { label: "Rombo", description: "Falta." },
  { label: "Triangulo", description: "Evento defensivo." },
  { label: "OUT", description: "Balon fuera." },
  { label: "Linea discontinua", description: "Conexion entre eventos consecutivos." },
  { label: "Numero inferior", description: "Orden del evento dentro de la vista." },
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
