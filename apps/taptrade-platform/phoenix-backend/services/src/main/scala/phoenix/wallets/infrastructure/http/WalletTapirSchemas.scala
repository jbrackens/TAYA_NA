package phoenix.wallets.infrastructure.http

import sttp.tapir.Schema

import phoenix.wallets.WalletTransactionView
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

object WalletTapirSchemas {

  implicit val walletIdSchema: Schema[WalletId] = Schema.string
  implicit val walletTransactionViewSchema: Schema[WalletTransactionView] = Schema.string

}
