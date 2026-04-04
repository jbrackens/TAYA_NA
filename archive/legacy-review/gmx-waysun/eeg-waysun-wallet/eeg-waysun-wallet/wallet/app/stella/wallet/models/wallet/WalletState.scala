package stella.wallet.models.wallet

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.StellaCirceAkkaSerializable

sealed trait WalletState extends StellaCirceAkkaSerializable

object WalletState {
  final case class WalletBalanceState(balance: Map[CurrencyId, BigDecimal]) extends WalletState

  object WalletBalanceState {
    val empty: WalletBalanceState = WalletBalanceState(Map.empty)
  }
}
