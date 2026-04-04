package phoenix.betgenius.domain

import java.time.OffsetDateTime
import java.util.UUID

import io.circe.Decoder
import io.circe.parser._
import io.scalaland.chimney.dsl._
import org.scalatest.OptionValues
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.dataapi._
import phoenix.dataapi.shared.MatchStatusUpdate
import phoenix.dataapi.shared.Score
import phoenix.support.FileSupport

class MultiSportMatchStateV2Spec extends AnyWordSpec with Matchers with FileSupport with OptionValues {

  "MultiSportMatchStateV2" should {

    def decodeJson[T: Decoder] =
      decode[Seq[T]](stringFromResource("betgenius", "multiSportMatchStateV2.json"))

    "decode into FixtureIngest" in {
      decodeJson[MultiSportIngest].isRight shouldBe true
    }

    "decode into Ingest" in {
      decodeJson[Ingest].isRight shouldBe true
    }

    "decode correct values" in {
      decodeJson[MultiSportIngest].toOption.value.head shouldBe MultiSportIngest(
        Header(
          UUID.fromString("a47de8d2-2a20-48b7-9b82-6fe441ccdc68"),
          OffsetDateTime.parse("2021-10-18T16:11:13.2421376Z")),
        MultiSportMatchStateV2(
          Some("0"),
          FixtureId(8591047),
          bookmakerId = 10231,
          homeScore = Some("0"),
          isReliable = true,
          PhaseType.InPlay,
          matchStatus = Some("1st Half  < 40mins"),
          OffsetDateTime.parse("2021-10-18T16:11:13.238Z"),
          sportId = SportId(10915624)))
    }

    "convert PhaseType into shared model FixtureStatus" in {
      PhaseType.PreGame
        .asInstanceOf[PhaseType]
        .transformInto[shared.FixtureStatus] shouldEqual shared.FixtureStatus.PreGame
      PhaseType.InPlay
        .asInstanceOf[PhaseType]
        .transformInto[shared.FixtureStatus] shouldEqual shared.FixtureStatus.InPlay
      PhaseType.GameAbandoned
        .asInstanceOf[PhaseType]
        .transformInto[shared.FixtureStatus] shouldEqual shared.FixtureStatus.GameAbandoned
      PhaseType.PostGame
        .asInstanceOf[PhaseType]
        .transformInto[shared.FixtureStatus] shouldEqual shared.FixtureStatus.PostGame
      PhaseType.BreakInPlay
        .asInstanceOf[PhaseType]
        .transformInto[shared.FixtureStatus] shouldEqual shared.FixtureStatus.BreakInPlay
      PhaseType.values.head.transformInto[shared.FixtureStatus] shouldEqual shared.FixtureStatus.values().head
    }

    "convert MultiSportIngest into shared model MatchStatusUpdate" in {
      val multiSportIngest = MultiSportIngest(
        Header(
          UUID.fromString("eed9408f-696c-45af-9be1-9fae0593f8c9"),
          OffsetDateTime.parse("2021-10-18T16:11:13.238Z")),
        MultiSportMatchStateV2(
          awayScore = Some("1"),
          betgeniusFixtureId = FixtureId(8591047),
          bookmakerId = 10231,
          homeScore = Some("0"),
          isReliable = true,
          matchPhase = PhaseType.InPlay,
          matchStatus = Some("1st Half  < 40mins"),
          messageTimestampUtc = OffsetDateTime.parse("2021-10-18T16:11:13.238Z"),
          sportId = SportId(10915624)))

      val matchStatusUpdate = MatchStatusUpdate(
        shared.Header(
          correlationId = "eed9408f-696c-45af-9be1-9fae0593f8c9",
          receivedAtUtc = OffsetDateTime.parse("2021-10-18T16:11:13.238Z").toInstant,
          source = "betgenius"),
        namespacedFixtureId = FixtureId(8591047).namespaced,
        score = Some(Score("0", "1")),
        matchStatus = shared.FixtureStatus.InPlay)

      multiSportIngest.transformInto[shared.MatchStatusUpdate] shouldEqual matchStatusUpdate
    }
  }
}
