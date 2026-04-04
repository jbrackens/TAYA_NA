package phoenix.oddin.infrastructure.akkastreams

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.stream.scaladsl.Flow
import cats.data.EitherT
import cats.instances.future._
import org.slf4j.LoggerFactory

import phoenix.dataapi.shared.Header
import phoenix.dataapi.shared.MarketChange
import phoenix.dataapi.shared.OddData
import phoenix.dataapi.shared.Specifiers
import phoenix.oddin.OddinConstants
import phoenix.oddin.domain
import phoenix.oddin.domain.CommonOddinStreamingApi.MarketChangeFlow
import phoenix.oddin.domain.OddinStreamingApi._
import phoenix.oddin.domain._
import phoenix.oddin.domain.marketChange.Market
import phoenix.oddin.domain.marketChange.Outcome
import phoenix.oddin.domain.marketDescription.MarketDescription
import phoenix.oddin.infrastructure.xml.SpecifiersKey

object CommonMarketChangeFlow {
  private val log = LoggerFactory.getLogger(getClass)

  final case class OddsChangeFlowEvent(
      correlationId: CorrelationId,
      receivedAt: ReceivedAt,
      sportEventId: OddinSportEventId,
      market: Market)

  def apply(marketDescriptionsRepository: MarketDescriptionsRepository, marketChangeParallelism: Int)(implicit
      system: ActorSystem[_]): MarketChangeFlow = {

    Flow[OddsChangeMessage]
      .mapConcat(flowEventsForMarkets)
      .mapAsync(marketChangeParallelism) { event =>
        buildMarketChange(event, marketDescriptionsRepository).value
      }
      .mapConcat {
        case Right(marketChangedEvent) => List(marketChangedEvent)
        case Left(error) =>
          log.warn(s"failed to process odds change market - '$error'")
          List.empty
      }
      .named(name = "market-change")
  }

  private def buildMarketChange(event: OddsChangeFlowEvent, marketDescriptionsRepository: MarketDescriptionsRepository)(
      implicit as: ActorSystem[_]): EitherT[Future, OddinFlowError, MarketChange] = {
    implicit val ec: ExecutionContext = as.executionContext

    val retrievingMarketDescription = marketDescriptionsRepository
      .find(event.market.marketDescriptionId, event.market.marketSpecifiers)
      .leftMap[OddinFlowError](FailedToRetrieveMarketDescription.apply(_))

    for {
      marketDescription <- retrievingMarketDescription
      marketType <- marketTypeFromMarketDescription(marketDescription)
    } yield MarketChange(
      Header(event.correlationId.value.toString, event.receivedAt.value.toInstant, "oddin"),
      event.sportEventId.namespacedPhoenixFixtureId.value,
      phoenix.dataapi.shared.Market(
        OddinMarketId(event.sportEventId, event.market.marketDescriptionId, event.market.marketSpecifiers).namespaced,
        event.market.marketSpecifiers.formatMarketName(marketDescription.marketDescriptionName.value),
        toMarketStatus(event.market.marketStatus.entryName),
        marketType.entryName,
        Some(MarketCategory.fromMarketDescription(marketDescription, event.market.marketSpecifiers).value),
        extractSpecifiers(event.market.marketSpecifiers.specifiersMap),
        event.market.marketOutcomes.map(toOddData(marketDescription))))
  }

  private def toOddData(marketDescription: MarketDescription)(outcome: Outcome): OddData = {
    OddData(
      outcome.id.value.toString,
      outcomeDescriptionForId(outcome.id, marketDescription).outcomeName.value,
      outcome.odds.map(_.value.value.toString),
      outcome.active.toBoolean)
  }

  private def toMarketStatus(oddinStatus: String) =
    oddinStatus.toLowerCase match {
      case OddinConstants.Active      => phoenix.dataapi.shared.MarketStatus.Bettable
      case OddinConstants.HandedOver  => phoenix.dataapi.shared.MarketStatus.Bettable
      case OddinConstants.Suspended   => phoenix.dataapi.shared.MarketStatus.NotBettable
      case OddinConstants.Deactivated => phoenix.dataapi.shared.MarketStatus.Cancelled
      case status =>
        val message = s"Received unexpected status in MarketChange flow - '$status'"
        log.error(message)
        throw new RuntimeException(message)
    }

  private def extractSpecifiers(spec: Map[String, String]): Specifiers = {
    val value =
      Seq(SpecifiersKey.Threshold, SpecifiersKey.Handicap, SpecifiersKey.Side, SpecifiersKey.Round, SpecifiersKey.Time)
        .flatMap(spec.get)
        .headOption
    val map = spec.get(SpecifiersKey.Map)
    val unit = spec.get(SpecifiersKey.TimeUnit)

    Specifiers(value, map, unit)
  }

  private def flowEventsForMarkets(message: OddsChangeMessage): List[OddsChangeFlowEvent] =
    message.payload.marketChange.markets.map { market =>
      OddsChangeFlowEvent(message.correlationId, message.receivedAt, message.payload.marketChange.sportEventId, market)
    }

  private def marketTypeFromMarketDescription(marketDescription: MarketDescription)(implicit
      ec: ExecutionContext): EitherT[Future, OddinFlowError, MarketType] =
    EitherT
      .fromEither(MarketType.forMarketDescriptionName(marketDescription.marketDescriptionName))
      .leftMap[OddinFlowError](FailedToParseMarketDescription.apply(_))

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
