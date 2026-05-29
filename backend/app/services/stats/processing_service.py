import logging
import xml.etree.ElementTree as ET
from typing import Any, Dict, Iterable, List, Optional, Tuple

from app.schemas.momentum import MatchMomentumPayload, MatchMomentumPoint
from app.schemas.stats import (
    DerivedStats,
    MatchStatsComparisonPayload,
    MatchStatsPayload,
    MatchStatsTimeline,
    MatchStatsUpdateData,
    ParsedMatchStats,
    StatComparisonValues,
    StatGroupName,
    StatPeriodValues,
    StatsTimeBucket,
    TeamGroupedStats,
    TeamMatchStats,
)
from app.services.momentum import MatchMomentumService
from app.services.players.service import PlayersService
from app.services.stats.player_enricher import StatsPlayerEnricher
from app.state.game_state import GameStateCache

logger = logging.getLogger(__name__)


STAT_GROUPS: Dict[StatGroupName, Tuple[str, ...]] = {
    "possession": (
        "possession_percentage",
        "touches",
        "touches_in_opp_box",
        "poss_lost_all",
    ),
    "passing": (
        "total_pass",
        "accurate_pass",
        "fwd_pass",
        "backward_pass",
        "total_final_third_passes",
        "successful_final_third_passes",
        "total_long_balls",
        "accurate_long_balls",
        "total_cross",
        "accurate_cross",
    ),
    "shooting": (
        "goals",
        "total_scoring_att",
        "ontarget_scoring_att",
        "shot_off_target",
        "blocked_scoring_att",
        "attempts_ibox",
        "attempts_obox",
        "big_chance_created",
        "big_chance_missed",
        "pen_area_entries",
        "final_third_entries",
        "total_att_assist",
    ),
    "defensive": (
        "total_tackle",
        "won_tackle",
        "interception",
        "ball_recovery",
        "total_clearance",
        "effective_clearance",
        "outfielder_block",
        "duel_won",
        "duel_lost",
        "aerial_won",
        "aerial_lost",
        "poss_won_def_3rd",
        "poss_won_mid_3rd",
        "poss_won_att_3rd",
        "attempts_conceded_ibox",
        "attempts_conceded_obox",
        "goals_conceded",
        "saves",
    ),
    "discipline": (
        "fk_foul_won",
        "fk_foul_lost",
        "total_yel_card",
        "total_red_card",
        "total_offside",
    ),
}

STAT_TO_GROUP: Dict[str, StatGroupName] = {
    stat_name: group_name
    for group_name, stat_names in STAT_GROUPS.items()
    for stat_name in stat_names
}

DERIVED_PERCENT_DECIMALS = 1
DEFAULT_STATS_TIMESTAMP = ""


def _to_number(value: object) -> Optional[float]:
    if value is None or value == "":
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _empty_grouped_stats() -> Dict[StatGroupName, Dict[str, StatPeriodValues]]:
    return {
        group_name: {
            stat_name: StatPeriodValues()
            for stat_name in stat_names
        }
        for group_name, stat_names in STAT_GROUPS.items()
    }


def parse_stat_xml(stat_element: ET.Element) -> Tuple[str, StatPeriodValues]:
    """
    Parses one F9 <Stat> element into frontend period values.
    """
    return (
        stat_element.attrib.get("Type", ""),
        StatPeriodValues(
            total=_to_number((stat_element.text or "").strip()),
            firstHalf=_to_number(stat_element.attrib.get("FH")),
            secondHalf=_to_number(stat_element.attrib.get("SH")),
        ),
    )


def parse_team_stat(stat_type: str, value: object, fh: object, sh: object) -> StatPeriodValues:
    """
    Normalizes one already-parsed team stat.

    stat_type is accepted to keep the call site explicit and easy to test.
    """
    _ = stat_type
    return StatPeriodValues(
        total=_to_number(value),
        firstHalf=_to_number(fh),
        secondHalf=_to_number(sh),
    )


def _normalize_side(raw_side: Optional[str], fallback: str) -> str:
    side = (raw_side or "").strip().lower()
    if side in {"home", "away"}:
        return side
    return fallback


def group_stats_by_team(team: TeamMatchStats, fallback_side: str = "home") -> TeamGroupedStats:
    """
    Keeps only STAT_GROUPS fields and groups them by frontend section.
    """
    groups = _empty_grouped_stats()

    for stat in team.stats:
        group_name = STAT_TO_GROUP.get(stat.type)
        if group_name is None:
            continue

        groups[group_name][stat.type] = parse_team_stat(
            stat.type,
            stat.value,
            stat.fh,
            stat.sh,
        )

    grouped_team = TeamGroupedStats(
        teamId=team.team_id,
        teamName=team.team_name or team.team_id,
        side=_normalize_side(team.side, fallback_side),  # type: ignore[arg-type]
        groups=groups,
    )
    grouped_team.derived = calculate_derived_stats(grouped_team)
    return grouped_team


def _stat_total(team: TeamGroupedStats, stat_name: str) -> Optional[float]:
    group_name = STAT_TO_GROUP.get(stat_name)
    if group_name is None:
        return None
    return team.groups[group_name][stat_name].total


def _percentage(numerator: Optional[float], denominator: Optional[float]) -> Optional[float]:
    if denominator is None or denominator == 0 or numerator is None:
        return None
    return round((numerator / denominator) * 100, DERIVED_PERCENT_DECIMALS)


def calculate_derived_stats(team: TeamGroupedStats) -> DerivedStats:
    """
    Calculates frontend-ready percentages from grouped total values.
    """
    duel_won = _stat_total(team, "duel_won")
    duel_lost = _stat_total(team, "duel_lost")
    aerial_won = _stat_total(team, "aerial_won")
    aerial_lost = _stat_total(team, "aerial_lost")

    return DerivedStats(
        passAccuracy=_percentage(
            _stat_total(team, "accurate_pass"),
            _stat_total(team, "total_pass"),
        ),
        longBallAccuracy=_percentage(
            _stat_total(team, "accurate_long_balls"),
            _stat_total(team, "total_long_balls"),
        ),
        crossAccuracy=_percentage(
            _stat_total(team, "accurate_cross"),
            _stat_total(team, "total_cross"),
        ),
        finalThirdPassAccuracy=_percentage(
            _stat_total(team, "successful_final_third_passes"),
            _stat_total(team, "total_final_third_passes"),
        ),
        shotAccuracy=_percentage(
            _stat_total(team, "ontarget_scoring_att"),
            _stat_total(team, "total_scoring_att"),
        ),
        goalConversion=_percentage(
            _stat_total(team, "goals"),
            _stat_total(team, "total_scoring_att"),
        ),
        tackleSuccess=_percentage(
            _stat_total(team, "won_tackle"),
            _stat_total(team, "total_tackle"),
        ),
        duelSuccess=_percentage(
            duel_won,
            (duel_won or 0) + (duel_lost or 0),
        ),
        aerialSuccess=_percentage(
            aerial_won,
            (aerial_won or 0) + (aerial_lost or 0),
        ),
    )


def _select_home_away(teams: Iterable[TeamMatchStats]) -> Tuple[TeamGroupedStats, TeamGroupedStats]:
    grouped_teams = [
        group_stats_by_team(team, "home" if index == 0 else "away")
        for index, team in enumerate(teams)
    ]
    if len(grouped_teams) < 2:
        raise ValueError("F9 stats payload must contain at least two TeamData blocks")

    home = next((team for team in grouped_teams if team.side == "home"), grouped_teams[0])
    away = next(
        (team for team in grouped_teams if team.side == "away" and team.teamId != home.teamId),
        grouped_teams[1],
    )
    return home, away


def build_match_stats_payload(parsed_stats: ParsedMatchStats) -> MatchStatsPayload:
    """
    Builds the frontend-oriented current match stats payload.
    """
    home, away = _select_home_away(parsed_stats.teams)
    return MatchStatsPayload(
        matchId=parsed_stats.game_id,
        minute=parsed_stats.match_minute,
        timestamp=parsed_stats.feed_timestamp or DEFAULT_STATS_TIMESTAMP,
        home=home,
        away=away,
    )


def _comparison_values(
    home_value: Optional[float],
    away_value: Optional[float],
) -> StatComparisonValues:
    diff = None
    if home_value is not None and away_value is not None:
        diff = round(home_value - away_value, DERIVED_PERCENT_DECIMALS)
    return StatComparisonValues(home=home_value, away=away_value, diff=diff)


def build_match_stats_comparison(
    current: MatchStatsPayload,
) -> MatchStatsComparisonPayload:
    """
    Builds a home-vs-away comparison using total values.
    """
    groups: Dict[StatGroupName, Dict[str, StatComparisonValues]] = {}
    for group_name, stat_names in STAT_GROUPS.items():
        groups[group_name] = {}
        for stat_name in stat_names:
            groups[group_name][stat_name] = _comparison_values(
                current.home.groups[group_name][stat_name].total,
                current.away.groups[group_name][stat_name].total,
            )

    derived = {
        stat_name: _comparison_values(
            getattr(current.home.derived, stat_name),
            getattr(current.away.derived, stat_name),
        )
        for stat_name in DerivedStats.model_fields
    }

    return MatchStatsComparisonPayload(
        matchId=current.matchId,
        minute=current.minute,
        timestamp=current.timestamp,
        groups=groups,
        derived=derived,
    )


class MatchStatsTimelineStore:
    """
    Keeps one 1-minute cumulative snapshot timeline per match.

    Bucket strategy is floor-based:
    minute 0 -> bucket 0, minute 1 -> bucket 1, minute 2 -> bucket 2, etc.
    A new XML reading in an existing bucket replaces that bucket snapshot.
    """

    def __init__(self, interval_minutes: int = 1) -> None:
        self.interval_minutes = interval_minutes
        self._timelines: Dict[str, MatchStatsTimeline] = {}

    def bucket_minute(self, minute: int) -> int:
        bounded_minute = max(0, minute)
        return (bounded_minute // self.interval_minutes) * self.interval_minutes

    def get(self, match_id: str) -> MatchStatsTimeline:
        return self._timelines.get(
            match_id,
            MatchStatsTimeline(
                matchId=match_id,
                intervalMinutes=self.interval_minutes,
            ),
        )

    def update(
        self,
        current: MatchStatsPayload,
        existing_timeline: Optional[MatchStatsTimeline] = None,
        momentum: Optional[MatchMomentumPayload] = None,
    ) -> MatchStatsTimeline:
        timeline = existing_timeline or self.get(current.matchId)
        if current.minute is None:
            timeline = self._with_momentum(timeline, momentum)
            self._timelines[current.matchId] = timeline
            return timeline

        bucket_minute = self.bucket_minute(current.minute)
        bucket = StatsTimeBucket(
            minute=bucket_minute,
            timestamp=current.timestamp,
            home=current.home.model_copy(deep=True),
            away=current.away.model_copy(deep=True),
            momentum=self._momentum_point(momentum, bucket_minute),
        )

        replaced = False
        buckets = []
        for existing_bucket in timeline.buckets:
            if existing_bucket.minute == bucket_minute:
                if bucket.momentum is None and existing_bucket.momentum is not None:
                    bucket = bucket.model_copy(
                        update={"momentum": existing_bucket.momentum}
                    )
                buckets.append(bucket)
                replaced = True
            else:
                buckets.append(
                    existing_bucket.model_copy(
                        update={
                            "momentum": self._momentum_point(
                                momentum,
                                existing_bucket.minute,
                            )
                            or existing_bucket.momentum
                        }
                    )
                )

        if not replaced:
            buckets.append(bucket)

        timeline = MatchStatsTimeline(
            matchId=current.matchId,
            intervalMinutes=self.interval_minutes,
            buckets=sorted(buckets, key=lambda item: item.minute),
        )
        self._timelines[current.matchId] = timeline
        return timeline

    def _with_momentum(
        self,
        timeline: MatchStatsTimeline,
        momentum: Optional[MatchMomentumPayload],
    ) -> MatchStatsTimeline:
        if momentum is None:
            return timeline

        return MatchStatsTimeline(
            matchId=timeline.matchId,
            intervalMinutes=timeline.intervalMinutes,
            buckets=[
                bucket.model_copy(
                    update={
                        "momentum": self._momentum_point(momentum, bucket.minute)
                        or bucket.momentum
                    }
                )
                for bucket in timeline.buckets
            ],
        )

    @staticmethod
    def _momentum_point(
        momentum: Optional[MatchMomentumPayload],
        minute: int,
    ) -> Optional[MatchMomentumPoint]:
        if momentum is None:
            return None
        return next((point for point in momentum.points if point.minute == minute), None)


class ProcessStatsService:
    """Detects changes in grouped F9 stats payloads and emits update messages."""

    def __init__(
        self,
        cache: Optional[GameStateCache] = None,
        players_service: Optional[PlayersService] = None,
        timeline_store: Optional[MatchStatsTimelineStore] = None,
        momentum_service: Optional[MatchMomentumService] = None,
    ) -> None:
        self._cache = cache or GameStateCache()
        self._players_service = players_service or PlayersService()
        self._player_enricher = StatsPlayerEnricher(self._players_service)
        self._timeline_store = timeline_store or MatchStatsTimelineStore()
        self._momentum_service = momentum_service or MatchMomentumService(self._cache)

    def process_game(self, parsed_stats: ParsedMatchStats) -> List[Dict[str, Any]]:
        self._player_enricher.enrich(parsed_stats)
        game_id = parsed_stats.game_id

        current = build_match_stats_payload(parsed_stats)
        comparison = build_match_stats_comparison(current)
        momentum = self._momentum_for_stats_update(game_id, current.minute)
        timeline = self._timeline_store.update(
            current,
            existing_timeline=self._cache.get_match_stats_timeline(game_id),
            momentum=momentum,
        )
        update_data = MatchStatsUpdateData(
            current=current,
            comparison=comparison,
            timeline=timeline,
            momentum=momentum,
        )
        current_snapshot = update_data.model_dump()

        if not self._cache.has_stats(game_id):
            self._store_stats_update(parsed_stats, update_data, current_snapshot)
            logger.debug("(STATS) New grouped stats detected: %s", game_id)
            return [self._message(game_id, self._current_update(update_data))]

        previous = self._cache.get_stats_snapshot(game_id)
        if previous != current_snapshot:
            self._store_stats_update(parsed_stats, update_data, current_snapshot)
            logger.debug("(STATS) Grouped stats updated: %s", game_id)
            return [self._message(game_id, self._current_update(update_data))]

        return []

    def _momentum_for_stats_update(
        self,
        game_id: str,
        stats_minute: Optional[int],
    ) -> Optional[MatchMomentumPayload]:
        game = self._cache.games.get(game_id)
        if game is None:
            return self._cache.get_momentum_payload(game_id)

        return self._momentum_service.refresh_payload(
            game,
            force=True,
            refresh_all_buckets=True,
            until_minute=stats_minute,
        )

    def _store_stats_update(
        self,
        parsed_stats: ParsedMatchStats,
        update_data: MatchStatsUpdateData,
        snapshot: Dict[str, Any],
    ) -> None:
        self._cache.store_stats(parsed_stats, snapshot)
        self._cache.store_match_stats_update(parsed_stats.game_id, update_data)

    def _current_update(self, update_data: MatchStatsUpdateData) -> MatchStatsUpdateData:
        current_minute = update_data.current.minute
        if current_minute is None:
            return MatchStatsUpdateData(
                current=update_data.current,
                comparison=update_data.comparison,
                timeline=MatchStatsTimeline(
                    matchId=update_data.timeline.matchId,
                    intervalMinutes=update_data.timeline.intervalMinutes,
                    buckets=[],
                ),
                momentum=self._momentum_slice(update_data.momentum, None),
            )

        bucket_minute = self._timeline_store.bucket_minute(current_minute)
        current_bucket = next(
            (
                bucket
                for bucket in update_data.timeline.buckets
                if bucket.minute == bucket_minute
            ),
            None,
        )
        return MatchStatsUpdateData(
            current=update_data.current,
            comparison=update_data.comparison,
            timeline=MatchStatsTimeline(
                matchId=update_data.timeline.matchId,
                intervalMinutes=update_data.timeline.intervalMinutes,
                buckets=[current_bucket] if current_bucket else [],
            ),
            momentum=self._momentum_slice(update_data.momentum, bucket_minute),
        )

    @staticmethod
    def _momentum_slice(
        momentum: Optional[MatchMomentumPayload],
        minute: Optional[int],
    ) -> Optional[MatchMomentumPayload]:
        if momentum is None:
            return None

        window_minutes = max(1, getattr(momentum, "windowMinutes", 1))
        points = (
            [
                point
                for point in momentum.points
                if minute - window_minutes + 1 <= point.minute <= minute
            ]
            if minute is not None
            else []
        )
        return momentum.model_copy(update={"points": points})

    @staticmethod
    def _message(
        game_id: str,
        update_data: MatchStatsUpdateData,
    ) -> Dict[str, Any]:
        return {
            "type": "match_stats_update",
            "game_id": game_id,
            "data": update_data.model_dump(),
        }
