package phoenix.wallets

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import cats.syntax.functor._
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.projections.ProjectionEventHandler
import phoenix.wallets.WalletActorProtocol.events._
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.BetTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.PaymentTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.PaymentMethod

private[wallets] class WalletsProjectionHandler(repository: WalletTransactionsRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[WalletEvent] {

  override def process(envelope: EventEnvelope[WalletEvent]): Future[Done] =
    WalletsProjectionHandler.handle(repository)(envelope.event).as(Done)
}

private[wallets] object WalletsProjectionHandler {
  private val log: Logger = LoggerFactory.getLogger(this.objectName)

  def handle(repository: WalletTransactionsRepository)(event: WalletEvent)(implicit
      ec: ExecutionContext): Future[Unit] =
    event match {
      case event @ AdjustingFundsDeposited(walletId, _, _, paymentMethod, _, _) =>
        repository.save(buildWalletTransaction(walletId, reservationId = None, event.transaction, Some(paymentMethod)))

      case event @ AdjustingFundsWithdrawn(walletId, _, _, paymentMethod, _, _) =>
        repository.save(buildWalletTransaction(walletId, reservationId = None, event.transaction, Some(paymentMethod)))

      case event @ FundsDeposited(walletId, _, _, paymentMethod, _, _) =>
        repository.save(buildWalletTransaction(walletId, reservationId = None, event.transaction, Some(paymentMethod)))

      case event @ FundsWithdrawn(walletId, _, _, paymentMethod, _, _) =>
        repository.save(buildWalletTransaction(walletId, reservationId = None, event.transaction, Some(paymentMethod)))

      case event @ FundsReservedForBet(walletId, reservationId, _, _, _) =>
        repository.save(buildWalletTransaction(walletId, Some(reservationId), event.transaction, paymentMethod = None))

      case event @ BetVoided(walletId, reservationId, _, _, _) =>
        repository.save(buildWalletTransaction(walletId, Some(reservationId), event.transaction, paymentMethod = None))

      case event @ BetPushed(walletId, reservationId, _, _, _) =>
        repository.save(buildWalletTransaction(walletId, Some(reservationId), event.transaction, paymentMethod = None))

      case event @ BetCancelled(walletId, reservationId, _, _, _) =>
        repository.save(buildWalletTransaction(walletId, Some(reservationId), event.transaction, paymentMethod = None))

      case event @ BetWon(walletId, reservationId, _, _, _) =>
        repository.save(buildWalletTransaction(walletId, Some(reservationId), event.transaction, paymentMethod = None))

      case event @ BetLost(walletId, reservationId, _, _, _) =>
        repository.save(buildWalletTransaction(walletId, Some(reservationId), event.transaction, paymentMethod = None))

      case event @ FundsReservedForWithdrawal(walletId, reservation, _, _) =>
        repository.save(
          buildWalletTransaction(
            walletId,
            Some(reservation.reservationId),
            event.transaction,
            Some(reservation.paymentMethod)))

      case event @ WithdrawalConfirmed(walletId, reservation, _, _, _) =>
        repository.save(
          buildWalletTransaction(
            walletId,
            Some(reservation.reservationId),
            event.transaction,
            Some(reservation.paymentMethod)))

      case event @ WithdrawalCancelled(walletId, reservation, _, _, _) =>
        repository.save(
          buildWalletTransaction(
            walletId,
            Some(reservation.reservationId),
            event.transaction,
            Some(reservation.paymentMethod)))

      case event @ BetResettled(walletId, _, _, _, _, _) =>
        repository.save(buildWalletTransaction(walletId, None, event.transaction, None))

      case _: WalletCreated | _: ResponsibilityCheckAcceptanceRequested | _: ResponsibilityCheckAccepted |
          _: PunterUnsuspendApproved | _: PunterUnsuspendRejected | _: NegativeBalance =>
        Future { log.debug(s"Wallets projection handler received $event") }
    }

  private def buildWalletTransaction(
      walletId: WalletId,
      reservationId: Option[ReservationId],
      transaction: Transaction,
      paymentMethod: Option[PaymentMethod]): WalletTransaction =
    WalletTransaction(
      reservationId = reservationId.map(_.unwrap),
      transactionId = transaction.transactionId,
      walletId = walletId,
      reason = transaction.reason,
      transactionAmount = DefaultCurrencyMoney(transaction.amount),
      createdAt = transaction.timestamp,
      preTransactionBalance = DefaultCurrencyMoney(transaction.previousBalance.available),
      postTransactionBalance = DefaultCurrencyMoney(transaction.currentBalance.available),
      betId = transaction match {
        case _: PaymentTransaction          => None
        case betTransaction: BetTransaction => Some(betTransaction.bet.betId)
      },
      externalId = None,
      paymentMethod = paymentMethod)
}
