import { create } from "zustand";

import type { Event } from "@/types/event";

interface EventsStoreState {
	gameId: string | null;
	events: Event[];
	eventsById: Record<string, Event>;
	lastEventId: string | null;
	setFromSnapshot: (payload: {
		gameId: string;
		events: Event[];
		lastEventId: string | null;
	}) => void;
	appendNewEvents: (payload: { gameId: string; events: Event[] }) => void;
	applyUpdatedEvents: (payload: { gameId: string; events: Event[] }) => void;
	reset: () => void;
}

const toByIdMap = (events: Event[]): Record<string, Event> => {
	return events.reduce<Record<string, Event>>((acc, event) => {
		acc[event.id] = event;
		return acc;
	}, {});
};

const withBaseState = {
	gameId: null,
	events: [],
	eventsById: {},
	lastEventId: null,
};

const useEventsStore = create<EventsStoreState>((set, get) => ({
	...withBaseState,
	setFromSnapshot: ({ gameId, events, lastEventId }) => {
		set({
			gameId,
			events,
			eventsById: toByIdMap(events),
			lastEventId,
		});
	},
	appendNewEvents: ({ gameId, events }) => {
		if (events.length === 0) return;

		const { gameId: currentGameId, events: currentEvents, eventsById } = get();
		const shouldReset = currentGameId !== gameId;

		const baseEvents = shouldReset ? [] : currentEvents;
		const baseById = shouldReset ? {} : { ...eventsById };

		const dedupedToAppend: Event[] = [];
		for (const event of events) {
			if (!baseById[event.id]) {
				dedupedToAppend.push(event);
			}
			baseById[event.id] = event;
		}

		const nextEvents = [...baseEvents, ...dedupedToAppend];
		const nextLastEventId = nextEvents.length
			? nextEvents[nextEvents.length - 1].event_id
			: null;

		set({
			gameId,
			events: nextEvents,
			eventsById: baseById,
			lastEventId: nextLastEventId,
		});
	},
	applyUpdatedEvents: ({ gameId, events }) => {
		if (events.length === 0) return;

		const { gameId: currentGameId, events: currentEvents, eventsById } = get();
		if (currentGameId !== gameId) return;

		const nextById = { ...eventsById };
		for (const event of events) {
			nextById[event.id] = event;
		}

		const nextEvents = currentEvents.map((existingEvent) => {
			return nextById[existingEvent.id] ?? existingEvent;
		});

		set({
			events: nextEvents,
			eventsById: nextById,
			lastEventId: nextEvents.length
				? nextEvents[nextEvents.length - 1].event_id
				: null,
		});
	},
	reset: () => {
		set(withBaseState);
	},
}));

export default useEventsStore;
