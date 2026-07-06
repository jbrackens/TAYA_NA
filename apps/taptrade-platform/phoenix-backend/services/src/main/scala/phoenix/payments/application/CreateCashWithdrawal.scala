package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.bifunctor._
import cats.syntax.functor._
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.CreateCashWithdrawal.CreateCashWithdrawalError
import phoenix.payments.application.CreateCashWithdrawal._
import phoenix.payments.application.WithdrawalPreconditions._
import phoenix.payments.domain.CashWithdrawalIdentifier
import phoenix.payments.domain.CashWithdrawalReservation
import phoenix.payments.domain.CashWithdrawalReservationsRepository
import phoenix.payments.domain.PaymentDirection
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.PaymentsService
import phoenix.payments.domain.TransactionId
import phoenix.payments.domain.TransactionRepository
import phoenix.payments.domain.TransactionStatus
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.UserDetails
import phoenix.punters.infrastructure.KeycloakHelpers
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome.Rejected
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod.CashWithdrawalPaymentMethod

final class CreateCashWithdrawal(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    reservationsRepository: CashWithdrawalReservationsRepository,
    paymentsService: PaymentsService,
    transactions: TransactionRepository,
    clock: Clock)(implicit ec: ExecutionContext) {

  private val log = LoggerFactory.getLogger(getClass)

  private val preconditions = new WithdrawalPreconditions(punters, wallets)

  def forPunter(
      punterId: PunterId,
      amount: PositiveAmount[RealMoney]): EitherT[Future, CreateCashWithdrawalError, CashWithdrawalIdentifier] =
    for {
      punterProfile <- getPunterProfile(punterId)
      sessionId <- getSessionId(punterProfile)
      _ <- validatePunterCanWithdraw(punterProfile.punterId, amount)
      withdrawalIdentifier <- EitherT.liftF(createWithdrawalIdentifier(clock))
      _ <- reserveFundsForWithdrawal(punterId, withdrawalIdentifier, amount)
      _ <- EitherT.liftF(markTransaction(punterId, amount, withdrawalIdentifier.asTransaction))
      registeredUser <- KeycloakHelpers.getRegisteredUser[CreateCashWithdrawalError](
        authenticationRepository,
        puntersRepository,
        punterId,
        RegisteredUserNotFound,
        PunterProfileNotFound)
      _ <- registerCashWithdrawal(withdrawalIdentifier, amount, punterId, sessionId, registeredUser.details)
        .leftWiden[CreateCashWithdrawalError]
    } yield withdrawalIdentifier

  private def validatePunterCanWithdraw(
      punterId: PunterId,
      amount: PositiveAmount[RealMoney]): EitherT[Future, CreateCashWithdrawalError, Unit] =
    preconditions.assertPunterCanWithdrawAmountWithCash(punterId, amount.value.moneyAmount).leftMap {
      case _: NotEnoughFunds         => InsufficientFunds
      case _: NotAllowedToWithdraw   => PunterIsNotAllowedToWithdraw
      case _: MissingPunterProfile   => PunterProfileNotFound
      case _: MissingWallet          => WalletNotFound
      case _: TooSmallWithdrawAmount => CreateCashWithdrawal.TooSmallWithdrawAmount
    }

  private def getPunterProfile(punterId: PunterId): EitherT[Future, PunterProfileNotFound.type, PunterProfile] =
    punters.getPunterProfile(punterId).leftMap(_ => PunterProfileNotFound)

  private def getSessionId(punterProfile: PunterProfile): EitherT[Future, PunterSessionNotFound.type, SessionId] =
    EitherT.fromOption(punterProfile.maybeCurrentSession.map(_.sessionId), PunterSessionNotFound)

  private def createWithdrawalIdentifier(clock: Clock): Future[CashWithdrawalIdentifier] = {
    val identifier = CashWithdrawalIdentifier.create()
    reservationsRepository
      .insert(CashWithdrawalReservation(identifier, clock.currentOffsetDateTime()))
      .leftSemiflatMap(_ => createWithdrawalIdentifier(clock))
      .map(_ => identifier)
      .fold(identity, identity)
  }

  private def reserveFundsForWithdrawal(
      punterId: PunterId,
      withdrawalIdentifier: CashWithdrawalIdentifier,
      amount: PositiveAmount[RealMoney]): EitherT[Future, CreateCashWithdrawalError, Unit] = {
    val reservation = WithdrawalReservation(withdrawalIdentifier.asReservation, amount, CashWithdrawalPaymentMethod)
    wallets
      .reserveForWithdrawal(WalletId.deriveFrom(punterId), reservation)
      .void
      .leftSemiflatTap { _ =>
        reservationsRepository.remove(withdrawalIdentifier)
      }
      .leftMap {
        case WalletsBoundedContextProtocol.InsufficientFundsError(_)           => InsufficientFunds
        case WalletsBoundedContextProtocol.WalletNotFoundError(_)              => WalletNotFound
        case WalletsBoundedContextProtocol.ReservationAlreadyExistsError(_, _) => ReservationAlreadyExists
      }
  }

  private def registerCashWithdrawal(
      cashWithdrawalIdentifier: CashWithdrawalIdentifier,
      amount: PositiveAmount[RealMoney],
      punterId: PunterId,
      sessionId: SessionId,
      userDetails: UserDetails): EitherT[Future, PaymentGatewayIssue.type, Unit] = {
    val moneyAmount = amount.value.moneyAmount
    val transaction = PaymentTransaction(
      cashWithdrawalIdentifier.asTransaction,
      punterId,
      PaymentDirection.Withdrawal,
      moneyAmount,
      TransactionStatus.Pending)

    paymentsService
      .createCashWithdrawal(transaction, userDetails, sessionId)
      .leftSemiflatTap { _ =>
        rollback(cashWithdrawalIdentifier, WalletId.deriveFrom(punterId)).value
      }
      .leftMap { error =>
        log.error(s"Failed to register Cash Withdrawal because '$error' - rolling back")
        PaymentGatewayIssue
      }
  }

  private def rollback(
      cashWithdrawalIdentifier: CashWithdrawalIdentifier,
      walletId: WalletId): EitherT[Future, RollbackError.type, Unit] = {
    (for {
      _ <-
        wallets
          .finalizeWithdrawal(
            walletId,
            cashWithdrawalIdentifier.asReservation,
            outcome = Rejected(RejectionOrigin.PaymentGateway))
          .leftMap((_: WithdrawalFinalizationError) => RollbackError)
      _ <- EitherT.liftF(reservationsRepository.remove(cashWithdrawalIdentifier)).leftMap((_: Any) => RollbackError)
    } yield ()).leftSemiflatTap { error =>
      Future.successful(log.error(
        s"FAILED TO ROLLBACK A CASH WITHDRAWAL REQUEST ($error) [walletId = '$walletId', withdrawalId = '$cashWithdrawalIdentifier']"))
    }
  }

  private def markTransaction(
      punterId: PunterId,
      amount: PositiveAmount[RealMoney],
      transactionId: TransactionId): Future[PaymentTransaction] = {
    val transaction =
      PaymentTransaction.create(punterId, transactionId, PaymentDirection.Withdrawal, amount.value.moneyAmount)
    transactions.upsert(transaction).map(_ => transaction)
  }
}

object CreateCashWithdrawal {
  sealed trait CreateCashWithdrawalError
  final case object PunterProfileNotFound extends CreateCashWithdrawalError
  final case object RegisteredUserNotFound extends CreateCashWithdrawalError
  final case object WalletNotFound extends CreateCashWithdrawalError
  final case object InsufficientFunds extends CreateCashWithdrawalError
  final case object PunterIsNotAllowedToWithdraw extends CreateCashWithdrawalError
  final case object RollbackError extends CreateCashWithdrawalError
  final case object PaymentGatewayIssue extends CreateCashWithdrawalError
  final case object ReservationAlreadyExists extends CreateCashWithdrawalError
  final case object PunterSessionNotFound extends CreateCashWithdrawalError
  final case object TooSmallWithdrawAmount extends CreateCashWithdrawalError
}
