package phoenix.betgenius.domain

import scala.collection.immutable

import enumeratum.EnumEntry.Camelcase
import enumeratum._
import io.circe.Decoder
import io.circe.generic.extras.semiauto._
import io.scalaland.chimney.Transformer

import phoenix.dataapi.shared

final case class CompetitorId(value: Int) extends BetgeniusId {
  override val prefix: String = "c"
}
object CompetitorId {
  implicit val decoder: Decoder[CompetitorId] = deriveUnwrappedDecoder
}

final case class CompetitorName(value: String)
object CompetitorName {
  implicit val decoder: Decoder[CompetitorName] = deriveUnwrappedDecoder
}

sealed trait CompetitorSide extends EnumEntry with Camelcase
object CompetitorSide extends Enum[CompetitorSide] with CirceEnum[CompetitorSide] {
  override def values: immutable.IndexedSeq[CompetitorSide] = findValues

  final case object Home extends CompetitorSide
  final case object Away extends CompetitorSide

  implicit val toSharedCompetitorSideTransformer: Transformer[CompetitorSide, shared.CompetitorSide] = {
    case Home => shared.CompetitorSide.Home
    case Away => shared.CompetitorSide.Away
  }
}

final case class Competitor(id: CompetitorId, name: CompetitorName, homeAway: CompetitorSide)
object Competitor {
  implicit val decoder: Decoder[Competitor] = deriveConfiguredDecoder[Competitor]

  implicit val toSharedCompetitorTransformer: Transformer[Competitor, shared.Competitor] =
    Transformer
      .define[Competitor, shared.Competitor]
      .withFieldComputed(_.namespacedId, _.id.namespaced)
      .withFieldComputed(_.name, _.name.value)
      .withFieldRenamed(_.homeAway, _.side)
      .buildTransformer

}
