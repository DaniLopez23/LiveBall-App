export interface EventQualifier {
	qualifier_id: string;
	qualifier_name: string;
	value: string;
}

export interface Event {
	id: string;
	event_id: string;
	type_id: string;
	event_name: string;
	event_description: string;
	period_id?: number | null;
	min?: number | null;
	sec?: number | null;
	player_id?: string | null;
	player_receiver_id?: string | null;
	team_id?: string | null;
	outcome?: number | null;
	x?: number | null;
	y?: number | null;
	timestamp?: string | null;
	timestamp_utc?: string | null;
	last_modified?: string | null;
	version?: string | null;
	qualifiers: EventQualifier[];
}
