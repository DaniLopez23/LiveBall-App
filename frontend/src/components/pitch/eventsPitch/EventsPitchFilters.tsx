import React from "react";
import { NumberInput } from "@/components/ui/number-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
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
import {
  EVENT_SEQUENCE_END_REASONS,
  type EventSequenceEndReason,
} from "./eventSequences";

export type EventsMode = "live" | "sequences" | "all";
export type SequencePassCountMode = "any" | "more" | "less";

export interface EventsFilters {
  mode: EventsMode;
  lastCount: number;
  team: "home" | "away" | "both";
  sequenceEndReasons: EventSequenceEndReason[];
  sequencePassCountMode: SequencePassCountMode;
  sequencePassCount: number;
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
  maxMinute: number;
  hasSecondHalf: boolean;
}

const sequenceEndReasonLabels: Record<EventSequenceEndReason, string> = {
  shot: "Tiro",
  foul: "Falta",
  out: "Fuera",
  opponent: "Otro equipo",
};

const COMPACT_COUNTER_THRESHOLD = 4;

const EventsPitchFilters: React.FC<EventsPitchFiltersProps> = ({
  filters,
  onChange,
  homeTeamName = "Local",
  awayTeamName = "Visitante",
  availableTypeIds,
  maxMinute,
  hasSecondHalf,
}) => {
  const sequenceEndReasonsAnchor = useComboboxAnchor();
  const outcomesAnchor = useComboboxAnchor();
  const subtypesAnchor = useComboboxAnchor();

  const availablePitchTypes = PITCH_EVENT_TYPES_CONFIG.filter(
    (type) => type.value === "all" || type.typeIds.some((id) => availableTypeIds.includes(id)),
  );

  const availableOutcomeOptions =
    filters.selectedEventType === "all"
      ? OUTCOME_OPTIONS_BY_TYPE.all.filter((option) => availableTypeIds.includes(option.typeId))
      : OUTCOME_OPTIONS_BY_TYPE[filters.selectedEventType].filter((option) =>
          availableTypeIds.includes(option.typeId),
        );

  const availableSubtypeOptions =
    filters.selectedEventType === "all"
      ? EVENT_SUBTYPE_OPTIONS_BY_TYPE.all.filter((option) =>
          option.typeIds.some((id) => availableTypeIds.includes(id)),
        )
      : EVENT_SUBTYPE_OPTIONS_BY_TYPE[filters.selectedEventType].filter((option) =>
          option.typeIds.some((id) => availableTypeIds.includes(id)),
        );

  const allOutcomeIds = availableOutcomeOptions.map((option) => option.id);
  const allSubtypeIds = availableSubtypeOptions.map((option) => option.id);

  const allOutcomesSelected =
    allOutcomeIds.length > 0 &&
    allOutcomeIds.every((id) => filters.selectedOutcomes.includes(id));

  const allSubtypesSelected =
    allSubtypeIds.length > 0 &&
    allSubtypeIds.every((id) => filters.selectedSubtypes.includes(id));
  const allSequenceEndReasonsSelected =
    filters.sequenceEndReasons.length === EVENT_SEQUENCE_END_REASONS.length &&
    EVENT_SEQUENCE_END_REASONS.every((reason) => filters.sequenceEndReasons.includes(reason));

  const outcomeLabelById = new Map(
    availableOutcomeOptions.map((option) => [option.id, option.label]),
  );
  const subtypeLabelById = new Map(
    availableSubtypeOptions.map((option) => [option.id, option.label]),
  );

  const validSelectedOutcomes = filters.selectedOutcomes.filter((id) =>
    outcomeLabelById.has(id),
  );
  const validSelectedSubtypes = filters.selectedSubtypes.filter((id) =>
    subtypeLabelById.has(id),
  );

  const formatSelectionCounter = (selectedCount: number, totalCount: number) =>
    totalCount === 0
      ? "0/0"
      : selectedCount === totalCount
        ? "Todos"
        : selectedCount > COMPACT_COUNTER_THRESHOLD
          ? `+${selectedCount}`
          : `${selectedCount}/${totalCount}`;

  const formatSelectionSummary = (
    selectedCount: number,
    totalCount: number,
    emptyLabel: string,
    allLabel: string,
  ) =>
    totalCount === 0
      ? "Sin opciones"
      : selectedCount === 0
        ? emptyLabel
        : selectedCount === totalCount
          ? allLabel
          : `${selectedCount} seleccionados`;

  const handleModeChange = (value: string) => {
    if (value === "live" || value === "sequences" || value === "all") {
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
    const outcomeOptions = OUTCOME_OPTIONS_BY_TYPE[type].filter((option) =>
      availableTypeIds.includes(option.typeId),
    );
    const subtypeOptions = EVENT_SUBTYPE_OPTIONS_BY_TYPE[type].filter((option) =>
      option.typeIds.some((id) => availableTypeIds.includes(id)),
    );

    onChange({
      ...filters,
      selectedEventType: type,
      selectedOutcomes: outcomeOptions.map((option) => option.id),
      selectedSubtypes: subtypeOptions.map((option) => option.id),
    });
  };

  const isOutEventSelected = filters.selectedEventType === "out";
  const isLiveMode = filters.mode === "live";
  const isSequencesMode = filters.mode === "sequences";
  const isAllMode = filters.mode === "all";

  const boundedMaxMinute = Math.max(0, Math.floor(maxMinute));
  const safeMinuteStart = Math.min(Math.max(0, filters.minuteRange[0]), boundedMaxMinute);
  const safeMinuteEnd = Math.max(
    safeMinuteStart,
    Math.min(Math.max(0, filters.minuteRange[1]), boundedMaxMinute),
  );
  const safeMinuteRange: [number, number] = [safeMinuteStart, safeMinuteEnd];
  const sliderMax = Math.max(1, boundedMaxMinute);
  const momentPresets = [
    {
      label: "1a Parte",
      range: [0, Math.min(45, boundedMaxMinute)] as [number, number],
      disabled: false,
    },
    {
      label: "2a Parte",
      range: [45, boundedMaxMinute] as [number, number],
      disabled: !hasSecondHalf || boundedMaxMinute < 45,
    },
    {
      label: "Completo",
      range: [0, boundedMaxMinute] as [number, number],
      disabled: false,
    },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto pr-1">
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Modo
        </p>
        <RadioGroup
          value={filters.mode}
          onValueChange={handleModeChange}
          className="grid grid-cols-1 gap-2"
        >
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
            <RadioGroupItem value="live" id="mode-live" />
            <label htmlFor="mode-live" className="min-w-0 flex-1 cursor-pointer truncate text-sm">
              LIVE
            </label>
            <NumberInput
              value={filters.lastCount}
              onChange={(value) => onChange({ ...filters, lastCount: value })}
              min={1}
              max={500}
              disabled={!isLiveMode}
            />
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
            <RadioGroupItem value="sequences" id="mode-sequences" />
            <label
              htmlFor="mode-sequences"
              className="min-w-0 flex-1 cursor-pointer truncate text-sm"
            >
              Secuencias
            </label>
          </div>
          <div className="flex min-w-0 items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
            <RadioGroupItem value="all" id="mode-all" />
            <label htmlFor="mode-all" className="min-w-0 flex-1 cursor-pointer truncate text-sm">
              Todos los eventos
            </label>
          </div>
        </RadioGroup>
      </div>

      {!isLiveMode ? (
        <>
          <Separator />

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Equipo
            </p>
            <ToggleGroup
              type="single"
              value={filters.team}
              onValueChange={(value) => value && handleTeamChange(value)}
              variant="outline"
              size="sm"
              className="grid w-full grid-cols-3 gap-1"
            >
              <ToggleGroupItem
                value="home"
                className="w-full truncate bg-background px-1 text-xs hover:bg-background/80 data-[state=on]:border-blue-500 data-[state=on]:bg-blue-500 data-[state=on]:text-white"
              >
                {homeTeamName}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="away"
                className="w-full truncate bg-background px-1 text-xs hover:bg-background/80 data-[state=on]:border-red-500 data-[state=on]:bg-red-500 data-[state=on]:text-white"
              >
                {awayTeamName}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="both"
                className="w-full bg-background px-1 text-xs hover:bg-background/80 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                Ambos
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </>
      ) : null}

      {isSequencesMode ? (
        <>
          <Separator />

          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Final de secuencia
              </p>
              <Combobox
                multiple
                value={filters.sequenceEndReasons}
                onValueChange={(value) =>
                  onChange({
                    ...filters,
                    sequenceEndReasons: value as EventSequenceEndReason[],
                  })
                }
              >
                <div ref={sequenceEndReasonsAnchor} className="w-full min-w-0">
                  <ComboboxTrigger className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:bg-muted/50">
                    <span className="min-w-0 flex-1 truncate text-left">
                      {formatSelectionSummary(
                        filters.sequenceEndReasons.length,
                        EVENT_SEQUENCE_END_REASONS.length,
                        "Sin finales",
                        "Todos los finales",
                      )}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {formatSelectionCounter(
                        filters.sequenceEndReasons.length,
                        EVENT_SEQUENCE_END_REASONS.length,
                      )}
                    </span>
                  </ComboboxTrigger>
                </div>
                <ComboboxContent anchor={sequenceEndReasonsAnchor}>
                  <div className="flex items-center justify-end border-b px-2 py-1.5">
                    <button
                      type="button"
                      className="text-xs text-primary"
                      onClick={() =>
                        onChange({
                          ...filters,
                          sequenceEndReasons: allSequenceEndReasonsSelected
                            ? []
                            : EVENT_SEQUENCE_END_REASONS,
                        })
                      }
                    >
                      {allSequenceEndReasonsSelected ? "Limpiar seleccion" : "Seleccionar todo"}
                    </button>
                  </div>
                  <ComboboxList>
                    <ComboboxEmpty>No hay finales de secuencia.</ComboboxEmpty>
                    {EVENT_SEQUENCE_END_REASONS.map((reason) => (
                      <ComboboxItem key={reason} value={reason}>
                        {sequenceEndReasonLabels[reason]}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Numero de pases
              </p>
              <div className="grid grid-cols-3 gap-1">
                {([
                  { value: "any", label: "Todos" },
                  { value: "more", label: "Mas de" },
                  { value: "less", label: "Menos de" },
                ] as const).map((option) => {
                  const active = filters.sequencePassCountMode === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        onChange({ ...filters, sequencePassCountMode: option.value })
                      }
                      className={cn(
                        "rounded-md border px-2 py-1.5 text-xs transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2">
                <span className="text-sm text-muted-foreground">Pases</span>
                <NumberInput
                  value={filters.sequencePassCount}
                  onChange={(value) => onChange({ ...filters, sequencePassCount: value })}
                  min={0}
                  max={100}
                  disabled={filters.sequencePassCountMode === "any"}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      {isAllMode ? (
        <>
          <Separator />

          <div className="flex min-h-0 flex-col gap-4 rounded-lg border border-border/70 bg-background/45 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tipos de eventos
            </p>

            <Select value={filters.selectedEventType} onValueChange={handleEventTypeChange}>
              <SelectTrigger size="sm" className="w-full bg-background">
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

            {!isOutEventSelected ? (
              <div className="grid min-h-0 grid-cols-1 gap-5">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">Subtipos de evento</p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatSelectionCounter(
                        validSelectedSubtypes.length,
                        availableSubtypeOptions.length,
                      )}
                    </span>
                  </div>
                  <Combobox
                    multiple
                    value={filters.selectedSubtypes}
                    disabled={availableSubtypeOptions.length === 0}
                    onValueChange={(value) =>
                      onChange({ ...filters, selectedSubtypes: value as string[] })
                    }
                  >
                    <div ref={subtypesAnchor} className="w-full min-w-0">
                      <ComboboxTrigger
                        disabled={availableSubtypeOptions.length === 0}
                        className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:bg-muted/50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      >
                        <span className="min-w-0 flex-1 truncate text-left">
                          {formatSelectionSummary(
                            validSelectedSubtypes.length,
                            availableSubtypeOptions.length,
                            "Sin subtipos",
                            "Todos los subtipos",
                          )}
                        </span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {formatSelectionCounter(
                            validSelectedSubtypes.length,
                            availableSubtypeOptions.length,
                          )}
                        </span>
                      </ComboboxTrigger>
                    </div>
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
                          {allSubtypesSelected ? "Limpiar seleccion" : "Seleccionar todo"}
                        </button>
                      </div>
                      <ComboboxList>
                        {availableSubtypeOptions.length === 0 ? (
                          <ComboboxEmpty>No hay subtipos para este tipo de evento.</ComboboxEmpty>
                        ) : null}
                        {availableSubtypeOptions.map((option) => (
                          <ComboboxItem key={option.id} value={option.id}>
                            {option.label}
                          </ComboboxItem>
                        ))}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>

                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">Resultado</p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatSelectionCounter(
                        validSelectedOutcomes.length,
                        availableOutcomeOptions.length,
                      )}
                    </span>
                  </div>
                  <Combobox
                    multiple
                    value={filters.selectedOutcomes}
                    disabled={availableOutcomeOptions.length === 0}
                    onValueChange={(value) =>
                      onChange({ ...filters, selectedOutcomes: value as string[] })
                    }
                  >
                    <div ref={outcomesAnchor} className="w-full min-w-0">
                      <ComboboxTrigger
                        disabled={availableOutcomeOptions.length === 0}
                        className="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-xs transition-colors hover:bg-muted/50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                      >
                        <span className="min-w-0 flex-1 truncate text-left">
                          {formatSelectionSummary(
                            validSelectedOutcomes.length,
                            availableOutcomeOptions.length,
                            "Sin resultados",
                            "Todos los resultados",
                          )}
                        </span>
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {formatSelectionCounter(
                            validSelectedOutcomes.length,
                            availableOutcomeOptions.length,
                          )}
                        </span>
                      </ComboboxTrigger>
                    </div>
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
                          {allOutcomesSelected ? "Limpiar seleccion" : "Seleccionar todo"}
                        </button>
                      </div>
                      <ComboboxList>
                        {availableOutcomeOptions.length === 0 ? (
                          <ComboboxEmpty>No hay outcomes disponibles.</ComboboxEmpty>
                        ) : null}
                        {availableOutcomeOptions.map((option) => (
                          <ComboboxItem key={option.id} value={option.id}>
                            {option.label}
                          </ComboboxItem>
                        ))}
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>
            ) : null}
          </div>

          <Separator />

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Momento
            </p>
            <div className="mb-3 flex items-center gap-2">
              <span className="w-6 text-right text-xs text-muted-foreground">
                {safeMinuteRange[0]}&apos;
              </span>
              <Slider
                min={0}
                max={sliderMax}
                step={1}
                disabled={boundedMaxMinute === 0}
                value={safeMinuteRange}
                onValueChange={(value) => {
                  const nextStart = Math.min(boundedMaxMinute, Math.max(0, value[0] ?? 0));
                  const nextEnd = Math.min(
                    boundedMaxMinute,
                    Math.max(0, value[1] ?? nextStart),
                  );

                  onChange({
                    ...filters,
                    minuteRange: [
                      Math.min(nextStart, nextEnd),
                      Math.max(nextStart, nextEnd),
                    ] as [number, number],
                  });
                }}
                className="flex-1"
              />
              <span className="w-6 text-xs text-muted-foreground">{safeMinuteRange[1]}&apos;</span>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {momentPresets.map(({ label, range, disabled }) => {
                const active = safeMinuteRange[0] === range[0] && safeMinuteRange[1] === range[1];

                return (
                  <button
                    key={label}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange({ ...filters, minuteRange: range })}
                    className={cn(
                      "rounded-md border px-1 py-1 text-xs transition-colors disabled:pointer-events-none disabled:opacity-45",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default EventsPitchFilters;
