package phoenix.oddin.infrastructure.akkastreams

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.stream.scaladsl.Flow
import cats.data.EitherT
import cats.instances.future._
import org.slf4j.LoggerFactory

import phoenix.dataapi.internal.phoenix.MarketChangedEvent
import phoenix.dataapi.internal.phoenix.SelectionOdds
import phoenix.oddin.domain
import phoenix.oddin.domain.OddinStreamingApi._
import phoenix.oddin.domain._
import phoenix.oddin.domain.marketChange.Market
import phoenix.oddin.domain.marketChange.Outcome
import phoenix.oddin.domain.marketDescription.MarketDescription

object OddsChangeFlow {
  private val log = LoggerFactory.getLogger(getClass)

  final case class OddsChangeFlowEvent(
      correlationId: CorrelationId,
      receivedAt: ReceivedAt,
      sportEventId: OddinSportEventId,
      market: Market)

  def apply(marketDescriptionsRepository: MarketDescriptionsRepository, marketChangeParallelism: Int)(implicit
      system: ActorSystem[_]): OddsChangeFlow = {
    implicit val ec = system.executionContext

    Flow[OddsChangeMessage]
      .mapConcat(flowEventsForMarkets)
      .mapAsync(marketChangeParallelism)(evt => buildMarketChangedEvent(evt, marketDescriptionsRepository).value)
      .mapConcat {
        case Right(marketChangedEvent) => List(marketChangedEvent)
        case Left(error) =>
          log.warn(s"failed to process odds change market - '$error'")
          List.empty
      }
      .named(name = "odds-change")
  }

  private def flowEventsForMarkets(message: OddsChangeMessage): List[OddsChangeFlowEvent] =
    message.payload.marketChange.markets.map { market =>
      OddsChangeFlowEvent(message.correlationId, message.receivedAt, message.payload.marketChange.sportEventId, market)
    }

  private def buildMarketChangedEvent(
      flowEvent: OddsChangeFlowEvent,
      marketDescriptionsRepository: MarketDescriptionsRepository)(implicit
      ec: ExecutionContext): EitherT[Future, OddinFlowError, MarketChangedEvent] = {

    val retrievingMarketDescription = marketDescriptionsRepository
      .find(flowEvent.market.marketDescriptionId, flowEvent.market.marketSpecifiers)
      .leftMap(FailedToRetrieveMarketDescription.apply(_): OddinFlowError)

    val oddinMarketId =
      OddinMarketId(flowEvent.sportEventId, flowEvent.market.marketDescriptionId, flowEvent.market.marketSpecifiers)

    for {
      marketDescription <- retrievingMarketDescription
      marketType <- marketTypeFromMarketDescription(marketDescription)
    } yield MarketChangedEvent(
      correlationId = flowEvent.correlationId.value.toString,
      receivedAtUtc = flowEvent.receivedAt.value.toInstant.toEpochMilli,
      fixtureId = flowEvent.sportEventId.value,
      marketId = oddinMarketId.value,
      marketName = flowEvent.market.marketSpecifiers.formatMarketName(marketDescription.marketDescriptionName.value),
      marketStatus = flowEvent.market.marketStatus.entryName,
      marketType = marketType.entryName,
      marketCategory =
        Some(MarketCategory.fromMarketDescription(marketDescription, flowEvent.market.marketSpecifiers).value),
      marketPriority = flowEvent.market.marketDescriptionId.value,
      marketSpecifiers = flowEvent.market.marketSpecifiers.specifiersMap,
      selectionOdds = toSelectionOdds(flowEvent, marketDescription, PhoenixMarketId(oddinMarketId.value)))
  }

  private def marketTypeFromMarketDescription(marketDescription: MarketDescription)(implicit
      ec: ExecutionContext): EitherT[Future, OddinFlowError, MarketType] =
    EitherT
      .fromEither(MarketType.forMarketDescriptionName(marketDescription.marketDescriptionName))
      .leftMap(FailedToParseMarketDescription.apply(_): OddinFlowError)

  private def toSelectionOdds(
      flowEvent: OddsChangeFlowEvent,
      marketDescription: MarketDescription,
      phoenixMarketId: PhoenixMarketId): Seq[SelectionOdds] =
    flowEvent.market.marketOutcomes.map { outcome =>
      toSelectionOdds(
        flowEvent.correlationId,
        phoenixMarketId,
        outcome,
        outcomeDescriptionForId(outcome.id, marketDescription))
    }

  private def toSelectionOdds(
      correlationId: CorrelationId,
      marketId: PhoenixMarketId,
      outcome: Outcome,
      outcomeDescription: domain.marketDescription.Outcome): SelectionOdds =
    SelectionOdds(
      correlationId.value.toString,
      marketId.value,
      outcome.id.value,
      outcomeDescription.outcomeName.value,
      outcome.odds.map(_.value.value.toString()),
      outcome.active.toBoolean)

  private def outcomeDescriptionForId(
      outcomeId: OutcomeId,
      description: MarketDescription): domain.marketDescription.Outcome =
    description.marketDescriptionOutcomes
      .find(_.outcomeId == outcomeId)
      .getOrElse(throw MissingOutcomeDescriptionException(description.marketDescriptionId, outcomeId))

  case class MissingOutcomeDescriptionException(marketDescriptionId: MarketDescriptionId, outcomeId: OutcomeId)
      extends RuntimeException(
        s"Unable to locate an ${classOf[Outcome].getSimpleName} with id $outcomeId for market description id $marketDescriptionId")
}
