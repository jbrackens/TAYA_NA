package phoenix.oddin.domain
import akka.stream.ClosedShape
import akka.stream.Graph
import akka.stream.scaladsl.Sink

import phoenix.dataapi.internal.oddin.FixtureChangedEvent
import phoenix.dataapi.internal.oddin.MarketCancelEvent
import phoenix.dataapi.internal.phoenix.MarketChangedEvent
import phoenix.dataapi.internal.phoenix.MarketSettlementEvent
import phoenix.dataapi.shared
import phoenix.dataapi.shared.MarketChange
import phoenix.oddin.domain.MarketDescriptionsRepository.UnableToFindMarketDescription
import phoenix.oddin.domain.fixtureChange.FixtureChange
import phoenix.oddin.domain.marketCancel.MarketCancel
import phoenix.oddin.domain.marketSettlement.MarketSettlement
import phoenix.oddin.domain.oddsChange.OddsChange

trait CommonOddinStreamingApi {

  def buildRunnableGraph[M1, M2, M3, M4, M5](
      oddsChangeEventBuilderParallelism: Int,
      fixtureChangeEventBuilderParallelism: Int,
      marketChangeSink: Sink[MarketChange, M1],
      fixtureChangeSink: Sink[shared.FixtureChange, M2],
      marketSettlementSink: Sink[shared.FixtureResult, M3],
      marketCancelSink: Sink[shared.MarketCancel, M4],
      matchStatusUpdateSink: Sink[shared.MatchStatusUpdate, M5]): Graph[ClosedShape, (M1, M2, M3, M4, M5)]
}

object CommonOddinStreamingApi {

  type MarketChangeSource = OddinStreamingApi.OddinMessageSource[MarketChangedEvent]
  type FixtureChangeSource = OddinStreamingApi.OddinMessageSource[FixtureChangedEvent]
  type MarketSettlementSource = OddinStreamingApi.OddinMessageSource[MarketSettlementEvent]
  type MarketCancelSource = OddinStreamingApi.OddinMessageSource[MarketCancelEvent]

  type MarketChangeFlow = OddinStreamingApi.OddinMessageFlow[OddsChange, shared.MarketChange]
  type FixtureChangeFlow = OddinStreamingApi.OddinMessageFlow[FixtureChange, shared.FixtureChange]
  type MarketSettlementFlow = OddinStreamingApi.OddinMessageFlow[MarketSettlement, shared.FixtureResult]
  type MarketCancelFlow = OddinStreamingApi.OddinMessageFlow[MarketCancel, shared.MarketCancel]
  type MatchStatusUpdateFlow = OddinStreamingApi.OddinMessageFlow[OddsChange, shared.MatchStatusUpdate]

  sealed trait OddinFlowError
  case class FailedToRetrieveMarketDescription(cause: UnableToFindMarketDescription) extends OddinFlowError
  case class FailedToParseMarketDescription(cause: UnableToMatchMarketDescription) extends OddinFlowError
}
