import React from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { NumberInput } from "@/components/ui/number-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export interface EventsFilters {
  mode: "last" | "all";
  lastCount: number;
  team: "home" | "away" | "both";
  eventCategory: EventCategory;
  selectedEventTypes: string[];
}

export type EventCategory =
  | "all"
  | "passes"
  | "shots"
  | "defensive"
  | "duels"
  | "fouls"
  | "other";

interface EventsPitchFiltersProps {
  filters: EventsFilters;
  onChange: (filters: EventsFilters) => void;
  homeTeamName?: string;
  awayTeamName?: string;
  isOpen: boolean;
  onToggle: () => void;
}

const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "passes", label: "Pases" },
  { value: "shots", label: "Disparos" },
  { value: "defensive", label: "Defensivos" },
  { value: "duels", label: "Duelos" },
  { value: "fouls", label: "Faltas / Tarjetas" },
  { value: "other", label: "Otros" },
];

const EVENT_TYPES_BY_CATEGORY: Record<
  EventCategory,
  { id: string; name: string }[]
> = {
  all: [
    { id: "1", name: "Pase" },
    { id: "2", name: "Pase en fuera de juego" },
    { id: "3", name: "Regate" },
    { id: "4", name: "Falta" },
    { id: "5", name: "Fuera de juego" },
    { id: "6", name: "Córner" },
    { id: "7", name: "Entrada" },
    { id: "8", name: "Intercepción" },
    { id: "10", name: "Parada" },
    { id: "11", name: "Atrapada" },
    { id: "12", name: "Despeje" },
    { id: "13", name: "Fallo" },
    { id: "14", name: "Poste" },
    { id: "15", name: "Disparo parado" },
    { id: "16", name: "Gol" },
    { id: "17", name: "Tarjeta" },
    { id: "41", name: "Puñetazo" },
    { id: "44", name: "Duelo aéreo" },
    { id: "45", name: "Desafío" },
    { id: "49", name: "Recuperación" },
    { id: "50", name: "Pérdida" },
    { id: "51", name: "Error" },
  ],
  passes: [
    { id: "1", name: "Pase" },
    { id: "2", name: "Pase en fuera de juego" },
  ],
  shots: [
    { id: "13", name: "Fallo" },
    { id: "14", name: "Poste" },
    { id: "15", name: "Disparo parado" },
    { id: "16", name: "Gol" },
  ],
  defensive: [
    { id: "7", name: "Entrada" },
    { id: "8", name: "Intercepción" },
    { id: "10", name: "Parada" },
    { id: "11", name: "Atrapada" },
    { id: "12", name: "Despeje" },
    { id: "41", name: "Puñetazo" },
    { id: "49", name: "Recuperación" },
  ],
  duels: [
    { id: "3", name: "Regate" },
    { id: "44", name: "Duelo aéreo" },
    { id: "45", name: "Desafío" },
    { id: "50", name: "Pérdida" },
  ],
  fouls: [
    { id: "4", name: "Falta" },
    { id: "17", name: "Tarjeta" },
  ],
  other: [
    { id: "5", name: "Fuera de juego" },
    { id: "6", name: "Córner" },
    { id: "51", name: "Error" },
  ],
};

const EventsPitchFilters: React.FC<EventsPitchFiltersProps> = ({
  filters,
  onChange,
  homeTeamName = "Local",
  awayTeamName = "Visitante",
  isOpen,
  onToggle,
}) => {
  const availableTypes = EVENT_TYPES_BY_CATEGORY[filters.eventCategory];
  const allSelected =
    availableTypes.length > 0 &&
    availableTypes.every((t) => filters.selectedEventTypes.includes(t.id));

  const handleModeChange = (value: string) => {
    if (value === "last" || value === "all") {
      onChange({ ...filters, mode: value });
    }
  };

  const handleTeamChange = (value: string) => {
    if (value === "home" || value === "away" || value === "both") {
      onChange({ ...filters, team: value });
    }
  };

  const handleCategoryChange = (value: string) => {
    onChange({
      ...filters,
      eventCategory: value as EventCategory,
      selectedEventTypes: [],
    });
  };

  const handleTypeToggle = (typeId: string) => {
    const next = filters.selectedEventTypes.includes(typeId)
      ? filters.selectedEventTypes.filter((t) => t !== typeId)
      : [...filters.selectedEventTypes, typeId];
    onChange({ ...filters, selectedEventTypes: next });
  };

  const handleToggleAll = () => {
    onChange({
      ...filters,
      selectedEventTypes: allSelected ? [] : availableTypes.map((t) => t.id),
    });
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-center w-full h-full text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Mostrar filtros"
      >
        <ChevronLeft className="size-4" />
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filtros</span>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Ocultar filtros"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <Separator />

      {/* Section 1: Mode */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Modo
        </p>
        <RadioGroup
          value={filters.mode}
          onValueChange={handleModeChange}
          className="flex flex-row flex-wrap gap-x-4 gap-y-2"
        >
          <div className="flex items-center gap-2 flex-wrap bg-background border border-input rounded-md px-3 py-2">
            <RadioGroupItem value="last" id="mode-last" />
            <label htmlFor="mode-last" className="text-sm cursor-pointer">
              Últimos eventos
            </label>
            <NumberInput
              value={filters.lastCount}
              onChange={(v) => onChange({ ...filters, lastCount: v })}
              min={1}
              max={500}
              disabled={filters.mode === "all"}
            />
          </div>
          <div className="flex items-center gap-2 bg-background border border-input rounded-md px-3 py-2">
            <RadioGroupItem value="all" id="mode-all" />
            <label htmlFor="mode-all" className="text-sm cursor-pointer">
              Todos los eventos
            </label>
          </div>
        </RadioGroup>
      </div>

      {/* Section 2: Team */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Equipo
        </p>
        <ToggleGroup
          type="single"
          value={filters.team}
          onValueChange={(v) => v && handleTeamChange(v)}
          variant="outline"
          size="sm"
          className="flex w-full gap-1"
        >
          <ToggleGroupItem
            value="home"
            className="flex-1 text-xs truncate px-1 bg-background hover:bg-background/80 data-[state=on]:bg-blue-500 data-[state=on]:text-white data-[state=on]:border-blue-500"
          >
            {homeTeamName}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="away"
            className="flex-1 text-xs truncate px-1 bg-background hover:bg-background/80 data-[state=on]:bg-red-500 data-[state=on]:text-white data-[state=on]:border-red-500"
          >
            {awayTeamName}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="both"
            className="flex-1 text-xs px-1 bg-background hover:bg-background/80 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:border-primary"
          >
            Ambos
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <Separator />

      {/* Section 3: Event types */}
      <div className="flex flex-col gap-3 min-h-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Tipos de eventos
        </p>

        {/* Category select + toggle-all */}
        <div className="flex items-center gap-2">
          <Select
            value={filters.eventCategory}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger size="sm" className="flex-1 bg-background">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={handleToggleAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            {allSelected ? "Ninguno" : "Todos"}
          </button>
        </div>

        {/* Multi-select checklist */}
        <div className="flex flex-col gap-0.5 overflow-y-auto rounded-md border border-input bg-background p-1.5">
          {availableTypes.map((type) => {
            const checked = filters.selectedEventTypes.includes(type.id);
            return (
              <label
                key={type.id}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer select-none transition-colors",
                  checked
                    ? "bg-primary/10 text-foreground"
                    : "hover:bg-muted/60 text-muted-foreground"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleTypeToggle(type.id)}
                  className="accent-primary size-3.5 shrink-0"
                />
                <span>{type.name}</span>
                <span className="ml-auto font-mono text-[10px] text-muted-foreground/50">
                  {type.id}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EventsPitchFilters;
