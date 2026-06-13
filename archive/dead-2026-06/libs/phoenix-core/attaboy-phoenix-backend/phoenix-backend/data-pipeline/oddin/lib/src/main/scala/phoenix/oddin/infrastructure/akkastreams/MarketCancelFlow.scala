package phoenix.oddin.infrastructure.akkastreams
import akka.stream.scaladsl.Flow

import phoenix.core.TimeUtils._
import phoenix.dataapi.internal.oddin.MarketCancelEvent
import phoenix.oddin.domain.OddinMarketId
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.OddinStreamingApi.CorrelationId
import phoenix.oddin.domain.OddinStreamingApi.MarketCancelFlow
import phoenix.oddin.domain.OddinStreamingApi.MarketCancelMessage
import phoenix.oddin.domain.OddinStreamingApi.ReceivedAt
import phoenix.oddin.domain.VoidReason
import phoenix.oddin.domain.marketCancel.Market

object MarketCancelFlow {

  final case class MarketCancelFlowElement(
      correlationId: CorrelationId,
      receivedAt: ReceivedAt,
      sportEventId: OddinSportEventId,
      market: Market)

  def apply(): MarketCancelFlow = {
    Flow[MarketCancelMessage].mapConcat(flowEventsForMarkets).map(elem => buildMarketCancelEvent(elem))
  }

  private def flowEventsForMarkets(message: MarketCancelMessage): List[MarketCancelFlowElement] =
    message.payload.markets.map { market =>
      MarketCancelFlowElement(message.correlationId, message.receivedAt, message.payload.sportEventId, market)
    }

  private def buildMarketCancelEvent(elem: MarketCancelFlowElement): MarketCancelEvent = {
    val oddinMarketId = OddinMarketId(elem.sportEventId, elem.market.marketDescriptionId, elem.market.marketSpecifiers)
    MarketCancelEvent(
      elem.correlationId.value.toString,
      elem.receivedAt.value.toEpochMilli,
      oddinMarketId.value,
      elem.market.voidReason == VoidReason.Push)
  }
}
