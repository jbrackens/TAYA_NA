package phoenix.oddin.domain

import java.time.OffsetDateTime
import java.util.UUID

import akka.NotUsed
import akka.stream.ClosedShape
import akka.stream.Graph
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.stream.scaladsl.SourceQueue

import phoenix.dataapi.internal.oddin.FixtureChangedEvent
import phoenix.dataapi.internal.oddin.MarketCancelEvent
import phoenix.dataapi.internal.phoenix.MarketChangedEvent
import phoenix.dataapi.internal.phoenix.MarketSettlementEvent
import phoenix.oddin.domain.MarketDescriptionsRepository.UnableToFindMarketDescription
import phoenix.oddin.domain.fixtureChange.FixtureChange
import phoenix.oddin.domain.marketCancel.MarketCancel
import phoenix.oddin.domain.marketSettlement.MarketSettlement
import phoenix.oddin.domain.oddsChange.OddsChange
import phoenix.oddin.domain.tournamentChange.TournamentChange

trait OddinStreamingApi {

  def buildRunnableGraph[M1, M2, M3, M4](
      oddsChangeEventBuilderParallelism: Int,
      fixtureChangeEventBuilderParallelism: Int,
      oddsChangeSink: Sink[MarketChangedEvent, M1],
      fixtureChangeSink: Sink[FixtureChangedEvent, M2],
      marketSettlementSink: Sink[MarketSettlementEvent, M3],
      marketCancelSink: Sink[MarketCancelEvent, M4]): Graph[ClosedShape, (M1, M2, M3, M4)]
}

object OddinStreamingApi {

  final case class CorrelationId(value: UUID)
  object CorrelationId {
    def random(): CorrelationId =
      CorrelationId(UUID.randomUUID())

    def fromUUID(uuid: UUID): CorrelationId =
      CorrelationId(uuid)
  }

  final case class ReceivedAt(value: OffsetDateTime)

  final case class OddinMessage[T](correlationId: CorrelationId, receivedAt: ReceivedAt, payload: T)

  type OddsChangeMessage = OddinMessage[OddsChange]
  type FixtureChangeMessage = OddinMessage[FixtureChange]
  type TournamentChangeMessage = OddinMessage[TournamentChange]
  type MarketSettlementMessage = OddinMessage[MarketSettlement]
  type MarketCancelMessage = OddinMessage[MarketCancel]

  type OddinMessageQueue[T] = SourceQueue[OddinMessage[T]]
  type OddsChangeQueue = OddinMessageQueue[OddsChange]
  type FixtureChangeQueue = OddinMessageQueue[FixtureChange]
  type MarketSettlementQueue = OddinMessageQueue[MarketSettlement]
  type MarketCancelQueue = OddinMessageQueue[MarketCancel]

  type OddinMessageSource[T] = Source[T, NotUsed]
  type MarketChangeSource = OddinMessageSource[MarketChangedEvent]
  type FixtureChangeSource = OddinMessageSource[FixtureChangedEvent]
  type MarketSettlementSource = OddinMessageSource[MarketSettlementEvent]
  type MarketCancelSource = OddinMessageSource[MarketCancelEvent]

  type OddinMessageFlow[IN, OUT] = Flow[OddinMessage[IN], OUT, NotUsed]
  type OddsChangeFlow = OddinMessageFlow[OddsChange, MarketChangedEvent]
  type FixtureChangeFlow = OddinMessageFlow[FixtureChange, FixtureChangedEvent]
  type MarketSettlementFlow = OddinMessageFlow[MarketSettlement, MarketSettlementEvent]
  type MarketCancelFlow = OddinMessageFlow[MarketCancel, MarketCancelEvent]

  sealed trait OddinFlowError
  case class FailedToRetrieveMarketDescription(cause: UnableToFindMarketDescription) extends OddinFlowError
  case class FailedToParseMarketDescription(cause: UnableToMatchMarketDescription) extends OddinFlowError
}
