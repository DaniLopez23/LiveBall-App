import {
  SlidersHorizontal,
  BarChart2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import EventsPitchFilters, { type EventsFilters } from "./EventsPitchFilters";
import EventsPitchStats from "./EventsPitchStats";

interface EventsPitchTabsProps {
  filters: EventsFilters;
  onFiltersChange: (filters: EventsFilters) => void;
  homeTeamName?: string;
  awayTeamName?: string;
  isOpen: boolean;
  onToggle: () => void;
  availableTypeIds: string[];
}

const EventsPitchTabs: React.FC<EventsPitchTabsProps> = ({
  filters,
  onFiltersChange,
  homeTeamName,
  awayTeamName,
  isOpen,
  onToggle,
  availableTypeIds,
}) => {
  if (!isOpen) {
    return (
      <div className="flex h-full items-center justify-center">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Mostrar panel"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <Tabs defaultValue="filters" className="flex flex-col h-full">
      {/* Header bar: lifted-tab style border-b */}
      <div className="flex items-center border-b shrink-0 px-2 bg-muted/40">
        <TabsList className="bg-transparent justify-start rounded-none border-0 p-0 h-10 gap-0">
          <TabsTrigger
            value="stats"
            className="bg-muted/60 hover:bg-muted border-b-border data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:border-border data-[state=active]:border-b-slate-100 dark:data-[state=active]:border-b-slate-800 h-full rounded-none rounded-t border border-transparent px-3 gap-1.5 text-xs data-[state=active]:-mb-px data-[state=active]:shadow-none!"
          >
            <BarChart2 className="size-3.5" />
            Estadísticas
          </TabsTrigger>
          <TabsTrigger
            value="filters"
            className="bg-muted/60 hover:bg-muted border-b-border data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:border-border data-[state=active]:border-b-slate-100 dark:data-[state=active]:border-b-slate-800 h-full rounded-none rounded-t border border-transparent px-3 gap-1.5 text-xs data-[state=active]:-mb-px data-[state=active]:shadow-none!"
          >
            <SlidersHorizontal className="size-3.5" />
            Filtros
          </TabsTrigger>
        </TabsList>
        <button
          type="button"
          onClick={onToggle}
          className="ml-auto flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Ocultar panel"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <TabsContent value="filters" className="flex-1 overflow-auto p-4">
        <EventsPitchFilters
          filters={filters}
          onChange={onFiltersChange}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          availableTypeIds={availableTypeIds}
        />
      </TabsContent>

      <TabsContent value="stats" className="flex-1 overflow-auto p-3">
        <EventsPitchStats />
      </TabsContent>
    </Tabs>
  );
};

export default EventsPitchTabs;
