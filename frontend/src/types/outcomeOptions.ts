export type PitchEventType = "pass" | "shot" | "out";

export interface OutcomeOption {
  id: string;
  typeId: string;
  outcome?: number;
  label: string;
}

export const PITCH_EVENT_TYPES_CONFIG: {
  value: PitchEventType | "all";
  label: string;
  typeIds: string[];
}[] = [
  { value: "all",  label: "Todos",           typeIds: ["1", "2", "5", "13", "14", "15", "16"] },
  { value: "pass", label: "Pase",            typeIds: ["1", "2"] },
  { value: "shot", label: "Disparo",         typeIds: ["13", "14", "15", "16"] },
  { value: "out",  label: "Fuera del campo",  typeIds: ["5"] },
];

export const OUTCOME_OPTIONS_BY_TYPE: Record<PitchEventType | "all", OutcomeOption[]> = {
  all: [
    { id: "pass-ok",      typeId: "1",  outcome: 1, label: "Pase exitoso" },
    { id: "pass-fail",    typeId: "1",  outcome: 0, label: "Pase fallido" },
    { id: "offside-pass", typeId: "2",             label: "Pase en fuera de juego" },
    { id: "shot-miss",    typeId: "13",            label: "Fallo" },
    { id: "shot-post",    typeId: "14",            label: "Poste" },
    { id: "shot-saved",   typeId: "15",            label: "Disparo parado" },
    { id: "shot-goal",    typeId: "16",            label: "Gol" },
    { id: "out",          typeId: "5",             label: "Fuera del campo" },
  ],
  pass: [
    { id: "pass-ok",      typeId: "1", outcome: 1, label: "Pase exitoso" },
    { id: "pass-fail",    typeId: "1", outcome: 0, label: "Pase fallido" },
    { id: "offside-pass", typeId: "2",             label: "Pase en fuera de juego" },
  ],
  shot: [
    { id: "shot-miss",  typeId: "13", label: "Fallo" },
    { id: "shot-post",  typeId: "14", label: "Poste" },
    { id: "shot-saved", typeId: "15", label: "Disparo parado" },
    { id: "shot-goal",  typeId: "16", label: "Gol" },
  ],
  out: [
    { id: "out", typeId: "5", label: "Fuera del campo" },
  ],
};

export const OUTCOME_OPTIONS_FLAT: OutcomeOption[] = OUTCOME_OPTIONS_BY_TYPE.all;
