import tempfile
import textwrap
import unittest
from pathlib import Path

from app.services.games.catalog_service import MatchCatalogService
from app.services.xml.f42_parser import XmlParseF42Service, match_status_from_period


F42_XML = textwrap.dedent(
    """
    <SoccerFeed>
      <SoccerDocument
        competition_id="23"
        competition_name="Spanish La Liga"
        season_id="2023"
        season_name="Season 2023/2024"
      >
        <MatchData uID="g100">
          <MatchInfo MatchDay="1" MatchType="Regular" Period="Pregame">
            <Date>2023-08-11 18:30:00</Date>
            <TZ>BST</TZ>
          </MatchInfo>
          <Stat Type="Venue">Stadium One</Stat>
          <TeamData Side="Home" TeamRef="t1" Score="0" />
          <TeamData Side="Away" TeamRef="t2" Score="0" />
        </MatchData>
        <MatchData uID="g101">
          <MatchInfo MatchDay="2" MatchType="Regular" Period="FullTime">
            <Date>2023-08-18 20:00:00</Date>
          </MatchInfo>
          <TeamData Side="Home" TeamRef="t2" Score="2" HalfTimeScore="1" />
          <TeamData Side="Away" TeamRef="t1" Score="1" HalfTimeScore="0" />
        </MatchData>
        <Squads>
          <Team uID="t1"><Name>Home Team</Name></Team>
          <Team uID="t2"><Name>Away Team</Name></Team>
        </Squads>
      </SoccerDocument>
    </SoccerFeed>
    """
).strip()


class F42MatchCatalogTests(unittest.TestCase):
    def test_parser_returns_all_matches_with_normalized_ids_and_statuses(self):
        matches = XmlParseF42Service().parse_xml_string(F42_XML)

        self.assertEqual([match.game_id for match in matches], ["100", "101"])
        self.assertEqual(matches[0].uid, "g100")
        self.assertEqual(matches[0].status, "scheduled")
        self.assertEqual(matches[0].game_date, "2023-08-11T18:30:00")
        self.assertEqual(matches[0].home_team.team_name, "Home Team")
        self.assertEqual(matches[0].away_team.team_name, "Away Team")
        self.assertEqual(matches[1].status, "finished")
        self.assertEqual(matches[1].home_team.score, 2)

    def test_status_is_derived_from_period(self):
        expected = {
            "Pregame": "scheduled",
            "FirstHalf": "live",
            "HalfTime": "paused",
            "SecondHalf": "live",
            "FullTime": "finished",
            "Postponed": "postponed",
            "Unexpected": "unknown",
        }

        for period, status in expected.items():
            with self.subTest(period=period):
                self.assertEqual(match_status_from_period(period), status)

    def test_catalog_refreshes_when_f42_file_changes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            f42_path = Path(tmp_dir) / "F42.xml"
            f42_path.write_text(F42_XML, encoding="utf-8")
            service = MatchCatalogService(f42_path)

            self.assertEqual(len(service.get_available_matches()), 2)

            updated_xml = F42_XML.replace(
                '<MatchData uID="g101">',
                '<MatchData uID="g102">',
            )
            f42_path.write_text(updated_xml, encoding="utf-8")

            self.assertEqual(
                [match.game_id for match in service.get_available_matches()],
                ["100", "102"],
            )


if __name__ == "__main__":
    unittest.main()
