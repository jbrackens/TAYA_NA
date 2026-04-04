package phoenix.betgenius.domain

import java.time.OffsetDateTime
import java.util.UUID

import io.circe.Decoder
import io.circe.parser._
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.support.FileSupport

class CoverageDecoderSpec extends AnyWordSpec with Matchers with FileSupport with OptionValues {

  "CoverageIngest decoder" should {

    def decodeJson[T: Decoder] =
      decode[Seq[T]](stringFromResource("betgenius", "coverages.json"))

    "decode into CoverageIngest" in {
      decodeJson[CoverageIngest].isRight shouldBe true
    }

    "decode into Ingest" in {
      decodeJson[Ingest].isRight shouldBe true
    }

    "decode correct values" in {
      decodeJson[CoverageIngest].toOption.value.head shouldBe CoverageIngest(
        header = Header(
          UUID.fromString("2c727e3c-9ede-4dcf-955e-1ff819e257a1"),
          OffsetDateTime.parse("2021-10-13T14:32:53.985080600Z")),
        Coverage(FixtureId(8577482), true, Seq(Feed(true, "MatchState"), Feed(true, "TradingState"))))
    }
  }
}
