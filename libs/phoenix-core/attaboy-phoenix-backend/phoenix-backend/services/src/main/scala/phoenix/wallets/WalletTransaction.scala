package phoenix.wallets

import java.time.OffsetDateTime

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.PaymentMethod

final case class WalletTransaction(
    reservationId: Option[String],
    transactionId: String,
    walletId: WalletId,
    reason: TransactionReason,
    transactionAmount: DefaultCurrencyMoney,
    createdAt: OffsetDateTime,
    preTransactionBalance: DefaultCurrencyMoney,
    postTransactionBalance: DefaultCurrencyMoney,
    betId: Option[BetId],
    externalId: Option[String],
    paymentMethod: Option[PaymentMethod])
