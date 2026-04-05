import { isOutEvent, isPassEvent, isShotEvent, type PitchEvent } from "@/types/event";

export type PitchEventType = "pass" | "shot" | "out" | "abp";

export interface OutcomeOption {
  id: string;
  typeId: string;
  outcome?: number;
  label: string;
}

export interface EventSubtypeOption {
  id: string;
  typeIds: string[];
  label: string;
  passFlag?:
    | "long_ball"
    | "cross"
    | "head_pass"
    | "through_ball"
    | "free_kick_taken"
    | "corner_taken"
    | "throw_in"
    | "direct"
    | "chipped"
    | "launch"
    | "flick_on"
    | "is_key_pass"
    | "blocked"
    | "is_kick_off";
}

export const PITCH_EVENT_TYPES_CONFIG: {
  value: PitchEventType | "all";
  label: string;
  typeIds: string[];
}[] = [
  { value: "all", label: "Todos", typeIds: ["1", "2", "5", "13", "14", "15", "16"] },
  { value: "pass", label: "Pase", typeIds: ["1", "2"] },
  { value: "abp", label: "ABP", typeIds: ["1", "2"] },
  { value: "shot", label: "Disparo", typeIds: ["13", "14", "15", "16"] },
  { value: "out", label: "Fuera del campo", typeIds: ["5"] },
];

export const EVENT_SUBTYPE_OPTIONS_BY_TYPE: Record<PitchEventType | "all", EventSubtypeOption[]> = {
  all: [
    { id: "pass-cross", typeIds: ["1", "2"], passFlag: "cross", label: "Cross" },
    { id: "pass-long-ball", typeIds: ["1", "2"], passFlag: "long_ball", label: "Long ball" },
    { id: "pass-head", typeIds: ["1", "2"], passFlag: "head_pass", label: "Head pass" },
    { id: "pass-through-ball", typeIds: ["1", "2"], passFlag: "through_ball", label: "Through ball" },
    { id: "pass-throw-in", typeIds: ["1", "2"], passFlag: "throw_in", label: "Saque de banda" },
    { id: "pass-direct", typeIds: ["1", "2"], passFlag: "direct", label: "Directo" },
    { id: "pass-chipped", typeIds: ["1", "2"], passFlag: "chipped", label: "Chipped" },
    { id: "pass-launch", typeIds: ["1", "2"], passFlag: "launch", label: "Launch" },
    { id: "pass-flick-on", typeIds: ["1", "2"], passFlag: "flick_on", label: "Flick on" },
    { id: "pass-key", typeIds: ["1", "2"], passFlag: "is_key_pass", label: "Key pass" },
    { id: "pass-blocked", typeIds: ["1", "2"], passFlag: "blocked", label: "Bloqueado" },
    { id: "pass-kick-off", typeIds: ["1", "2"], passFlag: "is_kick_off", label: "Saque de centro" },
    { id: "abp-free-kick", typeIds: ["1", "2"], passFlag: "free_kick_taken", label: "ABP: Falta" },
    { id: "abp-corner", typeIds: ["1", "2"], passFlag: "corner_taken", label: "ABP: Córner" },
    { id: "out", typeIds: ["5"], label: "Fuera del campo" },
  ],
  pass: [
    { id: "pass-cross", typeIds: ["1", "2"], passFlag: "cross", label: "Cross" },
    { id: "pass-long-ball", typeIds: ["1", "2"], passFlag: "long_ball", label: "Long ball" },
    { id: "pass-head", typeIds: ["1", "2"], passFlag: "head_pass", label: "Head pass" },
    { id: "pass-through-ball", typeIds: ["1", "2"], passFlag: "through_ball", label: "Through ball" },
    { id: "pass-throw-in", typeIds: ["1", "2"], passFlag: "throw_in", label: "Saque de banda" },
    { id: "pass-direct", typeIds: ["1", "2"], passFlag: "direct", label: "Directo" },
    { id: "pass-chipped", typeIds: ["1", "2"], passFlag: "chipped", label: "Chipped" },
    { id: "pass-launch", typeIds: ["1", "2"], passFlag: "launch", label: "Launch" },
    { id: "pass-flick-on", typeIds: ["1", "2"], passFlag: "flick_on", label: "Flick on" },
    { id: "pass-key", typeIds: ["1", "2"], passFlag: "is_key_pass", label: "Key pass" },
    { id: "pass-blocked", typeIds: ["1", "2"], passFlag: "blocked", label: "Bloqueado" },
    { id: "pass-kick-off", typeIds: ["1", "2"], passFlag: "is_kick_off", label: "Saque de centro" },
  ],
  abp: [
    { id: "abp-free-kick", typeIds: ["1", "2"], passFlag: "free_kick_taken", label: "ABP: Falta" },
    { id: "abp-corner", typeIds: ["1", "2"], passFlag: "corner_taken", label: "ABP: Córner" },
  ],
  shot: [],
  out: [
    { id: "out", typeIds: ["5"], label: "Fuera del campo" },
  ],
};

export const EVENT_SUBTYPE_OPTIONS_FLAT: EventSubtypeOption[] = EVENT_SUBTYPE_OPTIONS_BY_TYPE.all;

export const eventMatchesSubtype = (event: PitchEvent, subtype: EventSubtypeOption): boolean => {
  if (!subtype.typeIds.includes(event.type_id)) {
    return false;
  }

  if (subtype.passFlag) {
    return isPassEvent(event) ? Boolean(event[subtype.passFlag]) : false;
  }

  return true;
};

export const eventMatchesOutcome = (event: PitchEvent, outcomeOption: OutcomeOption): boolean => {
  if (event.type_id !== outcomeOption.typeId) {
    return false;
  }

  if (typeof outcomeOption.outcome === "number") {
    return Number(event.outcome) === outcomeOption.outcome;
  }

  if (isShotEvent(event) || isOutEvent(event)) {
    return true;
  }

  // e.g. Offside pass (type 2) has no numeric outcome in filter config.
  return true;
};

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
  abp: [
    { id: "pass-ok", typeId: "1", outcome: 1, label: "Pase exitoso" },
    { id: "pass-fail", typeId: "1", outcome: 0, label: "Pase fallido" },
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
