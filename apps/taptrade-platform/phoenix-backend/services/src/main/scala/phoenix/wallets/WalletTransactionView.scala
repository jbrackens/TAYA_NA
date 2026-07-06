package phoenix.wallets

import java.time.OffsetDateTime

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase
import io.scalaland.chimney.dsl._

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.prediction.infrastructure.PredictionOrderContextView
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
      case FundsReservedForBet | FundsReservedForPrediction                                         => BetPlacement
      case BetWon | BetLost | BetVoided | BetPushed | BetCancelled | BetResettled |
          PredictionWon | PredictionLost | PredictionVoided | PredictionPushed | PredictionCancelled |
          PredictionResettled =>
        BetSettlement
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
      case FundsReservedForBet | FundsReservedForPrediction | FundsReservedForWithdrawal => Pending
      case BetWon | BetLost | AdjustingFundsDeposited | AdjustingFundsWithdrawn | FundsDeposited | FundsWithdrawn |
          WithdrawalConfirmed | BetResettled | PredictionWon | PredictionLost | PredictionResettled =>
        Completed
      case WithdrawalCancelled | BetVoided | BetPushed | BetCancelled | PredictionVoided | PredictionPushed |
          PredictionCancelled =>
        Cancelled
    }

  def correspondingReasonsFor(category: TransactionStatus): Seq[TransactionReason] = {
    TransactionReason.values.filter(reason => fromReason(reason) == category)
  }
}

sealed trait WalletProduct extends EnumEntry with UpperSnakecase

object WalletProduct extends Enum[WalletProduct] {
  val values = findValues
  final case object Sportsbook extends WalletProduct
  final case object Prediction extends WalletProduct

  def fromReason(reason: TransactionReason): WalletProduct =
    reason match {
      case TransactionReason.FundsReservedForPrediction | TransactionReason.PredictionWon |
          TransactionReason.PredictionLost | TransactionReason.PredictionVoided | TransactionReason.PredictionPushed |
          TransactionReason.PredictionCancelled | TransactionReason.PredictionResettled =>
        Prediction
      case _ => Sportsbook
    }

  def correspondingReasonsFor(product: WalletProduct): Seq[TransactionReason] =
    TransactionReason.values.filter(reason => fromReason(reason) == product)
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
  val product: WalletProduct
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
    product: WalletProduct,
    betId: BetId,
    predictionContext: Option[PredictionOrderContextView])
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
    product: WalletProduct,
    externalId: Option[String],
    paymentMethod: PaymentMethod)
    extends WalletTransactionView

object WalletTransactionView {
  def fromWalletTransaction(
      walletTransaction: WalletTransaction,
      predictionContext: Option[PredictionOrderContextView] = None): WalletTransactionView = {
    val category = TransactionCategory.fromReason(walletTransaction.reason)
    val status = TransactionStatus.fromReason(walletTransaction.reason)
    val product = WalletProduct.fromReason(walletTransaction.reason)
    category match {
      case betCategory: BetTransactionCategory =>
        walletTransaction
          .into[WalletBetTransactionView]
          .withFieldConst(_.category, betCategory)
          .withFieldConst(_.status, status)
          .withFieldConst(_.product, product)
          .withFieldConst(_.predictionContext, predictionContext.filter(_ => product == WalletProduct.Prediction))
          .enableUnsafeOption // for betId
          .transform

      case paymentCategory: PaymentTransactionCategory =>
        walletTransaction
          .into[WalletPaymentTransactionView]
          .withFieldConst(_.category, paymentCategory)
          .withFieldConst(_.status, status)
          .withFieldConst(_.product, product)
          .enableUnsafeOption // for paymentId
          .transform
    }
  }
}
