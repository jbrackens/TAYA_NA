package phoenix.wallets

import java.time.OffsetDateTime
import java.util.UUID

import scala.collection.immutable.IndexedSeq
import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.EitherT
import enumeratum.EnumEntry.UpperSnakecase
import enumeratum._

import phoenix.bets.BetEntity.BetId
import phoenix.core.PotentialReturn
import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.MoneyAmount._
import phoenix.core.currency.PositiveAmount
import phoenix.core.odds.Odds
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.http.routes.EndpointInputs.TimeRange
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.sharding.PhoenixAkkaId
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.BetTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.PaymentTransaction
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.DebitFundsReason
import phoenix.wallets.domain.Deposits
import phoenix.wallets.domain.Funds
import phoenix.wallets.domain.Funds.BonusFunds
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.ResponsibilityCheckStatus

/**
 * Wallets Bounded Context
 *
 * Exposes public API to communicate with Wallets in our system.
 */
trait WalletsBoundedContext {
  def createWallet(walletId: WalletId, initialBalance: Balance = Balance.initial)(implicit
      ec: ExecutionContext): EitherT[Future, WalletAlreadyExistsError, Balance]

  def deposit(
      walletId: WalletId,
      funds: PositiveAmount[RealMoney],
      reason: CreditFundsReason,
      paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Balance]

  // TODO (PHXD-682): this is there so that we're able to decrease wallet's balance, it should be named differently
  def withdraw(
      walletId: WalletId,
      withdrawal: PositiveAmount[RealMoney],
      reason: DebitFundsReason,
      paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WithdrawError, Balance]

  def reserveForWithdrawal(walletId: WalletId, withdrawal: WithdrawalReservation)(implicit
      ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved]

  def finalizeWithdrawal(walletId: WalletId, reservationId: ReservationId, outcome: WithdrawalOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, WithdrawalFinalizationError, Balance]

  def reserveForBet(walletId: WalletId, bet: Bet)(implicit
      ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved]

  def finalizeBet(walletId: WalletId, reservationId: ReservationId, outcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance]

  def refinalizeBet(walletId: WalletId, bet: Bet, newOutcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance]

  def reserveForPrediction(walletId: WalletId, bet: Bet)(implicit
      ec: ExecutionContext): EitherT[Future, ReservationError, WalletFundsReserved]

  def finalizePrediction(walletId: WalletId, reservationId: ReservationId, outcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance]

  def refinalizePrediction(walletId: WalletId, bet: Bet, newOutcome: BetPlacementOutcome)(implicit
      ec: ExecutionContext): EitherT[Future, BetFinalizationError, Balance]

  def currentBalance(walletId: WalletId)(implicit ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Balance]

  def walletTransactions(query: WalletTransactionsQuery, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[WalletTransaction]]

  def allWalletTransactions(query: WalletTransactionsQuery)(implicit
      ec: ExecutionContext): Source[WalletTransaction, NotUsed]

  def depositHistory(walletId: WalletId)(implicit ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Deposits]

  def findResponsibilityCheckStatus(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, ResponsibilityCheckStatus]

  def acceptResponsibilityCheck(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit]

  def requestResponsibilityCheckAcceptance(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit]

  def requestBalanceCheckForSuspend(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit]

  def requestBalanceCheckForUnsuspend(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Unit]

  def financialSummary(walletId: WalletId)(implicit
      ec: ExecutionContext): EitherT[Future, WalletNotFoundError, FinancialSummary]
}

object WalletsBoundedContextProtocol {
  sealed trait WithdrawalOutcome

  object WithdrawalOutcome {
    final case class Confirmed(confirmedBy: ConfirmationOrigin) extends WithdrawalOutcome
    final case class Rejected(rejectedBy: RejectionOrigin) extends WithdrawalOutcome
  }

  sealed trait ConfirmationOrigin

  object ConfirmationOrigin {
    final case object PaymentGateway extends ConfirmationOrigin
    final case class BackofficeWorker(adminId: AdminId) extends ConfirmationOrigin
  }

  sealed trait RejectionOrigin

  object RejectionOrigin {
    final case object PaymentGateway extends RejectionOrigin
    final case class BackofficeWorker(adminId: AdminId, reason: String) extends RejectionOrigin
  }

  sealed trait BetPlacementOutcome

  object BetPlacementOutcome {
    final case object Won extends BetPlacementOutcome
    final case object Lost extends BetPlacementOutcome
    final case object Voided extends BetPlacementOutcome
    final case object Pushed extends BetPlacementOutcome
    final case object Cancelled extends BetPlacementOutcome
  }

  // Responses
  case class WalletFundsReserved(reservationId: ReservationId, balance: Balance)

  // Errors
  sealed trait WithdrawError
  sealed trait ReservationError
  sealed trait BetFinalizationError
  sealed trait WithdrawalFinalizationError
  sealed trait DepositFinalizationError

  final case class WalletAlreadyExistsError(id: WalletId)

  final case class InsufficientFundsError(id: WalletId) extends ReservationError with WithdrawError

  final case class UnexpectedOutcomeError(outcome: BetPlacementOutcome) extends BetFinalizationError

  final case class WalletNotFoundError(id: WalletId)
      extends WithdrawError
      with ReservationError
      with BetFinalizationError
      with WithdrawalFinalizationError
      with DepositFinalizationError

  final case class ReservationNotFoundError(walletId: WalletId, reservationId: ReservationId)
      extends BetFinalizationError
      with WithdrawalFinalizationError
      with DepositFinalizationError

  final case class ReservationAlreadyExistsError(walletId: WalletId, reservationId: ReservationId)
      extends ReservationError

  final case class UnexpectedWalletErrorException(underlying: Throwable)
      extends RuntimeException(s"Unexpected error [${underlying.getMessage}]")

  type TransactionId = String

  final case class WalletId(value: String) extends PhoenixAkkaId {
    def owner: PunterId = PunterId(value)
  }

  object WalletId {
    def deriveFrom(punterId: PunterId): WalletId = WalletId(punterId.value)
  }

  case class Balance(realMoney: RealMoney, bonusFunds: Seq[BonusFunds] = Seq.empty) {
    def +(funds: Funds): Balance = {
      funds match {
        case realMoney: RealMoney   => copy(realMoney = this.realMoney + realMoney)
        case bonusFunds: BonusFunds => copy(bonusFunds = bonusFunds +: this.bonusFunds)
      }
    }
  }

  object Balance {
    val initial: Balance =
      Balance(realMoney = RealMoney(MoneyAmount(0)))
  }

  final case class AccountBalance(available: MoneyAmount, blocked: BlockedFunds) {
    def changeAvailable(availableFundsChange: MoneyAmount => MoneyAmount): AccountBalance =
      copy(available = availableFundsChange(available))

    def changeBlockedForBets(blockedForBetsChange: MoneyAmount => MoneyAmount): AccountBalance =
      copy(blocked = blocked.copy(blockedForBets = blockedForBetsChange(blocked.blockedForBets)))

    def changeBlockedForWithdrawal(blockedForWithdrawalChange: MoneyAmount => MoneyAmount): AccountBalance =
      copy(blocked = blocked.copy(blockedForWithdrawals = blockedForWithdrawalChange(blocked.blockedForWithdrawals)))

    def isNegative(): Boolean =
      available < MoneyAmount(0)
  }
  final case class BlockedFunds(blockedForBets: MoneyAmount, blockedForWithdrawals: MoneyAmount)

  sealed trait Transaction {
    type Reason <: TransactionReason

    def transactionId: TransactionId
    def reason: Reason
    def amount: MoneyAmount
    def previousBalance: AccountBalance
    def timestamp: OffsetDateTime

    def currentBalance: AccountBalance =
      this match {
        case PaymentTransaction(_, reason, amount, _, previousBalance, _) =>
          reason match {
            case TransactionReason.AdjustingFundsDeposited =>
              previousBalance.changeAvailable(_ + amount)

            case TransactionReason.AdjustingFundsWithdrawn =>
              previousBalance.changeAvailable(_ - amount)

            case TransactionReason.FundsDeposited =>
              previousBalance.changeAvailable(_ + amount)

            case TransactionReason.FundsWithdrawn =>
              previousBalance.changeAvailable(_ - amount)

            case TransactionReason.FundsReservedForWithdrawal =>
              previousBalance.changeAvailable(_ - amount).changeBlockedForWithdrawal(_ + amount)

            case TransactionReason.WithdrawalConfirmed =>
              previousBalance.changeBlockedForWithdrawal(_ - amount)

            case TransactionReason.WithdrawalCancelled =>
              previousBalance.changeAvailable(_ + amount).changeBlockedForWithdrawal(_ - amount)
          }

        case BetTransaction(_, reason, amount, previousBalance, bet, _) =>
          reason match {
            case TransactionReason.FundsReservedForBet =>
              previousBalance.changeAvailable(_ - bet.stake.value).changeBlockedForBets(_ + bet.stake.value)

            case TransactionReason.FundsReservedForPrediction =>
              previousBalance.changeAvailable(_ - bet.stake.value).changeBlockedForBets(_ + bet.stake.value)

            case TransactionReason.BetWon =>
              previousBalance.changeAvailable(_ + bet.winnerFunds.value).changeBlockedForBets(_ - bet.stake.value)

            case TransactionReason.PredictionWon =>
              previousBalance.changeAvailable(_ + bet.winnerFunds.value).changeBlockedForBets(_ - bet.stake.value)

            case TransactionReason.BetLost =>
              previousBalance.changeBlockedForBets(_ - bet.stake.value)

            case TransactionReason.PredictionLost =>
              previousBalance.changeBlockedForBets(_ - bet.stake.value)

            case TransactionReason.BetVoided =>
              previousBalance.changeAvailable(_ + bet.stake.value).changeBlockedForBets(_ - bet.stake.value)

            case TransactionReason.PredictionVoided =>
              previousBalance.changeAvailable(_ + bet.stake.value).changeBlockedForBets(_ - bet.stake.value)

            case TransactionReason.BetPushed =>
              previousBalance.changeAvailable(_ + bet.stake.value).changeBlockedForBets(_ - bet.stake.value)

            case TransactionReason.PredictionPushed =>
              previousBalance.changeAvailable(_ + bet.stake.value).changeBlockedForBets(_ - bet.stake.value)

            case TransactionReason.BetCancelled =>
              previousBalance.changeAvailable(_ + bet.stake.value).changeBlockedForBets(_ - bet.stake.value)

            case TransactionReason.PredictionCancelled =>
              previousBalance.changeAvailable(_ + bet.stake.value).changeBlockedForBets(_ - bet.stake.value)

            case TransactionReason.BetResettled =>
              previousBalance.changeAvailable(_ + amount)

            case TransactionReason.PredictionResettled =>
              previousBalance.changeAvailable(_ + amount)
          }
      }
  }

  object Transaction {
    final case class PaymentTransaction(
        transactionId: TransactionId,
        reason: TransactionReason.PaymentReason,
        amount: MoneyAmount,
        paymentMethod: PaymentMethod,
        previousBalance: AccountBalance,
        timestamp: OffsetDateTime)
        extends Transaction {

      override type Reason = TransactionReason.PaymentReason
    }

    final case class BetTransaction(
        transactionId: TransactionId,
        reason: TransactionReason.BetReason,
        amount: MoneyAmount,
        previousBalance: AccountBalance,
        bet: Bet,
        timestamp: OffsetDateTime)
        extends Transaction {

      override type Reason = TransactionReason.BetReason
    }
  }

  sealed trait TransactionReason extends EnumEntry with UpperSnakecase

  object TransactionReason extends Enum[TransactionReason] {
    val values: IndexedSeq[TransactionReason] = findValues

    sealed trait PaymentReason extends TransactionReason
    sealed trait BetReason extends TransactionReason

    final case object AdjustingFundsDeposited extends PaymentReason
    final case object AdjustingFundsWithdrawn extends PaymentReason
    final case object FundsDeposited extends PaymentReason
    final case object FundsWithdrawn extends PaymentReason
    final case object FundsReservedForWithdrawal extends PaymentReason
    final case object WithdrawalConfirmed extends PaymentReason
    final case object WithdrawalCancelled extends PaymentReason

    final case object FundsReservedForBet extends BetReason
    final case object FundsReservedForPrediction extends BetReason
    final case object BetWon extends BetReason
    final case object PredictionWon extends BetReason
    final case object BetLost extends BetReason
    final case object PredictionLost extends BetReason
    final case object BetVoided extends BetReason
    final case object PredictionVoided extends BetReason
    final case object BetPushed extends BetReason
    final case object PredictionPushed extends BetReason
    final case object BetCancelled extends BetReason
    final case object PredictionCancelled extends BetReason
    final case object BetResettled extends BetReason
    final case object PredictionResettled extends BetReason
  }

  case class ReservationId(unwrap: String)

  object ReservationId {
    def create(): ReservationId = ReservationId(UUID.randomUUID().toString)
  }

  final case class Bet(betId: BetId, stake: RealMoney, odds: Odds) {
    def winnerFunds: RealMoney = PotentialReturn(stake, odds)
  }

  final case class WithdrawalReservation(
      reservationId: ReservationId,
      funds: PositiveAmount[RealMoney],
      paymentMethod: PaymentMethod)

  final case class WalletTransactionsQuery(
      walletId: WalletId,
      timeRange: TimeRange,
      categories: Set[TransactionCategory],
      products: Set[WalletProduct] = WalletProduct.values.toSet)

  final case class FinancialSummary(
      currentBalance: RealMoney,
      openedBets: RealMoney,
      pendingWithdrawals: RealMoney,
      lifetimeDeposits: RealMoney,
      lifetimeWithdrawals: RealMoney) {
    val netCash: RealMoney = lifetimeDeposits - (lifetimeWithdrawals + pendingWithdrawals)
  }
}
