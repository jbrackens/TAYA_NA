package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.bifunctor._

import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.CreateWithdrawal._
import phoenix.payments.application.WithdrawalPreconditions.MissingPunterProfile
import phoenix.payments.application.WithdrawalPreconditions.MissingWallet
import phoenix.payments.application.WithdrawalPreconditions.NotAllowedToWithdraw
import phoenix.payments.application.WithdrawalPreconditions.NotEnoughFunds
import phoenix.payments.application.WithdrawalPreconditions.TooSmallWithdrawAmount
import phoenix.payments.domain.PaymentDirection
import phoenix.payments.domain.PaymentOrigin
import phoenix.payments.domain.PaymentSessionStarted
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.PaymentsService
import phoenix.payments.domain.TransactionId
import phoenix.payments.domain.TransactionRepository
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.RegisteredUser
import phoenix.punters.domain.UserDetails
import phoenix.punters.infrastructure.KeycloakHelpers
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.domain.Funds.RealMoney

private[payments] final class CreateWithdrawal(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    paymentsService: PaymentsService,
    transactions: TransactionRepository,
    uuidGenerator: UUIDGenerator)(implicit ec: ExecutionContext) {

  private val preconditions = new WithdrawalPreconditions(punters, wallets)

  def forPunter(
      punterId: PunterId,
      amount: PositiveAmount[RealMoney],
      origin: PaymentOrigin): EitherT[Future, CreateWithdrawalError, PaymentSessionStarted] =
    for {
      _ <- validatePunterCanWithdraw(punterId, amount)
      registeredUser <- getRegisteredUser(punterId)
      transactionAttempt <- EitherT.liftF(markTransaction(punterId, amount))
      redirectData <- startPayment(origin, transactionAttempt, registeredUser.details).leftWiden[CreateWithdrawalError]
    } yield redirectData

  private def validatePunterCanWithdraw(
      punterId: PunterId,
      amount: PositiveAmount[RealMoney]): EitherT[Future, CreateWithdrawalError, Unit] =
    preconditions.assertPunterCanWithdrawAmount(punterId, amount.value.moneyAmount).leftMap {
      case _: NotEnoughFunds         => InsufficientFunds
      case _: NotAllowedToWithdraw   => PunterIsNotAllowedToWithdraw
      case _: MissingPunterProfile   => PunterProfileNotFound
      case _: MissingWallet          => WalletNotFound
      case _: TooSmallWithdrawAmount => CreateWithdrawal.TooSmallWithdrawAmount
    }

  private def markTransaction(punterId: PunterId, amount: PositiveAmount[RealMoney]): Future[PaymentTransaction] = {
    val transaction =
      PaymentTransaction.create(
        punterId,
        TransactionId(uuidGenerator.generate()),
        PaymentDirection.Withdrawal,
        amount.value.moneyAmount)
    transactions.upsert(transaction).map(_ => transaction)
  }

  private def getRegisteredUser(punterId: PunterId): EitherT[Future, CreateWithdrawalError, RegisteredUser] =
    KeycloakHelpers.getRegisteredUser[CreateWithdrawalError](
      authenticationRepository,
      puntersRepository,
      punterId,
      RegisteredUserNotFound,
      PunterProfileNotFound)

  private def startPayment(
      origin: PaymentOrigin,
      transaction: PaymentTransaction,
      userDetails: UserDetails): EitherT[Future, PaymentGatewayIssue.type, PaymentSessionStarted] =
    paymentsService.startPayment(origin, transaction, userDetails).leftMap(_ => PaymentGatewayIssue)
}

object CreateWithdrawal {
  sealed trait CreateWithdrawalError
  final case object PunterProfileNotFound extends CreateWithdrawalError
  final case object RegisteredUserNotFound extends CreateWithdrawalError
  final case object WalletNotFound extends CreateWithdrawalError
  final case object InsufficientFunds extends CreateWithdrawalError
  final case object PaymentGatewayIssue extends CreateWithdrawalError
  final case object PunterIsNotAllowedToWithdraw extends CreateWithdrawalError
  final case object TooSmallWithdrawAmount extends CreateWithdrawalError
}
