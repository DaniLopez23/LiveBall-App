export type AvailableMatchStatus =
	| "scheduled"
	| "live"
	| "paused"
	| "finished"
	| "postponed"
	| "suspended"
	| "cancelled"
	| "abandoned"
	| "unknown";

export interface AvailableMatchTeam {
	team_id: string;
	team_name: string;
	team_short?: string | null;
	team_official?: string | null;
	side: string;
	score?: number | null;
	half_time_score?: number | null;
}

export interface AvailableMatch {
	game_id: string;
	uid: string;
	competition_id: string;
	competition_name: string;
	season_id: string;
	season_name: string;
	matchday?: number | null;
	match_type?: string | null;
	period: string;
	status: AvailableMatchStatus;
	game_date?: string | null;
	timezone?: string | null;
	venue?: string | null;
	attendance?: number | null;
	current_minute?: number | null;
	home_team: AvailableMatchTeam;
	away_team: AvailableMatchTeam;
}
