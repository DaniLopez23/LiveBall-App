import {
  isFoulEvent,
  isOutEvent,
  isPassEvent,
  isShotEvent,
  type PitchEvent,
} from "@/types/event";

export type EventSequenceEndReason = "shot" | "foul" | "out" | "opponent";

export const EVENT_SEQUENCE_END_REASONS: EventSequenceEndReason[] = [
  "shot",
  "foul",
  "out",
  "opponent",
];

export interface EventSequence {
  id: string;
  teamId: string;
  events: PitchEvent[];
  endReason: EventSequenceEndReason;
  passCount: number;
}

interface EventSequenceDraft {
  id: string;
  teamId: string;
  events: PitchEvent[];
  passCount: number;
}

const canStartSequence = (
  event: PitchEvent,
  previousEvent: PitchEvent | null,
): event is PitchEvent & { team_id: string } =>
  isPassEvent(event) &&
  Boolean(event.team_id) &&
  Boolean(previousEvent?.team_id) &&
  previousEvent?.team_id !== event.team_id;

const createSequenceDraft = (event: PitchEvent & { team_id: string }): EventSequenceDraft => ({
  id: event.id,
  teamId: event.team_id,
  events: [event],
  passCount: 1,
});

const getSameTeamEndReason = (
  event: PitchEvent,
): Exclude<EventSequenceEndReason, "opponent"> | null => {
  if (isShotEvent(event)) return "shot";
  if (isFoulEvent(event)) return "foul";
  if (isOutEvent(event)) return "out";
  return null;
};

export function buildEventSequences(events: PitchEvent[]): EventSequence[] {
  const sequences: EventSequence[] = [];
  let activeSequence: EventSequenceDraft | null = null;
  let previousEvent: PitchEvent | null = null;

  const finishSequence = (
    draft: EventSequenceDraft,
    endEvent: PitchEvent | null,
    endReason: EventSequenceEndReason,
  ) => {
    const nextEvents =
      endEvent && draft.events[draft.events.length - 1]?.id !== endEvent.id
        ? [...draft.events, endEvent]
        : draft.events;

    sequences.push({
      id: draft.id,
      teamId: draft.teamId,
      events: nextEvents,
      endReason,
      passCount: draft.passCount,
    });
  };

  for (const event of events) {
    const eventTeamId = event.team_id;

    if (activeSequence && eventTeamId && eventTeamId !== activeSequence.teamId) {
      finishSequence(activeSequence, event, "opponent");
      activeSequence = canStartSequence(event, previousEvent)
        ? createSequenceDraft(event)
        : null;
      previousEvent = event;
      continue;
    }

    if (activeSequence) {
      activeSequence.events.push(event);

      if (eventTeamId === activeSequence.teamId && isPassEvent(event)) {
        activeSequence.passCount += 1;
      }

      const endReason = getSameTeamEndReason(event);
      if (eventTeamId === activeSequence.teamId && endReason) {
        finishSequence(activeSequence, null, endReason);
        activeSequence = null;
      }

      previousEvent = event;
      continue;
    }

    if (canStartSequence(event, previousEvent)) {
      activeSequence = createSequenceDraft(event);
    }

    previousEvent = event;
  }

  return sequences;
}

export function flattenSequences(sequences: EventSequence[]): PitchEvent[] {
  const seenEventIds = new Set<string>();
  const flattenedEvents: PitchEvent[] = [];

  for (const sequence of sequences) {
    for (const event of sequence.events) {
      if (seenEventIds.has(event.id)) continue;
      seenEventIds.add(event.id);
      flattenedEvents.push(event);
    }
  }

  return flattenedEvents;
}
