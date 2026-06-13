package phoenix.betgenius.domain

import java.time.OffsetDateTime

import enumeratum.EnumEntry.Camelcase
import enumeratum._
import io.circe.generic.extras.ConfiguredJsonCodec
import io.scalaland.chimney.Transformer

import phoenix.dataapi._

sealed trait PhaseType extends EnumEntry with Camelcase

object PhaseType extends Enum[PhaseType] with CirceEnum[PhaseType] {
  final case object PreGame extends PhaseType
  final case object InPlay extends PhaseType
  final case object BreakInPlay extends PhaseType
  final case object PostGame extends PhaseType
  final case object GameAbandoned extends PhaseType

  lazy val values: IndexedSeq[PhaseType] = findValues

  implicit val toSharedStatusTransformer: Transformer[PhaseType, shared.FixtureStatus] = {
    case PreGame       => shared.FixtureStatus.PreGame
    case InPlay        => shared.FixtureStatus.InPlay
    case BreakInPlay   => shared.FixtureStatus.BreakInPlay
    case PostGame      => shared.FixtureStatus.PostGame
    case GameAbandoned => shared.FixtureStatus.GameAbandoned
  }
}

@ConfiguredJsonCodec(decodeOnly = true) case class MultiSportMatchStateV2(
    awayScore: Option[String] = None,
    betgeniusFixtureId: FixtureId,
    bookmakerId: Int,
    homeScore: Option[String] = None,
    isReliable: Boolean,
    matchPhase: PhaseType,
    matchStatus: Option[String] = None,
    messageTimestampUtc: OffsetDateTime,
    sportId: SportId)
