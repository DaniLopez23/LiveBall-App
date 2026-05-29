export type StatGroupName =
	| "possession"
	| "passing"
	| "shooting"
	| "defensive"
	| "discipline";

export type TeamSide = "home" | "away";

export interface StatPeriodValues {
	total: number | null;
	firstHalf: number | null;
	secondHalf: number | null;
}

export interface DerivedStats {
	passAccuracy: number | null;
	longBallAccuracy: number | null;
	crossAccuracy: number | null;
	finalThirdPassAccuracy: number | null;
	shotAccuracy: number | null;
	goalConversion: number | null;
	tackleSuccess: number | null;
	duelSuccess: number | null;
	aerialSuccess: number | null;
}

export type GroupedStats = Record<
	StatGroupName,
	Record<string, StatPeriodValues>
>;

export interface TeamGroupedStats {
	teamId: string;
	teamName: string;
	side: TeamSide;
	groups: GroupedStats;
	derived: DerivedStats;
}

export interface MatchStatsPayload {
	matchId: string;
	minute: number | null;
	timestamp: string;
	home: TeamGroupedStats;
	away: TeamGroupedStats;
}

export interface StatComparisonValues {
	home: number | null;
	away: number | null;
	diff: number | null;
}

export interface MatchStatsComparisonPayload {
	matchId: string;
	minute: number | null;
	timestamp: string;
	groups: Record<StatGroupName, Record<string, StatComparisonValues>>;
	derived: Record<string, StatComparisonValues>;
}

export interface StatsTimeBucket {
	minute: number;
	timestamp: string;
	home: TeamGroupedStats;
	away: TeamGroupedStats;
	momentum?: MatchMomentumPoint | null;
}

export interface MatchStatsTimeline {
	matchId: string;
	intervalMinutes: number;
	buckets: StatsTimeBucket[];
}

export interface MomentumTeam {
	id: string;
	name: string;
}

export interface MatchMomentumPoint {
	minute: number;
	homeValue: number;
	awayValue: number;
	homeMomentum: number;
	awayMomentum: number;
	netMomentum: number;
}

export interface MatchMomentumPayload {
	matchId: string;
	source: string;
	intervalMinutes: number;
	triggerIntervalMinutes: number;
	windowMinutes: number;
	homeTeam: MomentumTeam;
	awayTeam: MomentumTeam;
	points: MatchMomentumPoint[];
}

export interface MatchStatsUpdateData {
	current: MatchStatsPayload;
	comparison: MatchStatsComparisonPayload;
	timeline: MatchStatsTimeline;
	momentum?: MatchMomentumPayload | null;
}
