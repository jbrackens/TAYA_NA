package phoenix.oddin.infrastructure.akkastreams

import akka.stream.scaladsl.Flow

import phoenix.dataapi.shared.Header
import phoenix.dataapi.shared.MarketCancel
import phoenix.oddin.domain.CommonOddinStreamingApi.MarketCancelFlow
import phoenix.oddin.domain.OddinMarketId
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.OddinStreamingApi.CorrelationId
import phoenix.oddin.domain.OddinStreamingApi.MarketCancelMessage
import phoenix.oddin.domain.OddinStreamingApi.ReceivedAt
import phoenix.oddin.domain.VoidReason
import phoenix.oddin.domain.marketCancel.Market

object CommonMarketCancelFlow {

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

  private def buildMarketCancelEvent(elem: MarketCancelFlowElement): MarketCancel = {
    val oddinMarketId = OddinMarketId(elem.sportEventId, elem.market.marketDescriptionId, elem.market.marketSpecifiers)
    MarketCancel(
      Header(elem.correlationId.value.toString, elem.receivedAt.value.toInstant, "oddin"),
      oddinMarketId.namespaced,
      elem.market.voidReason == VoidReason.Push)
  }

}
