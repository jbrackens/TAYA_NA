package phoenix.payments.application
import phoenix.payments.domain.PaymentMethod
import phoenix.payments.domain.{PaymentMethod => PXPPaymentMethod}
import phoenix.wallets.domain.{PaymentMethod => WalletPaymentMethod}

private[application] object PaymentMethodAdapter {

  def adapt(pxpPaymentMethod: PXPPaymentMethod): WalletPaymentMethod =
    pxpPaymentMethod match {
      case PaymentMethod.VisaDeposit    => WalletPaymentMethod.CreditCardPaymentMethod
      case PaymentMethod.VisaWithdrawal => WalletPaymentMethod.CreditCardPaymentMethod
      case PaymentMethod.CashWithdrawal => WalletPaymentMethod.CashWithdrawalPaymentMethod
      case PaymentMethod.CashDeposit    => WalletPaymentMethod.CashDepositPaymentMethod
    }
}
