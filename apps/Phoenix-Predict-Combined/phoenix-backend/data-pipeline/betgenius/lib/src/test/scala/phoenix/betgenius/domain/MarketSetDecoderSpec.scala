package phoenix.betgenius.domain

import java.time.OffsetDateTime
import java.util.UUID

import io.circe.Decoder
import io.circe.parser._
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.support.FileSupport

class MarketSetDecoderSpec extends AnyWordSpec with Matchers with FileSupport with OptionValues {

  "MarketSetIngest decoder" should {

    def decodeJson[T: Decoder] =
      decode[Seq[T]](stringFromResource("betgenius", "marketSets.json"))

    "decode into MarketSetIngest" in {
      decodeJson[MarketSetIngest].isRight shouldBe true
    }

    "decode into Ingest" in {
      decodeJson[Ingest].isRight shouldBe true
    }

    "decode correct values" in {
      decodeJson[MarketSetIngest].toOption.value.head shouldBe MarketSetIngest(
        header = Header(
          UUID.fromString("f0ebe7cb-7ba4-4e32-b803-4ffc1beeb5e6"),
          OffsetDateTime.parse("2021-10-19T18:45:01.960920900Z")),
        marketSet = MarketSet(
          FixtureId(8571625),
          Seq(
            Market(
              MarketId(100000004),
              OffsetDateTime.parse("2021-10-19T16:00Z"),
              inPlay = true,
              MarketType(MarketTypeId(13124), MarketTypeName("Match Up Winner")),
              MarketName("Match Up Winner"),
              Seq(
                Selection(
                  SelectionId(300000008),
                  CompetitorId(863929),
                  DecimalOdds(17.0),
                  Denominator(1),
                  Numerator(16),
                  Some(Outcome(1, "Home")),
                  None,
                  SelectionStatus.Trading),
                Selection(
                  SelectionId(300000009),
                  CompetitorId(1122097),
                  DecimalOdds(1.0303),
                  Denominator(33),
                  Numerator(1),
                  Some(Outcome(3, "Away")),
                  None,
                  SelectionStatus.Trading)),
              None,
              TradingStatus.Suspended))))
    }
  }
}
