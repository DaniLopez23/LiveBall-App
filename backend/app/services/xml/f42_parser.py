"""Parser for the Opta F42 results/match catalogue feed."""

import re
import xml.etree.ElementTree as ET
from typing import Dict, Optional

from app.schemas.games import AvailableMatch, AvailableMatchTeam


_LIVE_PERIODS = {
    "firsthalf",
    "secondhalf",
    "firstperiod",
    "secondperiod",
    "extratime",
    "extratimefirsthalf",
    "extratimesecondhalf",
    "penaltyshootout",
}


def _normalized_period(period: str) -> str:
    return re.sub(r"[^a-z0-9]", "", period.lower())


def match_status_from_period(period: str) -> str:
    """Maps the raw F42 MatchInfo Period value to a frontend status."""
    normalized = _normalized_period(period)
    if normalized in {"pregame", "prematch"}:
        return "scheduled"
    if normalized in _LIVE_PERIODS:
        return "live"
    if normalized in {"halftime", "extratimehalftime"}:
        return "paused"
    if normalized in {"fulltime", "postmatch"}:
        return "finished"
    if normalized in {"postponed", "suspended", "cancelled", "abandoned"}:
        return normalized
    return "unknown"


class XmlParseF42Service:
    """Converts an F42 XML document into selectable match payloads."""

    @staticmethod
    def _normalize_id(raw_id: str, prefix: str) -> str:
        value = raw_id.strip()
        return value[1:] if value[:1].lower() == prefix.lower() else value

    @staticmethod
    def _text(element: Optional[ET.Element]) -> Optional[str]:
        if element is None or element.text is None:
            return None
        value = element.text.strip()
        return value or None

    def _parse_teams(self, document: ET.Element) -> Dict[str, Dict[str, str]]:
        teams: Dict[str, Dict[str, str]] = {}
        for team_element in document.findall(".//Team"):
            team_id = self._normalize_id(team_element.attrib.get("uID", ""), "t")
            if not team_id:
                continue

            current = teams.setdefault(team_id, {})
            team_name = self._text(team_element.find("Name"))
            if team_name and not current.get("team_name"):
                current["team_name"] = team_name

            short_name = team_element.attrib.get("short_club_name")
            official_name = team_element.attrib.get("official_club_name")
            if short_name and not current.get("team_short"):
                current["team_short"] = short_name
            if official_name and not current.get("team_official"):
                current["team_official"] = official_name
        return teams

    @staticmethod
    def _match_stats(match_data: ET.Element) -> Dict[str, str]:
        return {
            stat.attrib.get("Type", ""): (stat.text or "").strip()
            for stat in match_data.findall("Stat")
            if stat.attrib.get("Type")
        }

    def _parse_match_team(
        self,
        team_data: ET.Element,
        teams: Dict[str, Dict[str, str]],
    ) -> AvailableMatchTeam:
        team_id = self._normalize_id(team_data.attrib.get("TeamRef", ""), "t")
        team = teams.get(team_id, {})
        return AvailableMatchTeam(
            team_id=team_id,
            team_name=team.get("team_name") or team_id,
            team_short=team.get("team_short"),
            team_official=team.get("team_official"),
            side=team_data.attrib.get("Side", ""),
            score=team_data.attrib.get("Score"),
            half_time_score=team_data.attrib.get("HalfTimeScore"),
        )

    @staticmethod
    def _normalize_date(raw_date: Optional[str]) -> Optional[str]:
        if raw_date and re.fullmatch(r"\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}", raw_date):
            return raw_date.replace(" ", "T", 1)
        return raw_date

    def parse_xml_string(self, xml_string: str) -> list[AvailableMatch]:
        root = ET.fromstring(xml_string)
        document = root.find("SoccerDocument")
        if document is None:
            raise ValueError("No <SoccerDocument> element found in F42 XML")

        document_attrs = document.attrib
        teams = self._parse_teams(document)
        matches: list[AvailableMatch] = []

        for match_data in document.findall("MatchData"):
            match_info = match_data.find("MatchInfo")
            if match_info is None:
                continue

            team_data = match_data.findall("TeamData")
            if len(team_data) < 2:
                continue

            parsed_teams = [
                self._parse_match_team(team_element, teams)
                for team_element in team_data
            ]
            home_team = next(
                (team for team in parsed_teams if team.side.lower() == "home"),
                parsed_teams[0],
            )
            away_team = next(
                (
                    team
                    for team in parsed_teams
                    if team.side.lower() == "away" and team.team_id != home_team.team_id
                ),
                parsed_teams[1],
            )

            uid = match_data.attrib.get("uID", "")
            period = match_info.attrib.get("Period", "")
            stats = self._match_stats(match_data)
            matches.append(
                AvailableMatch(
                    game_id=self._normalize_id(uid, "g"),
                    uid=uid,
                    competition_id=document_attrs.get("competition_id", ""),
                    competition_name=document_attrs.get("competition_name", ""),
                    season_id=document_attrs.get("season_id", ""),
                    season_name=document_attrs.get("season_name", ""),
                    matchday=match_info.attrib.get("MatchDay"),
                    match_type=match_info.attrib.get("MatchType"),
                    period=period,
                    status=match_status_from_period(period),
                    game_date=self._normalize_date(self._text(match_info.find("Date"))),
                    timezone=self._text(match_info.find("TZ")),
                    venue=stats.get("Venue"),
                    attendance=stats.get("Attendance"),
                    home_team=home_team,
                    away_team=away_team,
                )
            )

        return sorted(matches, key=lambda match: (match.game_date or "", match.game_id))
