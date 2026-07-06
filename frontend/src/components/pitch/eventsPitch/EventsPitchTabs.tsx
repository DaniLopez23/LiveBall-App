import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";

import { cn } from "@/lib/utils";
import EventsPitchFilters, {
  type EventsFilters,
  type PlayerFilterOption,
  type SequenceEndTypeOption,
} from "./EventsPitchFilters";

interface EventsPitchTabsProps {
  filters: EventsFilters;
  onFiltersChange: (filters: EventsFilters) => void;
  homeTeamName?: string;
  awayTeamName?: string;
  isOpen: boolean;
  onToggle: () => void;
  availableTypeIds: string[];
  availableSequenceEndTypes: SequenceEndTypeOption[];
  availableSequencePrecedingTypes: SequenceEndTypeOption[];
  availablePlayers: PlayerFilterOption[];
  maxMinute: number;
  availableMinute: number;
  firstHalfEndMinute: number;
  hasSecondHalf: boolean;
  showToggle?: boolean;
}

const EventsPitchTabs: React.FC<EventsPitchTabsProps> = ({
  filters,
  onFiltersChange,
  homeTeamName,
  awayTeamName,
  isOpen,
  onToggle,
  availableTypeIds,
  availableSequenceEndTypes,
  availableSequencePrecedingTypes,
  availablePlayers,
  maxMinute,
  availableMinute,
  firstHalfEndMinute,
  hasSecondHalf,
  showToggle = true,
}) => {
  if (!isOpen) {
    return (
      <div className="flex h-full items-center justify-center">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          aria-label="Mostrar filtros"
        >
          <ChevronLeft className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "flex min-h-12 shrink-0 items-center border-b bg-muted/40 px-3 py-2",
          !showToggle && "pr-12",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Filtros de eventos</h2>
        </div>
        {showToggle ? (
          <button
            type="button"
            onClick={onToggle}
            className="ml-auto flex items-center justify-center rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="Ocultar filtros"
          >
            <ChevronRight className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <EventsPitchFilters
          filters={filters}
          onChange={onFiltersChange}
          homeTeamName={homeTeamName}
          awayTeamName={awayTeamName}
          availableTypeIds={availableTypeIds}
          availableSequenceEndTypes={availableSequenceEndTypes}
          availableSequencePrecedingTypes={availableSequencePrecedingTypes}
          availablePlayers={availablePlayers}
          maxMinute={maxMinute}
          availableMinute={availableMinute}
          firstHalfEndMinute={firstHalfEndMinute}
          hasSecondHalf={hasSecondHalf}
        />
      </div>
    </div>
  );
};

export default EventsPitchTabs;
