package phoenix.wallets.domain

import phoenix.core.websocket.PhoenixStateUpdate
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

final case class WalletStateUpdate(walletId: WalletId, balance: Balance) extends PhoenixStateUpdate
