package phoenix.reports.domain.model.wallets

import phoenix.core.currency.MoneyAmount
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.BetTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction.PaymentTransaction
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.AdjustingFundsDeposited
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.AdjustingFundsWithdrawn
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.BetCancelled
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.BetLost
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.BetPushed
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.BetResettled
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.BetVoided
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.BetWon
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsDeposited
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsReservedForBet
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsReservedForWithdrawal
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.FundsWithdrawn
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.WithdrawalCancelled
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason.WithdrawalConfirmed

final case class Deposits(total: MoneyAmount) {
  def deposit(value: MoneyAmount): Deposits = copy(total + value)
}
object Deposits {
  val empty: Deposits = Deposits(MoneyAmount(0))
}
final case class Withdrawals(confirmed: MoneyAmount, cancelled: MoneyAmount, pending: MoneyAmount) {
  def confirmWithdrawal(value: MoneyAmount): Withdrawals = copy(confirmed = confirmed + value)
  def cancelWithdrawal(value: MoneyAmount): Withdrawals = copy(cancelled = cancelled + value)
  def pendingWithdrawal(value: MoneyAmount): Withdrawals = copy(pending = pending + value)
}
object Withdrawals {
  val empty: Withdrawals = Withdrawals(MoneyAmount(0), MoneyAmount(0), MoneyAmount(0))
}
final case class DailyBalance(opening: MoneyAmount, closing: MoneyAmount)
object DailyBalance {
  def fixed(amount: MoneyAmount): DailyBalance = DailyBalance(opening = amount, closing = amount)
}
final case class Lifetime(deposits: MoneyAmount, withdrawals: MoneyAmount)
object Lifetime {
  val empty: Lifetime = Lifetime(MoneyAmount(0), MoneyAmount(0))
}
final case class Turnover(total: MoneyAmount) {
  def plus(value: MoneyAmount): Turnover = copy(total = total + value)
  def subtract(value: MoneyAmount): Turnover = copy(total = total - value)
}
object Turnover {
  val empty: Turnover = Turnover(MoneyAmount(0))
}
final case class Adjustments(total: MoneyAmount) {
  def plus(value: MoneyAmount): Adjustments = copy(total = total + value)
  def subtract(value: MoneyAmount): Adjustments = copy(total = total - value)
}
object Adjustments {
  val empty: Adjustments = Adjustments(MoneyAmount(0))
}
final case class DailyWalletSummary(
    punterId: PunterId,
    day: ReportingPeriod.Day,
    deposits: Deposits,
    withdrawals: Withdrawals,
    adjustments: Adjustments,
    balance: DailyBalance,
    lifetime: Lifetime,
    turnover: Turnover) {
  def hasDeposits(): Boolean =
    deposits.total != MoneyAmount(0)

  def recordTransaction(transaction: Transaction): DailyWalletSummary =
    copy(
      deposits = updateDeposits(transaction),
      withdrawals = updateWithdrawals(transaction),
      adjustments = updateAdjustments(transaction),
      balance = updateBalance(transaction),
      lifetime = updateLifetime(transaction),
      turnover = updateTurnover(transaction))

  private def updateDeposits(transaction: Transaction): Deposits = {
    transaction match {
      case PaymentTransaction(_, FundsDeposited, amount, _, _, _) => deposits.deposit(amount)
      case _: PaymentTransaction | _: BetTransaction              => deposits
    }
  }

  private def updateWithdrawals(transaction: Transaction): Withdrawals =
    transaction match {
      case PaymentTransaction(_, FundsWithdrawn | WithdrawalConfirmed, amount, _, _, _) =>
        withdrawals.confirmWithdrawal(amount)
      case PaymentTransaction(_, FundsReservedForWithdrawal, amount, _, _, _) =>
        withdrawals.pendingWithdrawal(amount)
      case PaymentTransaction(_, WithdrawalCancelled, amount, _, _, _) => withdrawals.cancelWithdrawal(amount)
      case _: PaymentTransaction | _: BetTransaction                   => withdrawals
    }

  private def updateAdjustments(transaction: Transaction): Adjustments =
    transaction match {
      case PaymentTransaction(_, reason, amount, _, _, _) =>
        reason match {
          case AdjustingFundsDeposited => adjustments.plus(amount)
          case AdjustingFundsWithdrawn => adjustments.subtract(amount)
          case _                       => adjustments
        }
      case _ => adjustments
    }

  private def updateBalance(transaction: Transaction): DailyBalance = {
    val currentBalance = transaction.currentBalance
    balance.copy(closing = currentBalance.available)
  }

  private def updateLifetime(transaction: Transaction): Lifetime =
    transaction match {
      case PaymentTransaction(_, FundsDeposited, amount, _, _, _) =>
        lifetime.copy(deposits = lifetime.deposits + amount)
      case PaymentTransaction(_, FundsWithdrawn | WithdrawalConfirmed, amount, _, _, _) =>
        lifetime.copy(withdrawals = lifetime.withdrawals + amount)
      case _: PaymentTransaction | _: BetTransaction => lifetime
    }

  private def updateTurnover(transaction: Transaction): Turnover =
    transaction match {
      case BetTransaction(_, reason, _, _, bet, _) =>
        reason match {
          case FundsReservedForBet                                     => turnover.plus(bet.stake.value.moneyAmount)
          case BetCancelled                                            => turnover.subtract(bet.stake.value.moneyAmount)
          case BetWon | BetLost | BetVoided | BetPushed | BetResettled => turnover
        }
      case _: PaymentTransaction => turnover
    }
}

object DailyWalletSummary {
  def fromPreviousDay(previousDay: DailyWalletSummary, currentDay: ReportingPeriod.Day): DailyWalletSummary =
    previousDay.copy(
      day = currentDay,
      deposits = Deposits.empty,
      withdrawals = Withdrawals.empty,
      adjustments = Adjustments.empty,
      balance = DailyBalance.fixed(previousDay.balance.closing),
      lifetime = previousDay.lifetime,
      turnover = previousDay.turnover)

  def withBalance(
      initial: MoneyAmount,
      closing: MoneyAmount,
      punterId: PunterId,
      day: ReportingPeriod.Day): DailyWalletSummary =
    DailyWalletSummary(
      punterId,
      day,
      Deposits.empty,
      Withdrawals.empty,
      Adjustments.empty,
      DailyBalance(initial, closing),
      Lifetime.empty,
      Turnover.empty)

  def withFixedBalance(balance: MoneyAmount, punterId: PunterId, day: ReportingPeriod.Day): DailyWalletSummary =
    withBalance(initial = balance, closing = balance, punterId, day)
}
