import type { OptaEvent } from "@/components/pitch/figures/OptaMarkers";
import type { Game } from "@/types/game";
import { OUTCOME_OPTIONS_FLAT, PITCH_EVENT_TYPES_CONFIG } from "@/types/outcomeOptions";

export function getActionLabel(typeId: string): string {
  const config = PITCH_EVENT_TYPES_CONFIG.find(
    (item) => item.value !== "all" && item.typeIds.includes(typeId),
  );
  return config?.label ?? typeId;
}

export function getOutcomeLabel(
  typeId: string,
  outcome: number | string | null | undefined,
): string {
  const match = OUTCOME_OPTIONS_FLAT.find(
    (option) =>
      option.typeId === typeId &&
      (option.outcome === undefined || String(option.outcome) === String(outcome)),
  );
  return match?.label ?? (outcome != null ? String(outcome) : "-");
}

export function formatEventTime(min?: number | null, sec?: number | null): string {
  if (min == null) return "-";
  const mm = String(min).padStart(2, "0");
  const ss = String(sec ?? 0).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function formatPlayerLabel(event: OptaEvent): string {
  const dorsal = event.player?.dorsal?.trim();
  const name = event.player?.name?.trim();

  if (dorsal && name) return `${dorsal} - ${name}`;
  if (dorsal) return dorsal;
  if (name) return name;
  return "-";
}

export function getTeamName(game: Game | null | undefined, teamId?: string | null): string {
  if (!teamId) return "-";
  if (game?.home_team.team_id === teamId) return game.home_team.team_name;
  if (game?.away_team.team_id === teamId) return game.away_team.team_name;
  return teamId;
}

export function getEventUniqueId(event: OptaEvent): string {
  return event.id || event.event_id || "-";
}
