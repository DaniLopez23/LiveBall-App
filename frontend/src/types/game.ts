import type { Team } from "@/types/team";

export interface Game {
	game_id: string;
	competition_id: string;
	competition_name: string;
	season_id: string;
	season_name: string;
	matchday?: number | null;
	game_date?: string | null;
	period_1_start?: string | null;
	period_2_start?: string | null;
	home_team: Team;
	away_team: Team;
	total_events?: number;
}

export interface GameMessageData {
	game_id: string;
	competition_id: string;
	competition_name: string;
	season_id: string;
	season_name: string;
	matchday?: number | null;
	game_date?: string | null;
	period_1_start?: string | null;
	period_2_start?: string | null;
	home_team: Team;
	away_team: Team;
}
