package phoenix.betgenius.domain

import java.time.OffsetDateTime

import scala.collection.immutable

import enumeratum.EnumEntry.Camelcase
import enumeratum._
import io.circe.Decoder
import io.circe.generic.extras.ConfiguredJsonCodec
import io.circe.generic.extras.semiauto._
import io.scalaland.chimney.Transformer

import phoenix.dataapi.shared

final case class FixtureId(value: Int) extends BetgeniusId {
  override val prefix: String = "f"
}
object FixtureId {
  implicit val decoder: Decoder[FixtureId] = deriveUnwrappedDecoder
}

final case class FixtureName(value: String)
object FixtureName {
  implicit val decoder: Decoder[FixtureName] = deriveUnwrappedDecoder
}

@ConfiguredJsonCodec(decodeOnly = true)
final case class Fixture(
    id: FixtureId,
    name: FixtureName,
    startTimeUtc: OffsetDateTime,
    fixtureType: FixtureType,
    status: FixtureStatus,
    competition: Competition,
    competitors: Seq[Competitor],
    season: Season,
    sport: Sport)

sealed trait FixtureStatus extends EnumEntry with Camelcase
object FixtureStatus extends Enum[FixtureStatus] with CirceEnum[FixtureStatus] {
  override def values: immutable.IndexedSeq[FixtureStatus] = findValues

  final case object UnknownStatus extends FixtureStatus
  final case object Scheduled extends FixtureStatus
  final case object Unscheduled extends FixtureStatus
  final case object Postponed extends FixtureStatus
  final case object Cancelled extends FixtureStatus
  final case object Deleted extends FixtureStatus

  implicit val toSharedStatusTransformer: Transformer[FixtureStatus, shared.FixtureStatus] = {
    case UnknownStatus => shared.FixtureStatus.Unknown
    case Scheduled     => shared.FixtureStatus.PreGame
    case Unscheduled   => shared.FixtureStatus.GameAbandoned
    case Postponed     => shared.FixtureStatus.PreGame
    case Cancelled     => shared.FixtureStatus.GameAbandoned
    case Deleted       => shared.FixtureStatus.GameAbandoned
  }
}

sealed trait FixtureType extends EnumEntry with Camelcase
object FixtureType extends Enum[FixtureType] with CirceEnum[FixtureType] {
  override def values: IndexedSeq[FixtureType] = findValues

  final case object Match extends FixtureType
  final case object Outright extends FixtureType
  final case object Aggregrate extends FixtureType
  final case object Virtual extends FixtureType
}
