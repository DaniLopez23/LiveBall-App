import tempfile
import textwrap
import unittest
from pathlib import Path

from app.services.players.service import PlayersService
from app.state.players_state import PlayersStateCache


class PlayersServiceTests(unittest.TestCase):
    def test_merges_duplicate_f40_team_blocks_for_player_lookup(self):
        xml = textwrap.dedent(
            """
            <SoccerFeed>
              <SoccerDocument>
                <Team uID="t1">
                  <Name>Team One</Name>
                  <Player uID="p10">
                    <Name>Starter</Name>
                    <Position>Midfielder</Position>
                    <Stat Type="jersey_num">8</Stat>
                  </Player>
                  <HistoricalSquad>
                    <Team uID="t1">
                      <Name>Team One</Name>
                      <Player uID="p20">
                        <Name>Secondary Player</Name>
                        <Position>Defender</Position>
                        <Stat Type="jersey_num">4</Stat>
                      </Player>
                    </Team>
                  </HistoricalSquad>
                </Team>
              </SoccerDocument>
            </SoccerFeed>
            """
        ).strip()

        with tempfile.TemporaryDirectory() as tmp_dir:
            f40_path = Path(tmp_dir) / "F40.xml"
            f40_path.write_text(xml, encoding="utf-8")

            service = PlayersService(
                cache=PlayersStateCache(),
                f40_xml_path=f40_path,
            )

            team_players = service.get_team_players("1")
            player_ids = {player["player_id"] for player in team_players}

            self.assertEqual(player_ids, {"10", "20"})
            self.assertEqual(
                service.get_player_brief("1", "20")["name"],
                "Secondary Player",
            )


if __name__ == "__main__":
    unittest.main()
