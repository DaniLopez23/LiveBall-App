import { getEventMatchSecond } from "./matchTime.ts";
import type { Event } from "../types/event.ts";

export interface EventDerivedScore {
	home: number;
	away: number;
}

export function getScoreFromGoalEvents(
	events: Event[],
	homeTeamId: string,
	awayTeamId: string,
): EventDerivedScore {
	let home = 0;
	let away = 0;

	for (const event of events) {
		if (event.type_id !== "16") continue;

		const ownGoal = "own_goal" in event && event.own_goal === true;
		if (event.team_id === homeTeamId) {
			if (ownGoal) away += 1;
			else home += 1;
		} else if (event.team_id === awayTeamId) {
			if (ownGoal) home += 1;
			else away += 1;
		}
	}

	return { home, away };
}

export function getCurrentMatchMinute(events: Event[]): number | null {
	const latestSecond = events.reduce((latest, event) => {
		const eventSecond = getEventMatchSecond(event);
		return eventSecond == null ? latest : Math.max(latest, eventSecond);
	}, -1);

	return latestSecond < 0 ? null : Math.floor(latestSecond / 60);
}
