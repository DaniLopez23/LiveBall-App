import { HelpCircle, ArrowRight, ArrowLeft, Maximize, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import useGameStore from "@/store/gameStore";

export function EventsPitchHeader() {
  const game = useGameStore((s) => s.game);

  const homeTeam = game?.home_team.team_short ?? game?.home_team.team_name ?? "—";
  const awayTeam = game?.away_team.team_short ?? game?.away_team.team_name ?? "—";

  return (
    <div className="relative flex items-center py-1">
      {/* Left: title + help */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium">Campograma de eventos</span>
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" disabled>
          <HelpCircle className="size-4" />
          <span className="sr-only">Ayuda</span>
        </Button>
      </div>

      {/* Right: fullscreen */}
      <div className="ml-auto flex items-center gap-4">
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" disabled>
          <Camera className="size-5" />
          <span className="sr-only">Pantalla completa</span>
        </Button>
        <Button variant="ghost" size="icon" className="size-6 text-muted-foreground" disabled>
          <Maximize className="size-5" />
          <span className="sr-only">Pantalla completa</span>
        </Button>
      </div>
    </div>
  );
}
