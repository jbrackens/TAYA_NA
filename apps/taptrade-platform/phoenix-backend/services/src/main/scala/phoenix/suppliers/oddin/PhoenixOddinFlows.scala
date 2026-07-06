package phoenix.suppliers.oddin
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream._
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.RestartFlow
import akka.stream.scaladsl.RunnableGraph
import akka.stream.scaladsl.Sink
import cats.data.EitherT
import cats.instances.future._
import cats.syntax.applicativeError._
import org.slf4j.LoggerFactory

import phoenix.core.EnumUtils.EnumOps
import phoenix.core.ScalaObjectUtils._
import phoenix.core.TimeUtils._
import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.dataapi.internal.oddin.FixtureChangedEvent
import phoenix.dataapi.internal.oddin.MarketCancelEvent
import phoenix.dataapi.internal.oddin.MarketChangedEvent
import phoenix.dataapi.internal.phoenix.{MarketChangedEvent => PhoenixMarketChangedEvent}
import phoenix.dataapi.internal.phoenix.{MarketSettlementEvent => PhoenixMarketSettlementEvent}
import phoenix.dataapi.internal.phoenix.{SelectionResult => PhoenixSelectionResult}
import phoenix.dataapi.shared
import phoenix.dataapi.shared.OddData
import phoenix.markets.LifecycleChangeReason.DataSupplierCancellation
import phoenix.markets.LifecycleChangeReason.DataSupplierPush
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.Cancelled
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets._
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.oddin._
import phoenix.oddin.infrastructure.CommonOddinStreams
import phoenix.oddin.infrastructure.FlowConfig
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.oddin.infrastructure.OddinStreams
import phoenix.suppliers.common.PhoenixSharedFlows
import phoenix.suppliers.common.SportMapper

object PhoenixOddinFlows {

  private val log = LoggerFactory.getLogger(this.objectName)

  val streamLoggerName = "OddinStreamConsumer"

  type MarketChangeFlow = Flow[MarketChangedEvent, Unit, NotUsed]
  type PhoenixMarketChangeFlow = Flow[PhoenixMarketChangedEvent, Unit, NotUsed]
  type FixtureChangeFlow = Flow[FixtureChangedEvent, Unit, NotUsed]
  type PhoenixMarketSettlementFlow = Flow[PhoenixMarketSettlementEvent, Unit, NotUsed]
  type MarketCancelFlow = Flow[MarketCancelEvent, Unit, NotUsed]
  type CommonMarketCancelFlow = Flow[shared.MarketCancel, Unit, NotUsed]

  sealed trait PhoenixOddinFlowError

  final case class InvalidMarket(marketId: String, error: String) extends PhoenixOddinFlowError
  final case class NoWinningSelectionId(marketId: MarketId) extends PhoenixOddinFlowError

  final case class TooManyWinningSelections(marketId: MarketId, winningSelectionIds: Set[SelectionId])
      extends PhoenixOddinFlowError

  final case class FailedToSettleMarket(domainError: MarketSettlingError) extends PhoenixOddinFlowError

  def buildOddinPipeline(oddinStreams: OddinStreams, settings: OddinConfig, marketsContext: MarketsBoundedContext)(
      implicit ec: ExecutionContext): RunnableGraph[(NotUsed, NotUsed, NotUsed, NotUsed)] =
    oddinStreams.buildRunnableGraph(
      settings.marketFlow.eventBuilderParallelism,
      settings.fixtureFlow.eventBuilderParallelism,
      phoenixMarketChangedFlow(settings.marketFlow, marketsContext).log(streamLoggerName).to(Sink.ignore),
      fixtureChangedFlow(settings.fixtureFlow, marketsContext).log(streamLoggerName).to(Sink.ignore),
      phoenixSettlementFlow(settings.marketSettlementFlow, marketsContext).log(streamLoggerName).to(Sink.ignore),
      marketCancelFlow(settings.marketCancelFlow, marketsContext).log(streamLoggerName).to(Sink.ignore))

  def buildCommonOddinPipeline(
      oddinStreams: CommonOddinStreams,
      settings: OddinConfig,
      marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): RunnableGraph[(NotUsed, NotUsed, NotUsed, NotUsed, NotUsed)] =
    oddinStreams.buildRunnableGraph(
      settings.marketFlow.eventBuilderParallelism,
      settings.fixtureFlow.eventBuilderParallelism,
      PhoenixSharedFlows.marketChangedFlow(settings.marketFlow, marketsContext).log(streamLoggerName).to(Sink.ignore),
      PhoenixSharedFlows.fixtureChangedFlow(settings.fixtureFlow, marketsContext).log(streamLoggerName).to(Sink.ignore),
      PhoenixSharedFlows
        .fixtureResultFlow(settings.marketSettlementFlow, marketsContext)
        .log(streamLoggerName)
        .to(Sink.ignore),
      PhoenixSharedFlows
        .marketCancelFlow(settings.marketCancelFlow, marketsContext)
        .log(streamLoggerName)
        .to(Sink.ignore),
      PhoenixSharedFlows
        .matchStatusUpdatedFlow(settings.matchStatusUpdateFlow, marketsContext)
        .log(streamLoggerName)
        .to(Sink.ignore))

  def phoenixSettlementFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): PhoenixMarketSettlementFlow =
    RestartFlow.onFailuresWithBackoff(toRestartSettings(config)) { () =>
      Flow[phoenix.dataapi.internal.phoenix.MarketSettlementEvent].mapAsync(config.contextAskParallelism) {
        betSettlement =>
          val marketId = MarketId(DataProvider.Oddin, betSettlement.marketId)
          val outcomes = betSettlement.outcomes

          log.info(s"Settling market $marketId")

          phoenixSettleMarket(marketsContext, marketId, outcomes).fold(
            {
              case FailedToSettleMarket(DuplicateSettleMarketEvent(_, _)) =>
                log.info(s"Market already settled, ignoring message: $betSettlement")
              case error =>
                log.error(s"Failed to settle market from message: $betSettlement, error='$error'")
            },
            _ => ())
      }
    }

  def phoenixMarketChangedFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): PhoenixMarketChangeFlow = {
    RestartFlow.onFailuresWithBackoff(toRestartSettings(config)) { () =>
      phoenixMarketChangeOldFlow(config, marketsContext)
    }
  }

  def toSelectionOdds(oddData: OddData): SelectionOdds =
    SelectionOdds(oddData.id, oddData.selectionName, oddData.odds.map(o => Odds(BigDecimal(o))), oddData.active)

  def toMarketLifecycle(status: phoenix.dataapi.shared.MarketStatus): MarketLifecycle =
    status match {
      case phoenix.dataapi.shared.MarketStatus.Bettable    => Bettable(DataSupplierStatusChange)
      case phoenix.dataapi.shared.MarketStatus.NotBettable => NotBettable(DataSupplierStatusChange)
      case phoenix.dataapi.shared.MarketStatus.Cancelled   => Cancelled(DataSupplierCancellation("Cancelled"))
      case _ =>
        val message = s"Received unexpected status in Market Change flow - '$status'"
        log.error(message)
        throw new RuntimeException(message)
    }

  def toOddData(selection: phoenix.dataapi.internal.phoenix.SelectionOdds): OddData = {
    OddData(selection.selectionId.toString, selection.selectionName, selection.odds, selection.active)
  }

  def toMarketStatus(oddinStatus: String) =
    oddinStatus match {
      case OddinConstants.Active      => phoenix.dataapi.shared.MarketStatus.Bettable
      case OddinConstants.HandedOver  => phoenix.dataapi.shared.MarketStatus.Bettable
      case OddinConstants.Suspended   => phoenix.dataapi.shared.MarketStatus.NotBettable
      case OddinConstants.Deactivated => phoenix.dataapi.shared.MarketStatus.Cancelled
      case status =>
        val message = s"Received unexpected status in Market Change flow - '$status'"
        log.error(message)
        throw new RuntimeException(message)
    }

  def phoenixMarketChangeOldFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): Flow[PhoenixMarketChangedEvent, Unit, NotUsed] =
    Flow[PhoenixMarketChangedEvent]
      .map { marketChange =>
        val correlationId = marketChange.correlationId
        val receivedAtUtc = marketChange.receivedAtUtc.toUtcOffsetDateTime
        val fixtureId = FixtureId(DataProvider.Oddin, marketChange.fixtureId)
        val marketId = MarketId(DataProvider.Oddin, marketChange.marketId)
        val marketName = marketChange.marketName
        val marketCategory = marketChange.marketCategory.map(MarketCategory)
        val marketType = MarketType
          .withNameOption(marketChange.marketType)
          .getOrElse(throw new RuntimeException(s"Market type not found: ${marketChange.marketType}"))
        val lifecycleStatus = marketChange.marketStatus.toLowerCase
        val marketSpecifiers = PhoenixOddinConverters.toMarketSpecifiers(marketChange.marketSpecifiers)
        val selectionOdds = marketChange.selectionOdds.map(PhoenixOddinConverters.toSelectionOdds)

        val marketLifecycle = fromStatus(lifecycleStatus)

        UpdateMarketRequest(
          correlationId,
          receivedAtUtc,
          fixtureId,
          marketId,
          marketName,
          marketCategory,
          marketType,
          marketLifecycle,
          marketSpecifiers,
          selectionOdds)
      }
      .mapAsync(config.contextAskParallelism) { request =>
        marketsContext
          .createOrUpdateMarket(request)
          .attempt
          .map(_.fold(error => log.error(s"Failed to update Market from Oddin message, error='$error'"), _ => ()))
      }

  def marketCancelFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): MarketCancelFlow =
    RestartFlow.onFailuresWithBackoff(toRestartSettings(config)) { () =>
      Flow[MarketCancelEvent].mapAsync(config.contextAskParallelism) { marketCancel =>
        val marketId = MarketId(DataProvider.Oddin, marketCancel.marketId)
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

  def marketChangedFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): MarketChangeFlow =
    RestartFlow.onFailuresWithBackoff(toRestartSettings(config)) { () =>
      Flow[MarketChangedEvent].mapAsync(config.contextAskParallelism) { marketChange =>
        val correlationId = marketChange.correlationId
        val receivedAtUtc = marketChange.receivedAtUtc.toUtcOffsetDateTime
        val fixtureId = FixtureId(DataProvider.Oddin, marketChange.fixtureId)
        val marketId = MarketId(DataProvider.Oddin, marketChange.marketId)
        val marketName = marketChange.marketName
        val marketType = MarketType
          .withUnderlyingObjectNameOption(marketChange.marketType)
          .getOrElse(throw new RuntimeException(s"Market type not found: ${marketChange.marketType}"))
        val lifecycleStatus = marketChange.marketStatus
        val marketSpecifiers = PhoenixOddinConverters.toMarketSpecifiers(marketChange.marketSpecifiers)
        val selectionOdds = marketChange.selectionOdds.map(PhoenixOddinConverters.toSelectionOdds)

        val marketLifecycle = fromStatus(lifecycleStatus)

        val request = UpdateMarketRequest(
          correlationId,
          receivedAtUtc,
          fixtureId,
          marketId,
          marketName,
          None,
          marketType,
          marketLifecycle,
          marketSpecifiers,
          selectionOdds)

        marketsContext
          .createOrUpdateMarket(request)
          .attempt
          .map(_.fold(error => log.error(s"Failed to update Market from Oddin message, error='$error'"), _ => ()))
      }
    }

  private def fromStatus(lifecycleStatus: String) =
    lifecycleStatus match {
      case OddinConstants.Active      => Bettable(DataSupplierStatusChange)
      case OddinConstants.HandedOver  => Bettable(DataSupplierStatusChange)
      case OddinConstants.Suspended   => NotBettable(DataSupplierStatusChange)
      case OddinConstants.Deactivated => Cancelled(DataSupplierCancellation(OddinConstants.Deactivated))
      case status =>
        val message = s"Received unexpected status in Market Change flow - '$status'"
        log.error(message)
        throw new RuntimeException(message)
    }

  def fixtureChangedFlow(config: FlowConfig, marketsContext: MarketsBoundedContext)(implicit
      ec: ExecutionContext): FixtureChangeFlow =
    RestartFlow.onFailuresWithBackoff(toRestartSettings(config)) { () =>
      Flow[FixtureChangedEvent]
        .map { fixtureChange =>
          val maybeSportId = SportMapper.fromExternalSportId(SportId(DataProvider.Oddin, fixtureChange.sportId))
          if (maybeSportId.isEmpty) {
            log.info(s"Received a FixtureChange for unknown sport: ${fixtureChange.sportId}. Ignoring. ")
          }
          (fixtureChange, maybeSportId)
        }
        .collect { case (fixtureChange, Some(sportId)) => (fixtureChange, sportId) }
        .mapAsync(config.contextAskParallelism) {
          case (fixtureChange, sportId) =>
            val correlationId = fixtureChange.correlationId
            val receivedAtUtc = fixtureChange.receivedAtUtc.toUtcOffsetDateTime
            val sportName = fixtureChange.sportName
            val sportAbbreviation = fixtureChange.sportAbbreviation
            val tournamentId = TournamentId(DataProvider.Oddin, fixtureChange.tournamentId)
            val tournamentName = fixtureChange.tournamentName
            val tournamentStartTime = fixtureChange.tournamentStartTimeUtc.toUtcOffsetDateTime
            val fixtureId = FixtureId(DataProvider.Oddin, fixtureChange.fixtureId)
            val fixtureName = fixtureChange.fixtureName
            val startTime = fixtureChange.startTimeUtc.toUtcOffsetDateTime
            val competitors = fixtureChange.competitors.map(PhoenixOddinConverters.toCompetitor).toSet
            val currentScore = Some(PhoenixOddinConverters.toFixtureScore(fixtureChange.currentScore))
            val fixtureStatus = PhoenixOddinConverters.toFixtureStatus(fixtureChange.eventStatus)

            val request = UpdateFixtureRequest(
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
              currentScore,
              fixtureStatus)

            marketsContext
              .createOrUpdateFixture(request)
              .attempt
              .map(_.fold(error => log.error(s"Failed to update Fixture from Oddin message, error='$error'"), _ => ()))
        }
    }

  private[this] def phoenixSettleMarket(
      marketsContext: MarketsBoundedContext,
      marketId: MarketId,
      outcomes: Seq[PhoenixSelectionResult])(implicit
      ec: ExecutionContext): EitherT[Future, PhoenixOddinFlowError, Unit] =
    EitherT.fromEither(phoenixExtractWinningSelectionId(marketId, outcomes)).flatMap { winningSelectionId =>
      marketsContext.settleMarket(marketId, winningSelectionId, DataSupplierStatusChange).leftMap(FailedToSettleMarket)
    }

  private[this] def phoenixExtractWinningSelectionId(
      marketId: MarketId,
      outcomes: Seq[PhoenixSelectionResult]): Either[PhoenixOddinFlowError, SelectionId] =
    outcomes.filter(_.result == "WON") match {
      case Nil         => Left(NoWinningSelectionId(marketId))
      case head :: Nil => Right(head.selectionId.toString)
      case list =>
        val winningSelectionIds = list.map(_.selectionId).toSet
        Left(TooManyWinningSelections(marketId, winningSelectionIds.map(_.toString)))
    }

  private[this] def toRestartSettings(config: FlowConfig): RestartSettings =
    RestartSettings(
      minBackoff = config.restartMinBackoff,
      maxBackoff = config.restartMaxBackoff,
      randomFactor = config.restartRandomFactor)
      .withMaxRestarts(count = config.maxRestarts, within = config.restartMinBackoff)
}
