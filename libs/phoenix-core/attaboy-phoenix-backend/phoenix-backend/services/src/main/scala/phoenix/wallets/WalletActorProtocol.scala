package phoenix.wallets

import java.time.OffsetDateTime

import akka.actor.typed.ActorRef

import phoenix.wallets.WalletActorProtocol.Responses.WalletResponse
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.BetTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.PaymentTransaction
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.DepositHistory
import phoenix.wallets.domain.Funds
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.ResponsibilityCheckStatus
import phoenix.wallets.infrastructure.akka.WalletsAkkaSerializable

object WalletActorProtocol {

  object commands {
    sealed trait WalletCommand extends WalletsAkkaSerializable {
      def walletId: WalletId
      val replyTo: ActorRef[WalletResponse]
    }

    sealed trait InitializationCommand extends WalletCommand

    sealed trait ActiveWalletCommand extends WalletCommand

    final case class CreateWallet(walletId: WalletId, initialBalance: Balance, replyTo: ActorRef[WalletResponse])
        extends InitializationCommand

    final case class GetCurrentBalance(walletId: WalletId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class GetCurrentFinances(walletId: WalletId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class GetDepositHistory(walletId: WalletId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class GetResponsibilityCheckStatus(walletId: WalletId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class AcceptResponsibilityCheck(walletId: WalletId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class RequestResponsibilityCheckAcceptance(walletId: WalletId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class DepositFunds(
        walletId: WalletId,
        funds: Funds,
        paymentMethod: PaymentMethod,
        replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class WithdrawFunds(
        walletId: WalletId,
        withdrawal: RealMoney,
        paymentMethod: PaymentMethod,
        replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class AdjustmentDepositFunds(
        walletId: WalletId,
        funds: Funds,
        paymentMethod: PaymentMethod,
        replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class AdjustmentWithdrawFunds(
        walletId: WalletId,
        withdrawal: RealMoney,
        paymentMethod: PaymentMethod,
        replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class ReserveFundsForBet(walletId: WalletId, bet: Bet, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class ReserveFundsForWithdrawal(
        walletId: WalletId,
        withdrawal: WithdrawalReservation,
        replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class ConfirmWithdrawal(
        walletId: WalletId,
        reservationId: ReservationId,
        confirmedBy: ConfirmationOrigin,
        replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class RejectWithdrawal(
        walletId: WalletId,
        reservationId: ReservationId,
        cancelledBy: RejectionOrigin,
        replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class MarkBetVoided(walletId: WalletId, reservationId: ReservationId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class MarkBetPushed(walletId: WalletId, reservationId: ReservationId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class MarkBetCancelled(
        walletId: WalletId,
        reservationId: ReservationId,
        replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class MarkBetWon(walletId: WalletId, reservationId: ReservationId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class MarkBetLost(walletId: WalletId, reservationId: ReservationId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class ResettleBet(walletId: WalletId, bet: Bet, winner: Boolean, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class CheckBalanceForUnsuspend(walletId: WalletId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand

    final case class CheckBalanceForSuspend(walletId: WalletId, replyTo: ActorRef[WalletResponse])
        extends ActiveWalletCommand
  }

  object Responses {
    sealed trait WalletResponse extends WalletsAkkaSerializable

    sealed trait WalletFailure extends WalletResponse

    object Success {
      final case class CurrentBalance(walletId: WalletId, currentBalance: Balance) extends WalletResponse
      final case class CurrentFinances(
          walletId: WalletId,
          currentBalance: RealMoney,
          openedBets: RealMoney,
          pendingWithdrawals: RealMoney)
          extends WalletResponse
      final case class CurrentDepositHistory(walletId: WalletId, depositHistory: DepositHistory) extends WalletResponse
      final case class CurrentResponsibilityCheckStatus(walletId: WalletId, status: ResponsibilityCheckStatus)
          extends WalletResponse
      final case object ResponsibilityCheckAcceptedResponse extends WalletResponse
      final case object ResponsibilityCheckAcceptanceRequestedResponse extends WalletResponse
      final case class FundsReserved(reservationId: ReservationId, currentBalance: Balance) extends WalletResponse
      final case object BalanceCheckForUnsuspendAcceptedResponse extends WalletResponse
      final case object BalanceCheckForSuspendAcceptedResponse extends WalletResponse
    }

    object Failure {
      final case class WalletNotFound(walletId: WalletId) extends WalletFailure
      final case class AlreadyExists(walletId: WalletId) extends WalletFailure
      final case class InsufficientFunds(walletId: WalletId) extends WalletFailure
      final case class ReservationNotFound(walletId: WalletId, reservationId: ReservationId) extends WalletFailure
      final case class ReservationAlreadyExists(walletId: WalletId, reservationId: ReservationId) extends WalletFailure
      final case class UnhandledCommandResponse(walletId: WalletId) extends WalletFailure
    }
  }

  object events {
    sealed trait WalletEvent extends WalletsAkkaSerializable {
      def walletId: WalletId
    }
    sealed trait TransactionEvent extends WalletEvent {
      def transaction: Transaction
    }

    final case class WalletCreated(walletId: WalletId, balance: Balance, createdAt: OffsetDateTime) extends WalletEvent
    final case class FundsDeposited(
        walletId: WalletId,
        transactionId: TransactionId,
        funds: Funds,
        paymentMethod: PaymentMethod,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        PaymentTransaction(
          transactionId = transactionId,
          reason = TransactionReason.FundsDeposited,
          amount = funds.value.moneyAmount,
          paymentMethod = paymentMethod,
          previousBalance = previousBalance,
          timestamp = createdAt)
    }
    final case class FundsWithdrawn(
        walletId: WalletId,
        transactionId: TransactionId,
        withdrawal: RealMoney,
        paymentMethod: PaymentMethod,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        PaymentTransaction(
          transactionId = transactionId,
          reason = TransactionReason.FundsWithdrawn,
          amount = withdrawal.moneyAmount,
          paymentMethod = paymentMethod,
          previousBalance = previousBalance,
          timestamp = createdAt)
    }
    final case class AdjustingFundsDeposited(
        walletId: WalletId,
        transactionId: TransactionId,
        funds: Funds,
        paymentMethod: PaymentMethod,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        PaymentTransaction(
          transactionId = transactionId,
          reason = TransactionReason.AdjustingFundsDeposited,
          amount = funds.value.moneyAmount,
          paymentMethod = paymentMethod,
          previousBalance = previousBalance,
          timestamp = createdAt)
    }
    final case class AdjustingFundsWithdrawn(
        walletId: WalletId,
        transactionId: TransactionId,
        withdrawal: RealMoney,
        paymentMethod: PaymentMethod,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        PaymentTransaction(
          transactionId = transactionId,
          reason = TransactionReason.AdjustingFundsWithdrawn,
          amount = withdrawal.moneyAmount,
          paymentMethod = paymentMethod,
          previousBalance = previousBalance,
          timestamp = createdAt)
    }
    final case class FundsReservedForWithdrawal(
        walletId: WalletId,
        withdrawal: WithdrawalReservation,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        PaymentTransaction(
          transactionId = withdrawal.reservationId.unwrap,
          reason = TransactionReason.FundsReservedForWithdrawal,
          amount = withdrawal.funds.value.moneyAmount,
          paymentMethod = withdrawal.paymentMethod,
          previousBalance = previousBalance,
          timestamp = createdAt)
    }
    final case class WithdrawalConfirmed(
        walletId: WalletId,
        withdrawal: WithdrawalReservation,
        confirmedBy: ConfirmationOrigin,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        PaymentTransaction(
          transactionId = withdrawal.reservationId.unwrap,
          reason = TransactionReason.WithdrawalConfirmed,
          amount = withdrawal.funds.value.moneyAmount,
          paymentMethod = withdrawal.paymentMethod,
          previousBalance = previousBalance,
          timestamp = createdAt)
    }
    final case class WithdrawalCancelled(
        walletId: WalletId,
        withdrawal: WithdrawalReservation,
        rejectedBy: RejectionOrigin,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        PaymentTransaction(
          transactionId = withdrawal.reservationId.unwrap,
          reason = TransactionReason.WithdrawalCancelled,
          amount = withdrawal.funds.value.moneyAmount,
          paymentMethod = withdrawal.paymentMethod,
          previousBalance = previousBalance,
          timestamp = createdAt)
    }
    final case class FundsReservedForBet(
        walletId: WalletId,
        reservationId: ReservationId,
        bet: Bet,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        BetTransaction(
          transactionId = reservationId.unwrap,
          reason = TransactionReason.FundsReservedForBet,
          amount = bet.stake.moneyAmount,
          previousBalance = previousBalance,
          bet = bet,
          timestamp = createdAt)
    }
    final case class BetVoided(
        walletId: WalletId,
        reservationId: ReservationId,
        bet: Bet,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        BetTransaction(
          transactionId = reservationId.unwrap,
          reason = TransactionReason.BetVoided,
          amount = bet.stake.moneyAmount,
          previousBalance = previousBalance,
          bet = bet,
          timestamp = createdAt)
    }
    final case class BetPushed(
        walletId: WalletId,
        reservationId: ReservationId,
        bet: Bet,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        BetTransaction(
          transactionId = reservationId.unwrap,
          reason = TransactionReason.BetPushed,
          amount = bet.stake.moneyAmount,
          previousBalance = previousBalance,
          bet = bet,
          timestamp = createdAt)
    }
    final case class BetCancelled(
        walletId: WalletId,
        reservationId: ReservationId,
        bet: Bet,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        BetTransaction(
          transactionId = reservationId.unwrap,
          reason = TransactionReason.BetCancelled,
          amount = bet.stake.moneyAmount,
          previousBalance = previousBalance,
          bet = bet,
          timestamp = createdAt)
    }
    final case class BetWon(
        walletId: WalletId,
        reservationId: ReservationId,
        bet: Bet,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        BetTransaction(
          transactionId = reservationId.unwrap,
          reason = TransactionReason.BetWon,
          amount = bet.winnerFunds.moneyAmount,
          previousBalance = previousBalance,
          bet = bet,
          timestamp = createdAt)
    }
    final case class BetLost(
        walletId: WalletId,
        reservationId: ReservationId,
        bet: Bet,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        BetTransaction(
          transactionId = reservationId.unwrap,
          reason = TransactionReason.BetLost,
          amount = bet.stake.moneyAmount,
          previousBalance = previousBalance,
          bet = bet,
          timestamp = createdAt)
    }
    final case class BetResettled(
        walletId: WalletId,
        transactionId: TransactionId,
        bet: Bet,
        winner: Boolean,
        previousBalance: AccountBalance,
        createdAt: OffsetDateTime)
        extends TransactionEvent {

      override def transaction: Transaction =
        BetTransaction(
          transactionId = transactionId,
          reason = TransactionReason.BetResettled,
          amount = if (winner) bet.winnerFunds.moneyAmount else bet.winnerFunds.negate.moneyAmount,
          previousBalance = previousBalance,
          bet = bet,
          timestamp = createdAt)
    }
    final case class ResponsibilityCheckAccepted(walletId: WalletId) extends WalletEvent
    final case class ResponsibilityCheckAcceptanceRequested(walletId: WalletId) extends WalletEvent
    final case class PunterUnsuspendApproved(walletId: WalletId) extends WalletEvent
    final case class PunterUnsuspendRejected(walletId: WalletId) extends WalletEvent
    final case class NegativeBalance(walletId: WalletId) extends WalletEvent
  }
}
