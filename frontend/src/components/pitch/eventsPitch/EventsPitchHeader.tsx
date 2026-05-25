import { Camera, HelpCircle, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EventsPitchHeader() {
  return (
    <div className="relative flex items-center py-1">
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">Campograma de eventos</span>
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" disabled>
          <HelpCircle className="size-4" />
          <span className="sr-only">Ayuda</span>
        </Button>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" disabled>
          <Camera className="size-5" />
          <span className="sr-only">Captura</span>
        </Button>
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" disabled>
          <Maximize className="size-5" />
          <span className="sr-only">Pantalla completa</span>
        </Button>
      </div>
    </div>
  );
}
