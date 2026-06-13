package phoenix.wallets

import java.time.OffsetDateTime

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import io.scalaland.chimney.dsl._

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason._
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.PaymentMethod

sealed trait TransactionCategory extends EnumEntry with UpperSnakecase

sealed trait BetTransactionCategory extends TransactionCategory

object BetTransactionCategory extends Enum[BetTransactionCategory] {
  lazy val values = findValues

  final case object BetPlacement extends BetTransactionCategory
  final case object BetSettlement extends BetTransactionCategory
}

sealed trait PaymentTransactionCategory extends TransactionCategory

object PaymentTransactionCategory extends Enum[PaymentTransactionCategory] {
  lazy val values = findValues

  final case object AdjustmentDeposit extends PaymentTransactionCategory
  final case object AdjustmentWithdrawal extends PaymentTransactionCategory
  final case object Deposit extends PaymentTransactionCategory
  final case object Withdrawal extends PaymentTransactionCategory
}

object TransactionCategory extends Enum[TransactionCategory] {

  lazy val values = BetTransactionCategory.values ++ PaymentTransactionCategory.values

  def fromReason(reason: TransactionReason): TransactionCategory = {
    import BetTransactionCategory._
    import PaymentTransactionCategory._

    reason match {
      case FundsReservedForBet                                                                     => BetPlacement
      case BetWon | BetLost | BetVoided | BetPushed | BetCancelled | BetResettled                  => BetSettlement
      case AdjustingFundsDeposited                                                                 => AdjustmentDeposit
      case FundsDeposited                                                                          => Deposit
      case AdjustingFundsWithdrawn                                                                 => AdjustmentWithdrawal
      case FundsWithdrawn | FundsReservedForWithdrawal | WithdrawalConfirmed | WithdrawalCancelled => Withdrawal
    }
  }

  def correspondingReasonsFor(category: TransactionCategory): Seq[TransactionReason] = {
    TransactionReason.values.filter(reason => fromReason(reason) == category)
  }
}

sealed trait TransactionStatus extends EnumEntry with UpperSnakecase

object TransactionStatus extends Enum[TransactionStatus] {
  val values = findValues
  final case object Cancelled extends TransactionStatus
  final case object Completed extends TransactionStatus
  final case object Pending extends TransactionStatus

  def fromReason(reason: TransactionReason): TransactionStatus =
    reason match {
      case FundsReservedForBet | FundsReservedForWithdrawal => Pending
      case BetWon | BetLost | AdjustingFundsDeposited | AdjustingFundsWithdrawn | FundsDeposited | FundsWithdrawn |
          WithdrawalConfirmed | BetResettled =>
        Completed
      case WithdrawalCancelled | BetVoided | BetPushed | BetCancelled => Cancelled
    }

  def correspondingReasonsFor(category: TransactionStatus): Seq[TransactionReason] = {
    TransactionReason.values.filter(reason => fromReason(reason) == category)
  }
}

sealed trait WalletTransactionView {
  val reservationId: Option[String]
  val transactionId: String
  val walletId: WalletId
  val transactionAmount: DefaultCurrencyMoney
  val createdAt: OffsetDateTime
  val status: TransactionStatus
  val preTransactionBalance: DefaultCurrencyMoney
  val postTransactionBalance: DefaultCurrencyMoney
  val category: TransactionCategory
}

final case class WalletBetTransactionView(
    reservationId: Option[String],
    transactionId: String,
    walletId: WalletId,
    transactionAmount: DefaultCurrencyMoney,
    createdAt: OffsetDateTime,
    status: TransactionStatus,
    preTransactionBalance: DefaultCurrencyMoney,
    postTransactionBalance: DefaultCurrencyMoney,
    category: BetTransactionCategory,
    betId: BetId)
    extends WalletTransactionView

final case class WalletPaymentTransactionView(
    reservationId: Option[String],
    transactionId: String,
    walletId: WalletId,
    transactionAmount: DefaultCurrencyMoney,
    createdAt: OffsetDateTime,
    status: TransactionStatus,
    preTransactionBalance: DefaultCurrencyMoney,
    postTransactionBalance: DefaultCurrencyMoney,
    category: PaymentTransactionCategory,
    externalId: Option[String],
    paymentMethod: PaymentMethod)
    extends WalletTransactionView

object WalletTransactionView {
  def fromWalletTransaction(walletTransaction: WalletTransaction): WalletTransactionView = {
    val category = TransactionCategory.fromReason(walletTransaction.reason)
    val status = TransactionStatus.fromReason(walletTransaction.reason)
    category match {
      case betCategory: BetTransactionCategory =>
        walletTransaction
          .into[WalletBetTransactionView]
          .withFieldConst(_.category, betCategory)
          .withFieldConst(_.status, status)
          .enableUnsafeOption // for betId
          .transform

      case paymentCategory: PaymentTransactionCategory =>
        walletTransaction
          .into[WalletPaymentTransactionView]
          .withFieldConst(_.category, paymentCategory)
          .withFieldConst(_.status, status)
          .enableUnsafeOption // for paymentId
          .transform
    }
  }
}
