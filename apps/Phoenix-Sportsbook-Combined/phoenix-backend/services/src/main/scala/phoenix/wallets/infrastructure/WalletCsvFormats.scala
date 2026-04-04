package phoenix.wallets.infrastructure

import phoenix.wallets.WalletBetTransactionView
import phoenix.wallets.WalletPaymentTransactionView
import phoenix.wallets.WalletTransactionView
import phoenix.wallets.WalletProduct
import phoenix.wallets.domain.PaymentMethod._

object WalletCsvFormats {
  def walletTransactionViewCsvFormat(view: WalletTransactionView): Seq[String] =
    List(
      view.createdAt.toString,
      view.transactionId,
      view.status.entryName,
      paymentMethodField(view),
      view.category.entryName,
      view.product.entryName,
      view.transactionAmount.toString,
      view.postTransactionBalance.toString)

  private def paymentMethodField(view: WalletTransactionView): String =
    view match {
      case betView: WalletBetTransactionView =>
        if (betView.product == WalletProduct.Prediction) {
          betView.predictionContext
            .map { context =>
              val marketStatusSuffix = Option(context.marketStatus)
                .map(_.trim)
                .filter(_.nonEmpty)
                .map(status => s"; market_status=$status")
                .getOrElse("")
              val orderStatusSuffix = Option(context.orderStatus)
                .map(_.trim)
                .filter(_.nonEmpty)
                .map(status => s"; order_status=$status")
                .getOrElse("")
              val resolvedSuffix = context.winningOutcomeLabel
                .map(winningOutcome => s"; resolved_to=$winningOutcome")
                .getOrElse("")
              val reasonSuffix = context.settlementReason
                .filter(_.trim.nonEmpty)
                .map(reason => s"; reason=$reason")
                .getOrElse("")
              val settledBySuffix = context.settlementActor
                .filter(_.trim.nonEmpty)
                .map(actor => s"; settled_by=$actor")
                .getOrElse("")
              val previousStatusSuffix = context.previousSettlementStatus
                .filter(_.trim.nonEmpty)
                .map(status => s"; previous_status=$status")
                .getOrElse("")
              s"PREDICTION_MARKET(${context.marketTitle}$marketStatusSuffix; outcome=${context.outcomeLabel}$orderStatusSuffix$resolvedSuffix$reasonSuffix$settledBySuffix$previousStatusSuffix)"
            }
            .getOrElse("")
        } else {
          ""
        }
      case paymentView: WalletPaymentTransactionView =>
        paymentView.paymentMethod match {
          case CreditCardPaymentMethod       => "CREDIT_CARD_PAYMENT_METHOD"
          case BankTransferPaymentMethod     => "BANK_TRANSFER_PAYMENT_METHOD"
          case CashWithdrawalPaymentMethod   => "CASH_WITHDRAWAL_PAYMENT_METHOD"
          case CashDepositPaymentMethod      => "CASH_DEPOSIT_PAYMENT_METHOD"
          case ChequeWithdrawalPaymentMethod => "CHEQUE_WITHDRAWAL_PAYMENT_METHOD"
          case NotApplicablePaymentMethod    => "NOT_APPLICABLE_PAYMENT_METHOD"
          case BackOfficeManualPaymentMethod(details, adminPunterId) =>
            s"BACKOFFICE_MANUAL_PAYMENT_METHOD($details, ${adminPunterId.value})"
        }
    }
}
