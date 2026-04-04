package phoenix.betgenius.domain

import java.time.OffsetDateTime
import java.util.UUID

import io.circe.Decoder
import io.circe.parser._
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.support.FileSupport

class ResultSetDecoderSpec extends AnyWordSpec with Matchers with FileSupport with OptionValues {

  "ResultSetIngest decoder" should {

    def decodeJson[T: Decoder] =
      decode[Seq[T]](stringFromResource("betgenius", "resultSets.json"))

    "decode into ResultSetIngest" in {
      decodeJson[ResultSetIngest].isRight shouldBe true
    }

    "decode into Ingest" in {
      decodeJson[Ingest].isRight shouldBe true
    }

    "decode correct values" in {
      decodeJson[ResultSetIngest].toOption.value.head shouldBe ResultSetIngest(
        header = Header(
          UUID.fromString("132106a4-3913-4259-ad43-af55db0a1f6d"),
          OffsetDateTime.parse("2021-10-19T18:51:54.816022300Z")),
        ResultSet(
          FixtureId(8571625),
          Seq(
            MarketResult(
              MarketId(100000004),
              Seq(
                Result(SelectionId(300000008), ResultStatus.Loser),
                Result(SelectionId(300000009), ResultStatus.Winner))))))
    }
  }
}
