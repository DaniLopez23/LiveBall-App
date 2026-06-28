import { BarChart2 } from "lucide-react";

const EventsPitchStats: React.FC = () => {
  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="text-center text-muted-foreground">
        <BarChart2 className="size-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">Estadísticas</p>
        <p className="text-xs mt-1">Próximamente</p>
      </div>
    </div>
  );
};

export default EventsPitchStats;
