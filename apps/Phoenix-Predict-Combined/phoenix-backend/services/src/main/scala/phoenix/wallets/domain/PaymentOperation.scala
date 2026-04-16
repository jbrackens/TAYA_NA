package phoenix.wallets.domain

import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.Funds.RealMoney

sealed trait PaymentOperation

object PaymentOperation {
  final case class Deposit(walletId: WalletId, funds: RealMoney, paymentMethod: PaymentMethod) extends PaymentOperation
  final case class Withdrawal(walletId: WalletId, funds: RealMoney, paymentMethod: PaymentMethod)
      extends PaymentOperation
}
