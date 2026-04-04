package phoenix.wallets

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration._
import scala.util.Failure
import scala.util.Success

import akka.NotUsed
import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.cluster.sharding.typed.scaladsl.ClusterSharding
import akka.cluster.sharding.typed.scaladsl.EntityRef
import akka.stream.scaladsl.Source
import akka.util.Timeout
import cats.data.EitherT
import cats.syntax.either._
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.bets.BetProtocol.Events.BetEvent
import phoenix.core.Clock
import phoenix.core.currency.PositiveAmount
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.scheduler.AkkaScheduler
import phoenix.projections.ProjectionRunner
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletActorProtocol.Responses.WalletResponse
import phoenix.wallets.WalletActorProtocol.Responses.{Failure => failure}
import phoenix.wallets.WalletActorProtocol.Responses.{Success => success}
import phoenix.wallets.WalletActorProtocol.commands._
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.application.es.ScheduleResponsibilityCheckTaskEventHandler
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.DebitFundsReason
import phoenix.wallets.domain.Deposits
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.ResponsibilityCheckStatus
import phoenix.wallets.infrastructure.ConsumeResponsibilityCheckTasksJob
import phoenix.wallets.infrastructure.SlickResponsibilityCheckTaskRepository

private class ActorWalletsBoundedContext(system: ActorSystem[_], repository: WalletTransactionsRepository)(implicit
    clock: Clock)
    extends WalletsBoundedContext {

  private lazy val sharding = ClusterSharding(system)
  private implicit val timeout: Timeout = Timeout(10.seconds)

  override def createWallet(walletId: WalletId, initialBalance: Balance)(implicit
      ec: ExecutionContext): EitherT[Future, WalletAlreadyExistsError, Balance] =
    runWalletCommand[WalletAlreadyExistsError, Balance](
      walletId,
      replyTo => CreateWallet(walletId, initialBalance, replyTo)) {
      case success.CurrentBalance(_, balance) => balance.asRight
      case failure.AlreadyExists(walletId)    => WalletAlreadyExistsError(walletId).asLeft
    }

  override def deposit(
      walletId: WalletId,
      funds: PositiveAmount[RealMoney],
      reason: CreditFundsReason,
      paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Balance] =
    runWalletCommand[WalletNotFoundError, Balance](
      walletId,
      replyTo =>
        reason match {
          case CreditFundsReason.Deposit    => DepositFunds(walletId, funds.value, paymentMethod, replyTo)
          case CreditFundsReason.Adjustment => AdjustmentDepositFunds(walletId, funds.value, paymentMethod, replyTo)
        }) {
      case success.CurrentBalance(_, balance) => balance.asRight
      case failure.WalletNotFound(walletId)   => WalletNotFoundError(walletId).asLeft
    }

  override def withdraw(
      walletId: WalletId,
      withdrawal: PositiveAmount[RealMoney],
      reason: DebitFundsReason,
      paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WithdrawError, Balance] =
    runWalletCommand[WithdrawError, Balance](
      walletId,
      replyTo =>
        reason match {
          case DebitFundsReason.Withdrawal => WithdrawFunds(walletId, withdrawal.value, paymentMethod, replyTo)
          case DebitFundsReason.Adjustment =>
            AdjustmentWithdrawFunds(walletId, withdrawal.value, paymentMethod, replyTo)
        }) {
      case success.CurrentBalance(_, balance)  => balance.asRight
      case failure.InsufficientFunds(walletId) => InsufficientFundsError(walletId).asLeft
      case failure.WalletNotFound(walletId)    => WalletNotFoundError(walletId).asLeft
    }

  override def reserveForWithdrawal(walletId: WalletId, withdrawal: WithdrawalReservation)(implicit
      ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved] =
    runWalletCommand[ReservationError, WalletFundsReserved](
      walletId,
      replyTo => ReserveFundsForWithdrawal(walletId, withdrawal, replyTo)) {
      case success.FundsReserved(reservationId, balance) => WalletFundsReserved(reservationId, balance).asRight
      case failure.InsufficientFunds(walletId)           => InsufficientFundsError(walletId).asLeft
      case failure.WalletNotFound(walletId)              => WalletNotFoundError(walletId).asLeft
      case failure.ReservationAlreadyExists(walletId, reservationId) =>
        ReservationAlreadyExistsError(walletId, reservationId).asLeft
    }

  override def finalizeWithdrawal(walletId: WalletId, reservationId: ReservationId, outcome: WithdrawalOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, WithdrawalFinalizationError, Balance] = {
    val actorCommand = outcome match {
      case WithdrawalOutcome.Confirmed(confirmedBy) =>
        replyTo => ConfirmWithdrawal(walletId, reservationId, confirmedBy, replyTo)
      case WithdrawalOutcome.Rejected(rejectedBy) =>
        replyTo => RejectWithdrawal(walletId, reservationId, rejectedBy, replyTo)
    }

    runWalletCommand[WithdrawalFinalizationError, Balance](walletId, actorCommand) {
      case success.CurrentBalance(_, balance)                 => balance.asRight
      case failure.ReservationNotFound(walletId, reservation) => ReservationNotFoundError(walletId, reservation).asLeft
      case failure.WalletNotFound(walletId)                   => WalletNotFoundError(walletId).asLeft
    }
  }

  override def reserveForBet(walletId: WalletId, bet: Bet)(implicit
      ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved] =
    runWalletCommand[ReservationError, WalletFundsReserved](
      walletId,
      replyTo => ReserveFundsForBet(walletId, bet, replyTo)) {
      case success.FundsReserved(reservationId, balance) => WalletFundsReserved(reservationId, balance).asRight
      case failure.InsufficientFunds(walletId)           => InsufficientFundsError(walletId).asLeft
      case failure.WalletNotFound(walletId)              => WalletNotFoundError(walletId).asLeft
    }

  override def reserveForPrediction(walletId: WalletId, bet: Bet)(implicit
      ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved] =
    runWalletCommand[ReservationError, WalletFundsReserved](
      walletId,
      replyTo => ReserveFundsForPrediction(walletId, bet, replyTo)) {
      case success.FundsReserved(reservationId, balance) => WalletFundsReserved(reservationId, balance).asRight
      case failure.InsufficientFunds(walletId)           => InsufficientFundsError(walletId).asLeft
      case failure.WalletNotFound(walletId)              => WalletNotFoundError(walletId).asLeft
    }

  override def finalizeBet(walletId: WalletId, reservationId: ReservationId, outcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance] = {
    val actorCommand = outcome match {
      case BetPlacementOutcome.Won       => MarkBetWon(walletId, reservationId, _)
      case BetPlacementOutcome.Lost      => MarkBetLost(walletId, reservationId, _)
      case BetPlacementOutcome.Voided    => MarkBetVoided(walletId, reservationId, _)
      case BetPlacementOutcome.Pushed    => MarkBetPushed(walletId, reservationId, _)
      case BetPlacementOutcome.Cancelled => MarkBetCancelled(walletId, reservationId, _)
    }

    runWalletCommand[BetFinalizationError, Balance](walletId, actorCommand) {
      case success.CurrentBalance(_, balance)                 => balance.asRight
      case failure.ReservationNotFound(walletId, reservation) => ReservationNotFoundError(walletId, reservation).asLeft
      case failure.WalletNotFound(walletId)                   => WalletNotFoundError(walletId).asLeft
    }
  }

  override def finalizePrediction(
      walletId: WalletId,
      reservationId: ReservationId,
      outcome: BetPlacementOutcome)(implicit ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance] = {
    val actorCommand = outcome match {
      case BetPlacementOutcome.Won       => MarkPredictionWon(walletId, reservationId, _)
      case BetPlacementOutcome.Lost      => MarkPredictionLost(walletId, reservationId, _)
      case BetPlacementOutcome.Voided    => MarkPredictionVoided(walletId, reservationId, _)
      case BetPlacementOutcome.Pushed    => MarkPredictionPushed(walletId, reservationId, _)
      case BetPlacementOutcome.Cancelled => MarkPredictionCancelled(walletId, reservationId, _)
    }

    runWalletCommand[BetFinalizationError, Balance](walletId, actorCommand) {
      case success.CurrentBalance(_, balance)                 => balance.asRight
      case failure.ReservationNotFound(walletId, reservation) => ReservationNotFoundError(walletId, reservation).asLeft
      case failure.WalletNotFound(walletId)                   => WalletNotFoundError(walletId).asLeft
    }
  }

  override def refinalizeBet(walletId: WalletId, bet: Bet, newOutcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance] = {
    val actorCommand = newOutcome match {
      case BetPlacementOutcome.Won  => Right(ResettleBet(walletId, bet, winner = true, _))
      case BetPlacementOutcome.Lost => Right(ResettleBet(walletId, bet, winner = false, _))
      case outcome                  => Left(UnexpectedOutcomeError(outcome))
    }

    for {
      ac <- EitherT.fromEither[Future](actorCommand)
      result <- runWalletCommand[BetFinalizationError, Balance](walletId, ac) {
        case success.CurrentBalance(_, balance) => balance.asRight
        case failure.WalletNotFound(walletId)   => WalletNotFoundError(walletId).asLeft
      }
    } yield result
  }

  override def refinalizePrediction(walletId: WalletId, bet: Bet, newOutcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance] = {
    val actorCommand = newOutcome match {
      case BetPlacementOutcome.Won  => Right(ResettlePrediction(walletId, bet, winner = true, _))
      case BetPlacementOutcome.Lost => Right(ResettlePrediction(walletId, bet, winner = false, _))
      case outcome                  => Left(UnexpectedOutcomeError(outcome))
    }

    for {
      ac <- EitherT.fromEither[Future](actorCommand)
      result <- runWalletCommand[BetFinalizationError, Balance](walletId, ac) {
        case success.CurrentBalance(_, balance) => balance.asRight
        case failure.WalletNotFound(walletId)   => WalletNotFoundError(walletId).asLeft
      }
    } yield result
  }

  override def currentBalance(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Balance] =
    runWalletCommand[WalletNotFoundError, Balance](walletId, replyTo => GetCurrentBalance(walletId, replyTo)) {
      case success.CurrentBalance(_, balance) => balance.asRight
      case failure.WalletNotFound(walletId)   => WalletNotFoundError(walletId).asLeft
    }

  override def walletTransactions(query: WalletTransactionsQuery, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[WalletTransaction]] = {
    repository.findPaginated(query, pagination)
  }

  override def allWalletTransactions(query: WalletTransactionsQuery)(implicit
      ec: ExecutionContext): Source[WalletTransaction, NotUsed] =
    repository.findAll(query)

  override def depositHistory(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Deposits] =
    runWalletCommand[WalletNotFoundError, Deposits](walletId, replyTo => GetDepositHistory(walletId, replyTo)) {
      case success.CurrentDepositHistory(_, depositHistory) =>
        depositHistory.calculateDeposits(clock.currentOffsetDateTime(), clock).asRight
      case failure.WalletNotFound(walletId) => WalletNotFoundError(walletId).asLeft
    }

  override def findResponsibilityCheckStatus(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, ResponsibilityCheckStatus] =
    runWalletCommand[WalletNotFoundError, ResponsibilityCheckStatus](
      walletId,
      replyTo => GetResponsibilityCheckStatus(walletId, replyTo)) {
      case success.CurrentResponsibilityCheckStatus(_, status) => status.asRight
      case failure.WalletNotFound(walletId)                    => WalletNotFoundError(walletId).asLeft
    }

  override def acceptResponsibilityCheck(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] =
    runWalletCommand[WalletNotFoundError, Unit](walletId, replyTo => AcceptResponsibilityCheck(walletId, replyTo)) {
      case success.ResponsibilityCheckAcceptedResponse => ().asRight
      case failure.WalletNotFound(walletId)            => WalletNotFoundError(walletId).asLeft
    }

  override def requestResponsibilityCheckAcceptance(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = {
    runWalletCommand[WalletNotFoundError, Unit](
      walletId,
      replyTo => RequestResponsibilityCheckAcceptance(walletId, replyTo)) {
      case success.ResponsibilityCheckAcceptanceRequestedResponse => ().asRight
      case failure.WalletNotFound(walletId)                       => WalletNotFoundError(walletId).asLeft
    }
  }

  override def requestBalanceCheckForSuspend(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = {
    runWalletCommand[WalletNotFoundError, Unit](walletId, replyTo => CheckBalanceForSuspend(walletId, replyTo)) {
      case success.BalanceCheckForSuspendAcceptedResponse => ().asRight
      case failure.WalletNotFound(walletId)               => WalletNotFoundError(walletId).asLeft
    }
  }

  override def requestBalanceCheckForUnsuspend(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit] = {
    runWalletCommand[WalletNotFoundError, Unit](walletId, replyTo => CheckBalanceForUnsuspend(walletId, replyTo)) {
      case success.BalanceCheckForUnsuspendAcceptedResponse => ().asRight
      case failure.WalletNotFound(walletId)                 => WalletNotFoundError(walletId).asLeft
    }
  }

  override def financialSummary(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, FinancialSummary] = {
    val currentFinances = runWalletCommand[WalletNotFoundError, success.CurrentFinances](
      walletId,
      replyTo => GetCurrentFinances(walletId, replyTo)) {
      case cf: success.CurrentFinances      => cf.asRight
      case failure.WalletNotFound(walletId) => WalletNotFoundError(walletId).asLeft
    }
    val lifetimeWithdrawals = repository.getLifetimeWithdrawals(walletId)
    val lifetimeDeposits = repository.getLifetimeDeposits(walletId)
    for {
      cf <- currentFinances
      lw <- EitherT.right(lifetimeWithdrawals)
      ld <- EitherT.right(lifetimeDeposits)
    } yield FinancialSummary(cf.currentBalance, cf.openedBets, cf.pendingWithdrawals, ld, lw)
  }

  private def runWalletCommand[L, R](walletId: WalletId, command: ActorRef[WalletResponse] => WalletCommand)(
      actorResponseHandler: PartialFunction[WalletResponse, Either[L, R]])(implicit
      ec: ExecutionContext): EitherT[Future, L, R] = {
    EitherT(walletRef(walletId).ask(command).transformWith {
      case Success(response) =>
        actorResponseHandler
          .lift(response)
          .map(result => Future.successful(result))
          .getOrElse(
            Future.failed(UnexpectedWalletErrorException(new IllegalStateException(s"Received message $response"))))
      case Failure(exception) => Future.failed(UnexpectedWalletErrorException(exception))
    })
  }

  private def walletRef(walletId: WalletId): EntityRef[WalletCommand] =
    sharding.entityRefFor(WalletShardingRegion.TypeKey, walletId.value)
}

object ActorWalletsBoundedContext {
  private val log = LoggerFactory.getLogger(getClass)

  def apply(
      system: ActorSystem[Nothing],
      dbConfig: DatabaseConfig[JdbcProfile],
      betProjectionRunner: ProjectionRunner[BetEvent],
      uuidGenerator: UUIDGenerator,
      akkaJobScheduler: AkkaScheduler,
      walletProjectionRunner: ProjectionRunner[WalletEvent])(implicit clock: Clock): WalletsBoundedContext = {
    log.info("Wallets BoundedContext starting...")

    implicit val ec: ExecutionContext = system.executionContext
    val config = WalletsConfig.of(system)
    val walletTransactionsRepository = new SlickWalletTransactionsRepository(dbConfig)
    val responsibilityCheckTaskRepository = new SlickResponsibilityCheckTaskRepository(dbConfig)

    WalletShardingRegion.initSharding(system)

    val walletsBC = new ActorWalletsBoundedContext(system, walletTransactionsRepository)
    walletProjectionRunner.runProjection(
      config.projections.walletTransactionsView,
      new WalletsProjectionHandler(walletTransactionsRepository))
    walletProjectionRunner.runProjection(
      config.projections.responsibilityCheckTaskScheduling,
      new ScheduleResponsibilityCheckTaskEventHandler(responsibilityCheckTaskRepository, uuidGenerator))
    betProjectionRunner.runProjection(config.projections.betFinalizer, new BetFinalizer(walletsBC))

    val consumeResponsibilityCheckTasksJob =
      new ConsumeResponsibilityCheckTasksJob(walletsBC, responsibilityCheckTaskRepository, clock)
    akkaJobScheduler.scheduleJob(
      consumeResponsibilityCheckTasksJob,
      config.consumeResponsibilityCheckTasks.periodicWorker)

    walletsBC
  }
}
