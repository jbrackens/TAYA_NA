package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.bifunctor._

import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.CreateDeposit._
import phoenix.payments.application.DepositPreconditions.DepositLimitsExceeded
import phoenix.payments.application.DepositPreconditions.MissingPunterProfile
import phoenix.payments.application.DepositPreconditions.MissingWallet
import phoenix.payments.application.DepositPreconditions.NotAllowedToDeposit
import phoenix.payments.application.DepositPreconditions.TooSmallDeposit
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

private[payments] final class CreateDeposit(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    paymentsService: PaymentsService,
    transactions: TransactionRepository,
    uuidGenerator: UUIDGenerator)(implicit ec: ExecutionContext) {

  private val preconditions = new DepositPreconditions(punters, wallets)

  def forPunter(
      punterId: PunterId,
      amount: PositiveAmount[RealMoney],
      origin: PaymentOrigin): EitherT[Future, CreateDepositError, PaymentSessionStarted] =
    for {
      _ <- validatePunterCanDeposit(punterId, amount)
      registeredUser <- getRegisteredUser(punterId)
      transactionAttempt <- EitherT.liftF(markTransaction(punterId, amount))
      redirectData <- startPayment(origin, transactionAttempt, registeredUser.details).leftWiden[CreateDepositError]
    } yield redirectData

  private def markTransaction(punterId: PunterId, amount: PositiveAmount[RealMoney]): Future[PaymentTransaction] = {
    val transaction =
      PaymentTransaction.create(
        punterId,
        TransactionId(uuidGenerator.generate()),
        PaymentDirection.Deposit,
        amount.value.moneyAmount)
    transactions.upsert(transaction).map(_ => transaction)
  }

  private def validatePunterCanDeposit(
      punterId: PunterId,
      amount: PositiveAmount[RealMoney]): EitherT[Future, CreateDepositError, Unit] =
    preconditions.assertPunterCanDepositAmount(punterId, amount.value.moneyAmount).leftMap {
      case _: DepositLimitsExceeded => DepositAmountExceedsLimit
      case _: NotAllowedToDeposit   => PunterIsNotAllowedToDeposit
      case _: TooSmallDeposit       => TooSmallDepositAmount
      case _: MissingPunterProfile  => PunterProfileNotFound
      case _: MissingWallet         => WalletNotFound
    }

  private def getRegisteredUser(punterId: PunterId): EitherT[Future, CreateDepositError, RegisteredUser] =
    KeycloakHelpers.getRegisteredUser[CreateDepositError](
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

object CreateDeposit {
  sealed trait CreateDepositError
  final case object PunterProfileNotFound extends CreateDepositError
  final case object RegisteredUserNotFound extends CreateDepositError
  final case object WalletNotFound extends CreateDepositError
  final case object DepositAmountExceedsLimit extends CreateDepositError
  final case object TooSmallDepositAmount extends CreateDepositError
  final case object PaymentGatewayIssue extends CreateDepositError
  final case object PunterIsNotAllowedToDeposit extends CreateDepositError
}
