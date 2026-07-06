package phoenix.wallets.domain
import phoenix.punters.PunterEntity.AdminId

sealed trait PaymentMethod

object PaymentMethod {
  final case object CreditCardPaymentMethod extends PaymentMethod
  final case object BankTransferPaymentMethod extends PaymentMethod
  final case object CashWithdrawalPaymentMethod extends PaymentMethod
  final case object CashDepositPaymentMethod extends PaymentMethod
  final case class BackOfficeManualPaymentMethod(details: String, adminUser: AdminId) extends PaymentMethod
  final case object ChequeWithdrawalPaymentMethod extends PaymentMethod
  final case object NotApplicablePaymentMethod extends PaymentMethod
}
