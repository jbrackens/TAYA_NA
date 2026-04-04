package phoenix.oddin.infrastructure.akkastreams

import akka.stream.scaladsl.Flow

import phoenix.dataapi.shared
import phoenix.dataapi.shared._
import phoenix.oddin.domain.CommonOddinStreamingApi.MarketSettlementFlow
import phoenix.oddin.domain.OddinMarketId
import phoenix.oddin.domain.OddinSportEventId
import phoenix.oddin.domain.OddinStreamingApi.CorrelationId
import phoenix.oddin.domain.OddinStreamingApi.MarketSettlementMessage
import phoenix.oddin.domain.OddinStreamingApi.ReceivedAt
import phoenix.oddin.domain.marketSettlement.Market
import phoenix.oddin.domain.marketSettlement.Result.Lost
import phoenix.oddin.domain.marketSettlement.Result.Won
import phoenix.oddin.domain.marketSettlement.{Result => OddinResult}

object CommonMarketSettlementFlow {

  case class MarketSettlementFlowElement(
      correlationId: CorrelationId,
      receivedAtUtc: ReceivedAt,
      sportEventId: OddinSportEventId,
      market: Market)

  def apply(): MarketSettlementFlow =
    Flow[MarketSettlementMessage].mapConcat(flowEventsForMarkets).map(elem => buildFixtureResult(elem))

  private def flowEventsForMarkets(message: MarketSettlementMessage): List[MarketSettlementFlowElement] =
    message.payload.markets.map { market =>
      MarketSettlementFlowElement(message.correlationId, message.receivedAt, message.payload.sportEventId, market)
    }

  private def buildFixtureResult(flowElement: MarketSettlementFlowElement): shared.FixtureResult = {
    val oddinMarketId =
      OddinMarketId(
        flowElement.sportEventId,
        flowElement.market.marketDescriptionId,
        flowElement.market.marketSpecifiers)

    shared.FixtureResult(
      header = Header(flowElement.correlationId.value.toString, flowElement.receivedAtUtc.value.toInstant, "oddin"),
      namespacedMarketId = oddinMarketId.namespaced,
      flowElement.market.marketOutcomes.map { outcome =>
        shared.SelectionResult(outcome.outcomeId.value.toString, toSharedResult(outcome.result))
      })
  }

  private def toSharedResult(result: OddinResult): shared.Result =
    result match {
      case Won  => shared.Result.Winner
      case Lost => shared.Result.Loser
    }
}
