package phoenix.suppliers.common

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.ClosedShape
import akka.stream.RestartSettings
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.GraphDSL
import akka.stream.scaladsl.RestartFlow
import akka.stream.scaladsl.RunnableGraph
import akka.stream.scaladsl.Sink
import cats.data.EitherT
import cats.data.Validated
import cats.instances.future._
import cats.syntax.applicativeError._
import cats.syntax.apply._
import cats.syntax.either._
import org.slf4j.LoggerFactory

import phoenix.betgenius.infrastructure.BetgeniusIngestSource
import phoenix.core.ScalaObjectUtils._
import phoenix.core.TimeUtils._
import phoenix.dataapi.shared
import phoenix.dataapi.shared.Competitor
import phoenix.dataapi.shared.FixtureChange
import phoenix.dataapi.shared.FixtureResult
import phoenix.dataapi.shared.MarketChange
import phoenix.dataapi.shared.MatchStatusUpdate
import phoenix.dataapi.shared.Result
import phoenix.dataapi.shared.SelectionResult
import phoenix.markets
import phoenix.markets.CommonUpdateMarketRequest
import phoenix.markets.LifecycleChangeReason.DataSupplierCancellation
import phoenix.markets.LifecycleChangeReason.DataSupplierPush
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MapSpecifier
import phoenix.markets.MarketVisibility
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.DuplicateCancelMarketEvent
import phoenix.markets.MarketsBoundedContext.DuplicateSettleMarketEvent
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.UnitSpecifier
import phoenix.markets.UpdateFixtureRequest
import phoenix.markets.UpdateMatchStatusRequest
import phoenix.markets.ValueSpecifier
import phoenix.markets.domain.MarketType
import phoenix.markets.sports
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.markets.sports.SportProtocol.Commands.MatchScore
import phoenix.oddin.infrastructure.FlowConfig
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.suppliers.oddin.PhoenixOddinFlows.CommonMarketCancelFlow
import phoenix.suppliers.oddin.PhoenixOddinFlows.FailedToSettleMarket
import phoenix.suppliers.oddin.PhoenixOddinFlows.InvalidMarket
import phoenix.suppliers.oddin.PhoenixOddinFlows.NoWinningSelectionId
import phoenix.suppliers.oddin.PhoenixOddinFlows.PhoenixOddinFlowError
import phoenix.suppliers.oddin.PhoenixOddinFlows.TooManyWinningSelections
import phoenix.suppliers.oddin.PhoenixOddinFlows.toMarketLifecycle
import phoenix.suppliers.oddin.PhoenixOddinFlows.toSelectionOdds

object PhoenixSharedFlows {

  private val log = LoggerFactory.getLogger(this.objectName)

  private val streamLoggerName = "PhoenixSharedStreamConsumer"

  type FixtureChangeFlow = Flow[FixtureChange, Unit, NotUsed]
  type MarketChangeFlow = Flow[MarketChange, Unit, NotUsed]
  type FixtureResultFlow = Flow[FixtureResult, Unit, NotUsed]
  type MatchStatusUpdateFlow = Flow[MatchStatusUpdate, Unit, NotUsed]

  case class MatchStatusUpdateError(reason: String)

  def buildCommonPipeline(
      settings: OddinConfig,
      streamSource: BetgeniusIngestSource.StreamSource,
      marketsContext: MarketsBoundedContext)(implicit ec: ExecutionContext) = {

    RunnableGraph.fromGraph(GraphDSL.create() { implicit builder: GraphDSL.Builder[NotUsed] =>
      import GraphDSL.Implicits._

      val source = builder.add(streamSource)

      val fixtureChanged = builder.add(fixtureChangedFlow(settings.marketFlow, marketsContext).log(streamLoggerName))
      val marketChanged = builder.add(marketChangedFlow(settings.marketFlow, marketsContext).log(streamLoggerName))
      val fixtureResult = builder.add(fixtureResultFlow(settings.marketFlow, marketsContext).log(streamLoggerName))
      val marketStatusUpdated =
        builder.add(matchStatusUpdatedFlow(settings.marketFlow, marketsContext).log(streamLoggerName))

      // @formatter:off
      source.fixtureChangeOut     ~> fixtureChanged      ~> Sink.ignore
      source.marketChangeOut      ~> marketChanged       ~> Sink.ignore
      source.fixtureResultOut     ~> fixtureResult       ~> Sink.ignore
      source.matchStatusUpdateOut ~> marketStatusUpdated ~> Sink.ignore
      // @formatter:on

      ClosedShape
    })
  }

  def fixtureChangedFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): FixtureChangeFlow =
    RestartFlow.onFailuresWithBackoff(toRestartSettings(config)) { () =>
      Flow[FixtureChange].mapAsync(config.contextAskParallelism) { fixtureChange =>
        val result = for {
          request <- EitherT.fromEither(toUpdateFixtureRequest(fixtureChange).toEither).leftMap(new Exception(_))
          result <- EitherT(marketsContext.createOrUpdateFixture(request).attempt)
        } yield result

        result.fold(
          error => log.error(s"Failed to update Fixture from message: $fixtureChange, error='$error'"),
          _ => ())
      }
    }

  private def toUpdateFixtureRequest(fixtureChange: FixtureChange) = {
    (
      SportId
        .parse(fixtureChange.sport.namespacedId)
        .andThen(externalSportId =>
          Validated.fromOption(SportMapper.fromExternalSportId(externalSportId), "Could not map external sport id")),
      TournamentId.parse(fixtureChange.competition.namespacedId),
      FixtureId.parse(fixtureChange.namespacedId)).mapN {
      case (sportId, tournamentId, fixtureId) =>
        val correlationId = fixtureChange.header.correlationId
        val receivedAtUtc = fixtureChange.header.receivedAtUtc.toUtcOffsetDateTime
        val sportName = fixtureChange.sport.name
        val sportAbbreviation = fixtureChange.sport.abbreviation
        val tournamentName = fixtureChange.competition.name
        // this is incorrect but will do for now. Tournament start time will be removed
        val tournamentStartTime = fixtureChange.startTimeUtc.toUtcOffsetDateTime
        val fixtureName = fixtureChange.name
        val startTime = fixtureChange.startTimeUtc.toUtcOffsetDateTime
        val competitors = fixtureChange.competitors.map(toCompetitor).toSet
        val fixtureStatus = fixtureChange.status

        UpdateFixtureRequest(
          correlationId,
          receivedAtUtc,
          sportId,
          sportName,
          sportAbbreviation,
          tournamentId,
          tournamentName,
          tournamentStartTime,
          fixtureId,
          fixtureName,
          startTime,
          competitors,
          currentScore = None,
          FixtureLifecycleStatus.fromSharedFixtureStatus(fixtureStatus))
    }
  }

  def marketChangedFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): MarketChangeFlow =
    RestartFlow.onFailuresWithBackoff(toRestartSettings(config)) { () =>
      Flow[MarketChange].mapAsync(config.contextAskParallelism) { marketChange =>
        val result = for {
          request <- EitherT.fromEither(toCommonUpdateMarketRequest(marketChange).toEither).leftMap(new Exception(_))
          result <- EitherT(marketsContext.createOrUpdateMarket(request).attempt)
        } yield result
        result.fold(
          error => log.error(s"Failed to update Market from transformed shared message: $marketChange, error='$error'"),
          _ => ())
      }
    }

  def fixtureResultFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): FixtureResultFlow = {

    RestartFlow.onFailuresWithBackoff(toRestartSettings(config)) { () =>
      Flow[FixtureResult].mapAsync(config.contextAskParallelism) { fixtureResult =>
        val result = for {
          marketId <-
            EitherT
              .fromEither(MarketId.parse(fixtureResult.namespacedMarketId).toEither)
              .leftMap(error => InvalidMarket(fixtureResult.namespacedMarketId, error))
          _ = log.info(s"Settling market $marketId")
          result <- settleMarket(marketsContext, marketId, fixtureResult.results)
        } yield result
        result.fold(
          {
            case FailedToSettleMarket(DuplicateSettleMarketEvent(_, _)) =>
              log.info(s"Market already settled, ignoring message: $fixtureResult")
            case error =>
              log.error(s"Failed to settle market from message: $fixtureResult, error='$error'")
          },
          _ => ())
      }
    }
  }

  def marketCancelFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): CommonMarketCancelFlow =
    RestartFlow.onFailuresWithBackoff(toRestartSettings(config)) { () =>
      Flow[shared.MarketCancel].mapAsync(config.contextAskParallelism) { marketCancel =>
        val marketId = MarketId.unsafeParse(marketCancel.namespacedMarketId)
        val reason =
          if (marketCancel.isPush) DataSupplierPush()
          else DataSupplierCancellation("BetCancel")

        log.info(s"Cancelling market $marketId because $reason")

        marketsContext
          .cancelMarket(marketId, reason)
          .fold(
            {
              case DuplicateCancelMarketEvent(_) =>
                log.info(s"Market already cancelled, ignoring message: $marketCancel")
              case error =>
                log.error(s"Failed to cancel market from message: $marketCancel, error='$error'")
            },
            _ => ())
      }
    }

  private[this] def toCommonUpdateMarketRequest(event: MarketChange): Validated[String, CommonUpdateMarketRequest] = {
    (FixtureId.parse(event.namespacedFixtureId), MarketId.parse(event.market.namespacedId)).mapN {
      case (validFixtureId, validMarketId) =>
        CommonUpdateMarketRequest(
          event.header.correlationId,
          event.header.receivedAtUtc.toUtcOffsetDateTime,
          validFixtureId,
          validMarketId,
          event.market.name,
          MarketType
            .withNameOption(event.market.`type`)
            .getOrElse(throw new RuntimeException(s"Market type not found: ${event.market.`type`}")),
          event.market.category.map(markets.MarketCategory),
          toMarketLifecycle(event.market.status),
          markets.MarketSpecifiers(
            event.market.specifiers.value.map(ValueSpecifier),
            event.market.specifiers.map.map(MapSpecifier),
            event.market.specifiers.unit.map(UnitSpecifier)),
          event.market.odds.map(toSelectionOdds))
    }
  }

  private[this] def toRestartSettings(config: FlowConfig): RestartSettings =
    RestartSettings(
      minBackoff = config.restartMinBackoff,
      maxBackoff = config.restartMaxBackoff,
      randomFactor = config.restartRandomFactor)
      .withMaxRestarts(count = config.maxRestarts, within = config.restartMinBackoff)

  private[this] def toCompetitor(competitor: Competitor): sports.Competitor =
    sports.Competitor(CompetitorId.unsafeParse(competitor.namespacedId), competitor.name, competitor.side.name())

  private[this] def settleMarket(
      marketsContext: MarketsBoundedContext,
      marketId: MarketId,
      outcomes: Seq[SelectionResult])(implicit ec: ExecutionContext): EitherT[Future, PhoenixOddinFlowError, Unit] = {

    val winningSelectionId: Either[PhoenixOddinFlowError, SelectionId] =
      outcomes.filter(_.result == Result.Winner) match {
        case Nil         => Left(NoWinningSelectionId(marketId))
        case head :: Nil => Right(head.selectionId)
        case list =>
          val winningSelectionIds = list.map(_.selectionId).toSet
          Left(TooManyWinningSelections(marketId, winningSelectionIds))
      }

    EitherT.fromEither(winningSelectionId).flatMap { selectionId =>
      marketsContext.settleMarket(marketId, selectionId, DataSupplierStatusChange).leftMap(FailedToSettleMarket)
    }
  }

  def matchStatusUpdatedFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): MatchStatusUpdateFlow =
    RestartFlow.onFailuresWithBackoff(toRestartSettings(config)) { () =>
      Flow[MatchStatusUpdate].mapAsync(config.contextAskParallelism) { event =>
        val response = for {
          request <- toUpdateMatchStatusRequest(event, marketsContext)
          updateResponse <- marketsContext.updateMatchStatus(request).leftMap(ex => MatchStatusUpdateError(s"$ex"))
        } yield updateResponse

        response.value.map(
          _.fold(error => log.error(s"Failed to update Match status from Oddin message, error='$error'"), _ => ()))
      }
    }

  private def toUpdateMatchStatusRequest(matchStatusUpdate: MatchStatusUpdate, marketsContext: MarketsBoundedContext)(
      implicit ec: ExecutionContext): EitherT[Future, MatchStatusUpdateError, UpdateMatchStatusRequest] = {
    for {
      fixtureId <-
        EitherT
          .fromEither(FixtureId.parse(matchStatusUpdate.namespacedFixtureId).toEither)
          .leftMap(error =>
            MatchStatusUpdateError(s"Failed to parse fixture id ${matchStatusUpdate.namespacedFixtureId}: $error"))
      fixtureData <-
        marketsContext
          .getFixtureDetails(fixtureId, MarketVisibility.values.toSet)
          .leftMap(ex => MatchStatusUpdateError(s"Failed to retrieve fixture $fixtureId: $ex"))
      sportId = fixtureData.sport.sportId
      request <- createUpdateMatchStatusRequest(fixtureId, sportId, matchStatusUpdate)
    } yield request
  }

  private def createUpdateMatchStatusRequest(
      fixtureId: FixtureId,
      sportId: SportId,
      matchStatusUpdate: MatchStatusUpdate)(implicit
      ec: ExecutionContext): EitherT[Future, MatchStatusUpdateError, UpdateMatchStatusRequest] =
    EitherT.fromEither(
      Either
        .catchOnly[NumberFormatException](UpdateMatchStatusRequest(
          matchStatusUpdate.header.correlationId,
          matchStatusUpdate.header.receivedAtUtc.toUtcOffsetDateTime,
          sportId,
          (matchStatusUpdate.score.map(_.home.toInt), matchStatusUpdate.score.map(_.away.toInt)).mapN { (home, away) =>
            MatchScore(home, away)
          },
          fixtureId,
          FixtureLifecycleStatus.fromSharedFixtureStatus(matchStatusUpdate.matchStatus)))
        .leftMap(ex => MatchStatusUpdateError(s"Failed to map score: $ex")))

}
