import logging
import xml.etree.ElementTree as ET
from typing import Optional

from app.schemas.stats import BookingStat, GoalStat, ParsedMatchStats, TeamMatchStats, TeamStat

logger = logging.getLogger(__name__)


class XmlParseStatsService:
	"""Parses Opta F9 match-result XML into team-level bookings and goals."""

	def _normalize_game_id(self, raw_game_id: str) -> str:
		return raw_game_id[1:] if raw_game_id.startswith("f") else raw_game_id

	def _normalize_team_id(self, raw_team_id: str) -> str:
		return raw_team_id[1:] if raw_team_id.startswith("t") else raw_team_id

	def _parse_booking(self, booking_element: ET.Element) -> BookingStat:
		attrs = booking_element.attrib
		return BookingStat(
			event_id=attrs.get("EventID", ""),
			event_number=attrs.get("EventNumber"),
			min=attrs.get("Min"),
			sec=attrs.get("Sec"),
			time=attrs.get("Time"),
			period=attrs.get("Period"),
			player_ref=attrs.get("PlayerRef"),
			reason=attrs.get("Reason"),
			card=attrs.get("Card"),
			card_type=attrs.get("CardType"),
			timestamp=attrs.get("TimeStamp"),
			timestamp_utc=attrs.get("TimeStampUTC"),
			uid=attrs.get("uID"),
		)

	def _parse_goal(self, goal_element: ET.Element) -> GoalStat:
		attrs = goal_element.attrib
		return GoalStat(
			event_id=attrs.get("EventID", ""),
			event_number=attrs.get("EventNumber"),
			min=attrs.get("Min"),
			sec=attrs.get("Sec"),
			time=attrs.get("Time"),
			period=attrs.get("Period"),
			player_ref=attrs.get("PlayerRef"),
			goal_type=attrs.get("Type"),
			timestamp=attrs.get("TimeStamp"),
			timestamp_utc=attrs.get("TimeStampUTC"),
			uid=attrs.get("uID"),
		)

	def _parse_team_stat(self, stat_element: ET.Element) -> TeamStat:
		attrs = stat_element.attrib
		return TeamStat(
			type=attrs.get("Type", ""),
			value=(stat_element.text or "").strip() or None,
			fh=attrs.get("FH"),
			sh=attrs.get("SH"),
		)

	def _parse_team_data(self, team_data_element: ET.Element) -> TeamMatchStats:
		attrs = team_data_element.attrib
		bookings = [
			self._parse_booking(element) for element in team_data_element.findall("Booking")
		]
		goals = [self._parse_goal(element) for element in team_data_element.findall("Goal")]
		stats = [self._parse_team_stat(element) for element in team_data_element.findall("Stat")]

		return TeamMatchStats(
			team_id=self._normalize_team_id(attrs.get("TeamRef", "")),
			side=attrs.get("Side"),
			score=attrs.get("Score"),
			bookings=bookings,
			goals=goals,
			stats=stats,
		)

	def parse_xml_string(self, xml_string: str) -> Optional[ParsedMatchStats]:
		try:
			root = ET.fromstring(xml_string)
		except ET.ParseError as e:
			logger.error("Failed to parse F9 stats XML: %s", e)
			return None

		document_element = root.find("SoccerDocument")
		if document_element is None:
			logger.error("No <SoccerDocument> element found in F9 stats XML.")
			return None

		match_data_element = document_element.find("MatchData")
		if match_data_element is None:
			logger.error("No <MatchData> element found in F9 stats XML.")
			return None

		teams = [
			self._parse_team_data(team_data)
			for team_data in match_data_element.findall("TeamData")
		]

		return ParsedMatchStats(
			game_id=self._normalize_game_id(document_element.attrib.get("uID", "")),
			feed_timestamp=root.attrib.get("TimeStamp"),
			document_type=document_element.attrib.get("Type"),
			detail_id=document_element.attrib.get("detail_id"),
			teams=teams,
		)
