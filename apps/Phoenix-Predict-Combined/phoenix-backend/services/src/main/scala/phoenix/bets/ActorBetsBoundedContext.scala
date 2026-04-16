package phoenix.bets

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success
import scala.util.Try

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.EntityRef
import akka.stream.Materializer
import akka.stream.scaladsl.Sink
import akka.stream.scaladsl.Source
import akka.util.Timeout
import cats.data.EitherT
import cats.data.NonEmptyList
import cats.syntax.traverse._
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.Commands._
import phoenix.bets.BetProtocol.Responses.BetResponse
import phoenix.bets.BetProtocol.Responses.{Failure => failure}
import phoenix.bets.BetProtocol.Responses.{Success => success}
import phoenix.bets.BetValidator.BetValidationError
import phoenix.bets.BetsBoundedContext._
import phoenix.bets.domain.MarketBet
import phoenix.bets.domain.MarketBetsRepository
import phoenix.bets.infrastructure.akka.BetEventsWebsocketSingleton
import phoenix.core.Clock
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.http.core.Geolocation
import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.projections.ProjectionRunner
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.websockets.domain.WebsocketMessageOffsetRepository
import phoenix.websockets.infrastructure.SlickPersistenceQueryOffsetRepository

/**
 * Concrete Bounded Context definition based on actor system
 *
 * Calling ActorBetsBoundedContext(system) will:
 *
 * - initialize the required sharding region for the Bets to be referenced from
 * - return an instance of the Bets API that can be passed as a dependency to users
 */
private class ActorBetsBoundedContext(
    system: ActorSystem[Nothing],
    marketBets: MarketBetsRepository,
    punterBetsHistory: PunterBetHistoryRepository)
    extends BetsBoundedContext {
  private val log = LoggerFactory.getLogger(getClass)
  implicit val mat: Materializer = Materializer(system)
  implicit val scheduler = system.scheduler

  private val sharding = ClusterSharding(system)
  private implicit val timeout: Timeout = Timeout(10.seconds)

  private def betRef(betId: BetId): EntityRef[BetCommand] =
    sharding.entityRefFor(BetsShardingRegion.TypeKey, betId.value)

  private def handleResponse[L, R](
      pf: PartialFunction[BetResponse, Either[L, R]]): Try[BetResponse] => Future[Either[L, R]] = {
    case Success(response) =>
      pf.lift(response)
        .map(result => Future.successful(result))
        .getOrElse(Future.failed(UnexpectedBetErrorException(new IllegalStateException(s"Received message $response"))))
    case Failure(exception) => Future.failed(UnexpectedBetErrorException(exception))
  }

  override def openBet(
      id: BetId,
      betData: BetData,
      geolocation: Geolocation,
      reservationId: ReservationId,
      placedAt: OffsetDateTime)(implicit ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit] =
    EitherT(for {
      betPlacementOutcome <- betRef(id)
        .ask(OpenBet(id, betData, geolocation, reservationId, placedAt, _))
        .transformWith(handleResponse({
          case success.BetOpened(_) => Right(())
        }))
    } yield betPlacementOutcome)

  override def failBet(id: BetId, betData: BetData, reasons: NonEmptyList[BetValidationError])(implicit
      ec: ExecutionContext): EitherT[Future, UnexpectedStateError, Unit] =
    EitherT(
      betRef(id)
        .ask(FailBet(id, betData, reasons.toList, _))
        .transformWith(handleResponse({
          case success.BetFailed(_) => Right(())
        })))

  override def betDetails(betId: BetId)(implicit ec: ExecutionContext): EitherT[Future, BetDetailsError, BetDetails] =
    EitherT(
      betRef(betId)
        .ask(ref => GetBetDetails(betId, ref))
        .transformWith(handleResponse({
          case success.BetDetails(betId, status, betData, isWinner) =>
            Right(
              BetDetails(
                betId,
                status,
                betData.punterId,
                betData.marketId,
                betData.selectionId,
                betData.stake,
                betData.odds,
                isWinner,
                List.empty))
          case success.FailedBetDetails(betId, betData, reasons) =>
            Right(
              BetDetails(
                betId,
                BetState.Status.Failed,
                betData.punterId,
                betData.marketId,
                betData.selectionId,
                betData.stake,
                betData.odds,
                isWinner = false,
                reasons))
          case failure.BetNotInitialized(betId) =>
            Left(UnexpectedStateError(betId, BetState.Status.Uninitialized))
        })))

  override def settleBets(marketId: MarketId, winningSelectionId: SelectionId)(implicit
      ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
    EitherT.liftF {
      allOpenBetsForMarket(marketId)
        .mapAsync(100)(bet =>
          settleBet(bet, winningSelectionId).valueOr { error =>
            log.error(s"Failed to settle bet ${bet.betId} due to $error")
          })
        .run()
        .map(_ => ())
    }

  private def settleBet(bet: MarketBet, winningSelectionId: SelectionId)(implicit
      ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
    EitherT {
      betRef(bet.betId)
        .ask(ref => SettleBet(bet.betId, bet.marketId, winningSelectionId, ref))
        .transformWith(handleResponse({
          case success.BetSettled(_)            => Right(())
          case failure.BetNotInitialized(betId) => Left(UnexpectedStateError(betId, BetState.Status.Uninitialized))
        }))
    }

  override def resettleBets(marketId: MarketId, newWinningSelectionId: SelectionId, resettledAt: OffsetDateTime)(
      implicit ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
    EitherT.liftF {
      allSettledBetsForMarket(marketId)
        .mapAsync(100)(bet =>
          resettleBet(bet, newWinningSelectionId, resettledAt).valueOr { error =>
            log.error(s"Failed to resettle bet ${bet.betId} due to $error")
          })
        .run()
        .map(_ => ())
    }

  private def resettleBet(bet: MarketBet, newWinningSelectionId: SelectionId, resettledAt: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, BetSettlementError, Unit] =
    EitherT {
      betRef(bet.betId)
        .ask(ref => ResettleBet(bet.betId, bet.marketId, newWinningSelectionId, resettledAt, ref))
        .transformWith(handleResponse({
          case success.BetResettled(_)          => Right(())
          case failure.BetNotInitialized(betId) => Left(UnexpectedStateError(betId, BetState.Status.Uninitialized))
        }))
    }

  override def voidBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetVoidingError, Unit] = {
    EitherT.liftF {
      allOpenBetsForMarket(marketId)
        .mapAsync(100)(bet =>
          voidBet(bet).valueOr { error =>
            log.error(s"Failed to void bet ${bet.betId} due to $error")
          })
        .run()
        .map(_ => ())
    }
  }

  private def voidBet(bet: MarketBet)(implicit ec: ExecutionContext): EitherT[Future, BetVoidingError, Unit] =
    EitherT {
      betRef(bet.betId)
        .ask(ref => VoidBet(bet.betId, ref))
        .transformWith(handleResponse({
          case success.BetVoided(_)             => Right(())
          case failure.BetNotInitialized(betId) => Left(UnexpectedStateError(betId, BetState.Status.Uninitialized))
        }))
    }

  override def pushBets(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, BetPushingError, Unit] = {
    EitherT.liftF {
      allOpenBetsForMarket(marketId)
        .mapAsync(100)(bet =>
          pushBet(bet).valueOr { error =>
            log.error(s"Failed to push bet ${bet.betId} due to $error")
          })
        .run()
        .map(_ => ())
    }
  }

  private def pushBet(bet: MarketBet)(implicit ec: ExecutionContext): EitherT[Future, BetPushingError, Unit] =
    EitherT {
      betRef(bet.betId)
        .ask(ref => PushBet(bet.betId, ref))
        .transformWith(handleResponse({
          case success.BetPushed(_)             => Right(())
          case failure.BetNotInitialized(betId) => Left(UnexpectedStateError(betId, BetState.Status.Uninitialized))
        }))
    }

  override def cancelBet(
      betId: BetId,
      adminUser: AdminId,
      cancellationReason: CancellationReason,
      betCancellationTimestamp: OffsetDateTime)(implicit
      ec: ExecutionContext): EitherT[Future, BetCancellationError, Unit] =
    EitherT {
      betRef(betId)
        .ask(ref => CancelBet(betId, adminUser, cancellationReason, betCancellationTimestamp, ref))
        .transformWith(handleResponse({
          case success.BetCancelled(_)          => Right(())
          case failure.BetNotInitialized(betId) => Left(UnexpectedStateError(betId, BetState.Status.Uninitialized))
          case failure.AlreadyCancelled(betId)  => Left(UnexpectedStateError(betId, BetState.Status.Cancelled))
        }))
    }

  override def cancelUnsettledBets(punterId: PunterId, cancellationReason: CancellationReason)(implicit
      ec: ExecutionContext,
      clock: Clock): EitherT[Future, BetCancellationError, Unit] = {
    val cancellationTime = clock.currentOffsetDateTime()

    for {
      bets <- EitherT.liftF(readPaginatedBets(punterId, Set(BetStatus.Open)))
      _ <- bets.map { bet =>
        cancelBet(bet.betId, AdminId.fromPunterId(punterId), cancellationReason, cancellationTime)
      }.sequence
    } yield ()
  }

  private def readPaginatedBets(punterId: PunterId, betStatuses: Set[BetStatus])(implicit
      ec: ExecutionContext): Future[Seq[BetView]] =
    Source
      .unfoldAsync(Pagination(currentPage = 1, itemsPerPage = 500)) { pagination =>
        searchForBets(punterId, BetHistoryQuery(statuses = betStatuses, pagination = pagination)).map { betsView =>
          if (betsView.data.nonEmpty)
            Some((Pagination(pagination.currentPage + 1, pagination.itemsPerPage), betsView.data))
          else
            None
        }
      }
      .flatMapConcat(bets => Source.fromIterator(() => bets.iterator))
      .runWith(Sink.seq)

  override def searchForBets(punterId: PunterId, query: BetHistoryQuery)(implicit
      ec: ExecutionContext): Future[PaginatedResult[BetView]] =
    punterBetsHistory.find(punterId, query).map(_.map(BetView.fromBetHistory))

  private def allOpenBetsForMarket(market: MarketId): Source[MarketBet, NotUsed] =
    Source.future(marketBets.openBetsForMarket(market)).flatMapConcat(bets => Source(bets))

  private def allSettledBetsForMarket(market: MarketId): Source[MarketBet, NotUsed] =
    Source.future(marketBets.settledBetsForMarket(market)).flatMapConcat(bets => Source(bets))
}

object ActorBetsBoundedContext {
  private val log = LoggerFactory.getLogger(getClass)

  def apply(
      system: ActorSystem[Nothing],
      markets: MarketsBoundedContext,
      marketBetsRepository: MarketBetsRepository,
      dbConfig: DatabaseConfig[JdbcProfile],
      marketProjectionsRunner: ProjectionRunner[MarketEvent]): BetsBoundedContext = {
    log.info("Betting BoundedContext starting...")

    implicit val ec: ExecutionContext = system.executionContext

    val config = BetsConfig.of(system)
    val punterBetsRepository = new PunterBetHistoryRepository(dbConfig)
    val offsetRepository: WebsocketMessageOffsetRepository = new SlickPersistenceQueryOffsetRepository(dbConfig)

    val betsBC =
      new ActorBetsBoundedContext(system, marketBetsRepository, punterBetsRepository)

    val _ = BetEventsWebsocketSingleton(offsetRepository)(system)

    BetsShardingRegion.initShardingRegion(system)

    val betProjectionRunner = BetProjectionRunner.build(system, dbConfig)

    betProjectionRunner.runProjection(config.projections.betLifecycle, new BetLifecycleHandler(marketBetsRepository))
    betProjectionRunner.runProjection(
      config.projections.punterBetsHistory,
      new PunterBetsHistoryHandler(markets, punterBetsRepository))
    marketProjectionsRunner.runProjection(
      config.projections.marketLifecycle,
      new MarketLifecycleEventHandler(betsBC)(system.executionContext))

    betsBC
  }
}
