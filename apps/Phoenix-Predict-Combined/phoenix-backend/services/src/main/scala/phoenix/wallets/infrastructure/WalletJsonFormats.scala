package phoenix.wallets.infrastructure

import io.circe._
import io.circe.generic.semiauto._

import phoenix.bets.infrastructure.BetJsonFormats.betIdCodec
import phoenix.core.JsonFormats._
import phoenix.core.currency.CurrencyJsonFormats.defaultCurrencyMoneyCodec
import phoenix.prediction.infrastructure.PredictionOrderContextView
import phoenix.wallets.BetTransactionCategory
import phoenix.wallets.PaymentTransactionCategory
import phoenix.wallets.TransactionStatus
import phoenix.wallets.WalletBetTransactionView
import phoenix.wallets.WalletProduct
import phoenix.wallets.WalletPaymentTransactionView
import phoenix.wallets.WalletTransactionView
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.Funds.BonusFunds
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.PaymentMethod.BackOfficeManualPaymentMethod
import phoenix.wallets.domain.PaymentMethod.BankTransferPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CashDepositPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CashWithdrawalPaymentMethod
import phoenix.wallets.domain.PaymentMethod.ChequeWithdrawalPaymentMethod
import phoenix.wallets.domain.PaymentMethod.CreditCardPaymentMethod
import phoenix.wallets.domain.PaymentMethod.NotApplicablePaymentMethod

object WalletJsonFormats {
  implicit val walletIdCodec: Codec[WalletId] = Codec[String].bimap(_.value, WalletId.apply)

  implicit val transactionStatusCodec: Codec[TransactionStatus] = enumCodec(TransactionStatus)
  implicit val walletProductCodec: Codec[WalletProduct] = enumCodec(WalletProduct)
  implicit val predictionOrderContextViewCodec: Codec[PredictionOrderContextView] = deriveCodec

  implicit val realMoneyCodec: Codec[RealMoney] = deriveCodec
  implicit val bonusFundsCodec: Codec[BonusFunds] = deriveCodec
  implicit val walletBalanceCodec: Codec[Balance] = deriveCodec
  implicit object PaymentMethodEncoder extends Encoder[PaymentMethod] {
    override def apply(pm: PaymentMethod): Json =
      pm match {
        case CreditCardPaymentMethod       => Json.obj("type" -> Json.fromString("CREDIT_CARD_PAYMENT_METHOD"))
        case BankTransferPaymentMethod     => Json.obj("type" -> Json.fromString("BANK_TRANSFER_PAYMENT_METHOD"))
        case CashWithdrawalPaymentMethod   => Json.obj("type" -> Json.fromString("CASH_WITHDRAWAL_PAYMENT_METHOD"))
        case CashDepositPaymentMethod      => Json.obj("type" -> Json.fromString("CASH_DEPOSIT_PAYMENT_METHOD"))
        case ChequeWithdrawalPaymentMethod => Json.obj("type" -> Json.fromString("CHEQUE_WITHDRAWAL_PAYMENT_METHOD"))
        case NotApplicablePaymentMethod    => Json.obj("type" -> Json.fromString("NOT_APPLICABLE_PAYMENT_METHOD"))
        case BackOfficeManualPaymentMethod(details, adminPunterId) =>
          Json.obj(
            "type" -> Json.fromString("BACKOFFICE_MANUAL_PAYMENT_METHOD"),
            "details" -> Json.fromString(details),
            "adminPunterId" -> Json.fromString(adminPunterId.value))
      }
  }

  implicit object WalletTransactionViewEncoder extends Encoder[WalletTransactionView] {
    private implicit val betTransactionCategory: Codec[BetTransactionCategory] = enumCodec(BetTransactionCategory)
    private implicit val walletBetTransactionViewCodec: Codec[WalletBetTransactionView] = deriveCodec
    private implicit val paymentTransactionCategory: Codec[PaymentTransactionCategory] = enumCodec(
      PaymentTransactionCategory)
    private implicit val walletPaymentTransactionEncoder: Encoder[WalletPaymentTransactionView] = deriveEncoder
    override def apply(view: WalletTransactionView): Json =
      view match {
        case v: WalletBetTransactionView     => walletBetTransactionViewCodec(v).dropNullValues
        case v: WalletPaymentTransactionView => walletPaymentTransactionEncoder(v).dropNullValues
      }
  }

}
