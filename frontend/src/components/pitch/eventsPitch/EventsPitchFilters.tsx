import React from "react";
import { NumberInput } from "@/components/ui/number-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider-14";
import { cn } from "@/lib/utils";
import {
  type PitchEventType,
  PITCH_EVENT_TYPES_CONFIG,
  OUTCOME_OPTIONS_BY_TYPE,
  EVENT_SUBTYPE_OPTIONS_BY_TYPE,
} from "@/types/outcomeOptions";


export interface EventsFilters {
  mode: "last" | "all";
  lastCount: number;
  team: "home" | "away" | "both";
  selectedEventType: PitchEventType | "all";
  selectedOutcomes: string[];
  selectedSubtypes: string[];
  minuteRange: [number, number];
}

interface EventsPitchFiltersProps {
  filters: EventsFilters;
  onChange: (filters: EventsFilters) => void;
  homeTeamName?: string;
  awayTeamName?: string;
  availableTypeIds: string[];
}


const EventsPitchFilters: React.FC<EventsPitchFiltersProps> = ({
  filters,
  onChange,
  homeTeamName = "Local",
  awayTeamName = "Visitante",
  availableTypeIds,
}) => {
  const outcomesAnchor = useComboboxAnchor();
  const subtypesAnchor = useComboboxAnchor();

  const availablePitchTypes = PITCH_EVENT_TYPES_CONFIG.filter(
    (t) => t.value === "all" || t.typeIds.some((id) => availableTypeIds.includes(id))
  );

  const availableOutcomeOptions =
    filters.selectedEventType === "all"
      ? OUTCOME_OPTIONS_BY_TYPE.all.filter((opt) => availableTypeIds.includes(opt.typeId))
      : OUTCOME_OPTIONS_BY_TYPE[filters.selectedEventType].filter((opt) =>
          availableTypeIds.includes(opt.typeId)
        );

  const availableSubtypeOptions =
    filters.selectedEventType === "all"
      ? EVENT_SUBTYPE_OPTIONS_BY_TYPE.all.filter((opt) =>
          opt.typeIds.some((id) => availableTypeIds.includes(id))
        )
      : EVENT_SUBTYPE_OPTIONS_BY_TYPE[filters.selectedEventType].filter((opt) =>
          opt.typeIds.some((id) => availableTypeIds.includes(id))
        );

  const allOutcomeIds = availableOutcomeOptions.map((opt) => opt.id);
  const allSubtypeIds = availableSubtypeOptions.map((opt) => opt.id);

  const allOutcomesSelected =
    allOutcomeIds.length > 0 && allOutcomeIds.every((id) => filters.selectedOutcomes.includes(id));

  const allSubtypesSelected =
    allSubtypeIds.length > 0 && allSubtypeIds.every((id) => filters.selectedSubtypes.includes(id));

  const outcomeLabelById = new Map(availableOutcomeOptions.map((opt) => [opt.id, opt.label]));
  const subtypeLabelById = new Map(availableSubtypeOptions.map((opt) => [opt.id, opt.label]));

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

  const handleEventTypeChange = (value: string) => {
    const type = value as PitchEventType | "all";
    const outcomeOptions = OUTCOME_OPTIONS_BY_TYPE[type].filter((opt) =>
      availableTypeIds.includes(opt.typeId)
    );
    const subtypeOptions = EVENT_SUBTYPE_OPTIONS_BY_TYPE[type].filter((opt) =>
      opt.typeIds.some((id) => availableTypeIds.includes(id))
    );
    onChange({
      ...filters,
      selectedEventType: type,
      selectedOutcomes: outcomeOptions.map((opt) => opt.id),
      selectedSubtypes: subtypeOptions.map((opt) => opt.id),
    });
  };

  return (
    <div className="flex flex-col gap-5 h-full overflow-y-auto">

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

      <Separator />

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

        {/* Event type selector */}
        <div className="flex items-center gap-2">
          <Select
            value={filters.selectedEventType}
            onValueChange={handleEventTypeChange}
          >
            <SelectTrigger size="sm" className="flex-1 bg-background">
              <SelectValue placeholder="Tipo de evento" />
            </SelectTrigger>
            <SelectContent>
              {availablePitchTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3 min-h-0">
          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">Outcomes</p>
              <span className="text-[11px] text-muted-foreground">
                {filters.selectedOutcomes.length}/{availableOutcomeOptions.length}
              </span>
            </div>
            <Combobox
              multiple
              value={filters.selectedOutcomes}
              onValueChange={(value) =>
                onChange({ ...filters, selectedOutcomes: value as string[] })
              }
            >
              <ComboboxChips ref={outcomesAnchor} className="w-full">
                <ComboboxValue>
                  {(selectedValue) => (
                    <ComboboxChip>
                      {outcomeLabelById.get(selectedValue as string) ?? String(selectedValue)}
                    </ComboboxChip>
                  )}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder="Seleccionar outcomes"
                  disabled={availableOutcomeOptions.length === 0}
                />
              </ComboboxChips>
              <ComboboxContent anchor={outcomesAnchor}>
                <div className="flex items-center justify-end border-b px-2 py-1.5">
                  <button
                    type="button"
                    className="text-xs text-primary disabled:text-muted-foreground"
                    disabled={availableOutcomeOptions.length === 0}
                    onClick={() =>
                      onChange({
                        ...filters,
                        selectedOutcomes: allOutcomesSelected ? [] : allOutcomeIds,
                      })
                    }
                  >
                    {allOutcomesSelected ? "Limpiar selección" : "Seleccionar todo"}
                  </button>
                </div>
                <ComboboxList>
                  <ComboboxEmpty>No hay outcomes disponibles.</ComboboxEmpty>
                  {availableOutcomeOptions.map((opt) => (
                    <ComboboxItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          <div className="flex flex-col gap-2 min-h-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-muted-foreground">Subtipos de evento</p>
              <span className="text-[11px] text-muted-foreground">
                {filters.selectedSubtypes.length}/{availableSubtypeOptions.length}
              </span>
            </div>
            <Combobox
              multiple
              value={filters.selectedSubtypes}
              onValueChange={(value) =>
                onChange({ ...filters, selectedSubtypes: value as string[] })
              }
            >
              <ComboboxChips ref={subtypesAnchor} className="w-full">
                <ComboboxValue>
                  {(selectedValue) => (
                    <ComboboxChip>
                      {subtypeLabelById.get(selectedValue as string) ?? String(selectedValue)}
                    </ComboboxChip>
                  )}
                </ComboboxValue>
                <ComboboxChipsInput
                  placeholder="Seleccionar subtipos"
                  disabled={availableSubtypeOptions.length === 0}
                />
              </ComboboxChips>
              <ComboboxContent anchor={subtypesAnchor}>
                <div className="flex items-center justify-end border-b px-2 py-1.5">
                  <button
                    type="button"
                    className="text-xs text-primary disabled:text-muted-foreground"
                    disabled={availableSubtypeOptions.length === 0}
                    onClick={() =>
                      onChange({
                        ...filters,
                        selectedSubtypes: allSubtypesSelected ? [] : allSubtypeIds,
                      })
                    }
                  >
                    {allSubtypesSelected ? "Limpiar selección" : "Seleccionar todo"}
                  </button>
                </div>
                <ComboboxList>
                  <ComboboxEmpty>No hay subtipos para este tipo de evento.</ComboboxEmpty>
                  {availableSubtypeOptions.map((opt) => (
                    <ComboboxItem key={opt.id} value={opt.id}>
                      {opt.label}
                    </ComboboxItem>
                  ))}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
        </div>
      </div>

            <Separator />

      {/* Section 1: Momento */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Momento
        </p>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-muted-foreground w-6 text-right">{filters.minuteRange[0]}&apos;</span>
          <Slider
            min={0}
            max={90}
            step={1}
            value={filters.minuteRange}
            onValueChange={(v) =>
              onChange({ ...filters, minuteRange: [v[0], v[1]] as [number, number] })
            }
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-6">{filters.minuteRange[1]}&apos;</span>
        </div>
        <div className="flex gap-1">
          {([
            { label: "1ª Parte", range: [0, 45] as [number, number] },
            { label: "2ª Parte", range: [45, 90] as [number, number] },
            { label: "Completo", range: [0, 90] as [number, number] },
          ] as const).map(({ label, range }) => {
            const active =
              filters.minuteRange[0] === range[0] &&
              filters.minuteRange[1] === range[1];
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChange({ ...filters, minuteRange: range })}
                className={cn(
                  "flex-1 rounded-md border px-1 py-1 text-xs transition-colors",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-muted-foreground border-input hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EventsPitchFilters;
