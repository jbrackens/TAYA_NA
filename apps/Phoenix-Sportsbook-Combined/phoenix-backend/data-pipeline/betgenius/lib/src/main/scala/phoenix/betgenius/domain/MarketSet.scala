package phoenix.betgenius.domain

import java.time.OffsetDateTime

import enumeratum.EnumEntry.Camelcase
import enumeratum._
import io.circe.Decoder
import io.circe.generic.extras.ConfiguredJsonCodec
import io.circe.generic.extras.semiauto._
import io.scalaland.chimney.Transformer

import phoenix.betgenius.domain._
import phoenix.dataapi.shared.MarketStatus
import phoenix.dataapi.shared.OddData

@ConfiguredJsonCodec(decodeOnly = true)
case class MarketSet(fixtureId: FixtureId, markets: Seq[Market])

final case class MarketId(value: Int) extends BetgeniusId {
  override val prefix: String = "m"
}
object MarketId {
  implicit val decoder: Decoder[MarketId] = deriveUnwrappedDecoder
}

final case class MarketName(value: String)
object MarketName {
  implicit val decoder: Decoder[MarketName] = deriveUnwrappedDecoder
}

@ConfiguredJsonCodec(decodeOnly = true)
case class Market(
    id: MarketId,
    expiryUtc: OffsetDateTime,
    inPlay: Boolean,
    marketType: MarketType,
    name: MarketName,
    selections: Seq[Selection],
    handicap: Option[String],
    tradingStatus: TradingStatus)

final case class MarketTypeId(value: Int)
object MarketTypeId {
  implicit val decoder: Decoder[MarketTypeId] = deriveUnwrappedDecoder
}

final case class MarketTypeName(value: String)
object MarketTypeName {
  implicit val decoder: Decoder[MarketTypeName] = deriveUnwrappedDecoder
}

@ConfiguredJsonCodec(decodeOnly = true)
case class MarketType(id: MarketTypeId, name: MarketTypeName)

final case class SelectionId(value: Int) extends BetgeniusId {
  override val prefix: String = "sn"
}
object SelectionId {
  implicit val decoder: Decoder[SelectionId] = deriveUnwrappedDecoder
}

final case class Denominator(value: Int)
object Denominator {
  implicit val decoder: Decoder[Denominator] = deriveUnwrappedDecoder
}

final case class Numerator(value: Int)
object Numerator {
  implicit val decoder: Decoder[Numerator] = deriveUnwrappedDecoder
}

final case class DecimalOdds(value: BigDecimal)
object DecimalOdds {
  implicit val decoder: Decoder[DecimalOdds] = deriveUnwrappedDecoder
}

@ConfiguredJsonCodec(decodeOnly = true)
case class Outcome(id: Int, name: String)

@ConfiguredJsonCodec(decodeOnly = true)
case class Range(low: String, high: String)

@ConfiguredJsonCodec(decodeOnly = true)
case class Selection(
    id: SelectionId,
    competitorId: CompetitorId,
    decimal: DecimalOdds,
    denominator: Denominator,
    numerator: Numerator,
    outcome: Option[Outcome],
    range: Option[Range],
    tradingStatus: SelectionStatus)

object Selection {
  implicit val toOddsTransformer: Transformer[Selection, OddData] =
    Transformer
      .define[Selection, OddData]
      .withFieldComputed(_.selectionName, extractSelectionName)
      .withFieldComputed(_.active, _.tradingStatus == SelectionStatus.Trading)
      .withFieldComputed(_.odds, o => Some(o.decimal.value.toString))
      .withFieldComputed(_.id, _.id.namespaced)
      .buildTransformer

  private def extractSelectionName(selection: Selection): String =
    selection.outcome
      .map(_.name)
      .orElse(selection.range.map(r => s"${r.low}:${r.high}"))
      .getOrElse(throw new RuntimeException(s"Cannot create selection name for selection ${selection.id}"))
}

sealed trait TradingStatus extends EnumEntry with Camelcase
object TradingStatus extends Enum[TradingStatus] with CirceEnum[TradingStatus] {
  override def values: IndexedSeq[TradingStatus] = findValues

  final case object Open extends TradingStatus
  final case object Suspended extends TradingStatus
  final case object Closed extends TradingStatus

  implicit val toMarketStatusTransformer: Transformer[TradingStatus, MarketStatus] = {
    case Open      => MarketStatus.Bettable
    case Suspended => MarketStatus.NotBettable
    case Closed    => MarketStatus.NotBettable
  }

}

sealed trait SelectionStatus extends EnumEntry with Camelcase
object SelectionStatus extends Enum[SelectionStatus] with CirceEnum[SelectionStatus] {
  override def values: IndexedSeq[SelectionStatus] = findValues

  final case object Unpriced extends SelectionStatus
  final case object Trading extends SelectionStatus
  final case object Suspended extends SelectionStatus
  final case object NonRunner extends SelectionStatus
}
