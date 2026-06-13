package phoenix.wallets.infrastructure

import phoenix.wallets.WalletBetTransactionView
import phoenix.wallets.WalletPaymentTransactionView
import phoenix.wallets.WalletTransactionView
import phoenix.wallets.domain.PaymentMethod._

object WalletCsvFormats {
  def walletTransactionViewCsvFormat(view: WalletTransactionView): Seq[String] =
    List(
      view.createdAt.toString,
      view.transactionId,
      view.status.entryName,
      paymentMethodField(view),
      view.category.entryName,
      view.transactionAmount.toString,
      view.postTransactionBalance.toString)

  private def paymentMethodField(view: WalletTransactionView): String =
    view match {
      case _: WalletBetTransactionView => ""
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
