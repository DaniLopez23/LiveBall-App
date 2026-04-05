// ---------------------------------------------------------------------------
// Shared base – every event type carries these fields
// ---------------------------------------------------------------------------
export interface EventBase {
	id: string;
	event_id: string;
	event_name: string;
	event_description: string;
	type_name?: string;
	match_state?: string | null;
	period_id?: number | null;
	min?: number | null;
	sec?: number | null;
	player_id?: string | null;
	player_receiver_id?: string | null;
	team_id?: string | null;
	outcome?: number | string | null;
	x?: number | null;
	y?: number | null;
	timestamp?: string | null;
	timestamp_utc?: string | null;
	last_modified?: string | null;
	version?: string | null;
}

// ---------------------------------------------------------------------------
// Pass  (type_id "1" = Pass, "2" = Offside Pass)
// ---------------------------------------------------------------------------
export interface PassEvent extends EventBase {
	type_id: "1" | "2";
	end_x?: number | null;
	end_y?: number | null;
	length?: number | null;
	angle?: number | null;
	long_ball?: boolean;
	cross?: boolean;
	head_pass?: boolean;
	through_ball?: boolean;
	free_kick_taken?: boolean;
	corner_taken?: boolean;
	throw_in?: boolean;
	direct?: boolean;
	chipped?: boolean;
	launch?: boolean;
	flick_on?: boolean;
	is_key_pass?: boolean;
	blocked?: boolean;
	is_kick_off?: boolean;
}

// ---------------------------------------------------------------------------
// Shot  (type_id "13" = Miss, "14" = Post, "15" = Attempt Saved, "16" = Goal)
// ---------------------------------------------------------------------------
export interface ShotEvent extends EventBase {
	type_id: "13" | "14" | "15" | "16";
	type_name: "shot";
	outcome?: "Miss" | "Post" | "Attempt Saved" | "Goal" | null;
	goal_mouth_y?: number | null;
	goal_mouth_z?: number | null;
	blocked_x?: number | null;
	blocked_y?: number | null;
	gk_x?: number | null;
	gk_y?: number | null;
	penalty?: boolean;
	head?: boolean;
	right_footed?: boolean;
	left_footed?: boolean;
	other_body_part?: boolean;
	regular_play?: boolean;
	fast_break?: boolean;
	set_piece?: boolean;
	from_corner?: boolean;
	free_kick?: boolean;
	own_goal?: boolean;
	assisted?: boolean;
	strong?: boolean;
	weak?: boolean;
	big_chance?: boolean;
	first_touch?: boolean;
	shot_zone?: string | null;
	assist_event_id?: string | null;
}

// ---------------------------------------------------------------------------
// Named event types with no additional flattened qualifier fields
// ---------------------------------------------------------------------------
export interface TakeOnEvent extends EventBase { type_id: "3"; }
export interface FoulEvent extends EventBase { type_id: "4"; }
export interface OutEvent extends EventBase { type_id: "5"; }
export interface CornerAwardedEvent extends EventBase { type_id: "6"; }
export interface TackleEvent extends EventBase { type_id: "7"; }
export interface InterceptionEvent extends EventBase { type_id: "8"; }
export interface SaveEvent extends EventBase { type_id: "10"; }
export interface ClearanceEvent extends EventBase { type_id: "12"; }
export interface CardEvent extends EventBase { type_id: "17"; }
export interface SubstitutionEvent extends EventBase { type_id: "18" | "19"; }
export interface AerialEvent extends EventBase { type_id: "44"; }

// ---------------------------------------------------------------------------
// Catch-all for any other event type not listed above
// ---------------------------------------------------------------------------
export interface GenericEvent extends EventBase { type_id: string; }

// ---------------------------------------------------------------------------
// Main Event discriminated union
// ---------------------------------------------------------------------------
export type Event =
	| PassEvent
	| ShotEvent
	| TakeOnEvent
	| FoulEvent
	| OutEvent
	| CornerAwardedEvent
	| TackleEvent
	| InterceptionEvent
	| SaveEvent
	| ClearanceEvent
	| CardEvent
	| SubstitutionEvent
	| AerialEvent
	| GenericEvent;

// ---------------------------------------------------------------------------
// Type guards for events with extra flattened fields
// ---------------------------------------------------------------------------
export const isPassEvent = (e: Event): e is PassEvent =>
	e.type_id === "1" || e.type_id === "2";

export const isShotEvent = (e: Event): e is ShotEvent =>
	e.type_id === "13" || e.type_id === "14" || e.type_id === "15" || e.type_id === "16";

export const isOutEvent = (e: Event): e is OutEvent =>
	e.type_id === "5";

// ---------------------------------------------------------------------------
// Pitch-renderable events – the only event types drawn on the pitch
// ---------------------------------------------------------------------------
export type PitchEvent = PassEvent | ShotEvent | OutEvent;

export const isPitchEvent = (e: Event): e is PitchEvent =>
	isPassEvent(e) || isShotEvent(e) || isOutEvent(e);
