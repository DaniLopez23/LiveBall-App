import React from "react";
import { Camera, HelpCircle, Maximize } from "lucide-react";
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

  React.useEffect(() => {
    if (!legendOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLegendOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [legendOpen]);

  return (
    <div className="relative flex items-center py-1">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">Campograma de eventos</span>
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
      </div>

      {legendOpen ? (
        <div
          id="events-pitch-legend"
          role="dialog"
          aria-label="Leyenda del campograma"
          className="absolute left-0 top-8 z-20 w-80 rounded-lg border bg-background p-3 text-sm shadow-xl"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-semibold">Leyenda</p>
            <button
              type="button"
              onClick={() => setLegendOpen(false)}
              className="rounded px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Cerrar
            </button>
          </div>
          <div className="space-y-2">
            {legendItems.map((item) => (
              <div key={item.label} className="grid grid-cols-[6.75rem_1fr] gap-2">
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="text-muted-foreground">{item.description}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
