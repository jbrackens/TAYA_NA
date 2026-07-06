package phoenix.oddin.infrastructure.akkastreams
import akka.stream.scaladsl.Flow

import phoenix.core.TimeUtils._
import phoenix.dataapi.internal.phoenix.MarketSettlementEvent
import phoenix.dataapi.internal.phoenix.SelectionResult
import phoenix.oddin.domain.OddinMarketId
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.OddinStreamingApi.CorrelationId
import phoenix.oddin.domain.OddinStreamingApi.MarketSettlementFlow
import phoenix.oddin.domain.OddinStreamingApi.MarketSettlementMessage
import phoenix.oddin.domain.OddinStreamingApi.ReceivedAt
import phoenix.oddin.domain.marketSettlement.Market
import phoenix.oddin.domain.marketSettlement.Outcome

object MarketSettlementFlow {

  case class MarketSettlementFlowElement(
      correlationId: CorrelationId,
      receivedAtUtc: ReceivedAt,
      sportEventId: OddinSportEventId,
      market: Market)

  def apply(): MarketSettlementFlow = {
    Flow[MarketSettlementMessage].mapConcat(flowEventsForMarkets).map(elem => buildMarketSettlementEvent(elem))
  }

  private def flowEventsForMarkets(message: MarketSettlementMessage): List[MarketSettlementFlowElement] =
    message.payload.markets.map { market =>
      MarketSettlementFlowElement(message.correlationId, message.receivedAt, message.payload.sportEventId, market)
    }

  private def buildMarketSettlementEvent(flowElement: MarketSettlementFlowElement): MarketSettlementEvent = {
    val oddinMarketId =
      OddinMarketId(
        flowElement.sportEventId,
        flowElement.market.marketDescriptionId,
        flowElement.market.marketSpecifiers)

    MarketSettlementEvent(
      flowElement.correlationId.value.toString,
      flowElement.receivedAtUtc.value.toEpochMilli,
      oddinMarketId.value,
      flowElement.market.marketOutcomes.map(toOutcome))
  }

  private def toOutcome(outcome: Outcome): SelectionResult =
    SelectionResult(outcome.outcomeId.value, outcome.result.entryName)
}
