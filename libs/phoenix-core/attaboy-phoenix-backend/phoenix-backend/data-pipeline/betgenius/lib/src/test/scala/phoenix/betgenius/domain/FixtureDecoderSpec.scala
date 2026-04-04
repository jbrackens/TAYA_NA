package phoenix.betgenius.domain

import java.time.OffsetDateTime
import java.util.UUID

import io.circe.Decoder
import io.circe.parser._
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.support.FileSupport

class FixtureDecoderSpec extends AnyWordSpec with Matchers with FileSupport with OptionValues {

  "FixtureIngest decoder" should {

    def decodeJson[T: Decoder] =
      decode[Seq[T]](stringFromResource("betgenius", "fixtures.json"))

    "decode into FixtureIngest" in {
      decodeJson[FixtureIngest].isRight shouldBe true
    }

    "decode into Ingest" in {
      decodeJson[Ingest].isRight shouldBe true
    }

    "decode correct values" in {
      decodeJson[FixtureIngest].toOption.value.head shouldBe FixtureIngest(
        header = Header(
          UUID.fromString("e373b43c-4649-46e1-a317-970759cfdcc6"),
          OffsetDateTime.parse("2021-10-08T14:13:44.7671916Z")),
        fixture = Fixture(
          FixtureId(8565263),
          FixtureName("Atletico Madrid (NicolasRage) v Borussia Dortmund (YoungDaddy) (Bo1)"),
          OffsetDateTime.parse("2021-10-08T14:12:00Z"),
          FixtureType.Match,
          FixtureStatus.Scheduled,
          Competition(
            CompetitionId(13745),
            CompetitionName("[FIFA] eSports Battle"),
            Region(RegionId(3795074), RegionName("FIFA"))),
          Seq(
            Competitor(CompetitorId(1288944), CompetitorName("Atletico Madrid (NicolasRage)"), CompetitorSide.Home),
            Competitor(CompetitorId(1301010), CompetitorName("Borussia Dortmund (YoungDaddy)"), CompetitorSide.Away)),
          season = Season(SeasonId(117073), SeasonName("2021 [FIFA] eSports Battle October")),
          sport = Sport(SportId(10915624), SportName("eSports"))))
    }
  }
}
