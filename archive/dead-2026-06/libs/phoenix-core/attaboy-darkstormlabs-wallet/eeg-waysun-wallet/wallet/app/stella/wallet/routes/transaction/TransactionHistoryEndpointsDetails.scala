package stella.wallet.routes.transaction

import sttp.tapir.EndpointInput

import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.routes.PathsAndParams._
import stella.wallet.services.WalletBoundedContext.WalletPermissions._

object TransactionHistoryEndpointsDetails {

  object GetTransactionHistory {
    val path: EndpointInput[CurrencyId] = basePath / transactionsPathPart / currencyIdPathParam
    val name: String = "getTransactionHistory"
    val description: String =
      s"""Get transaction history of a sender.
         |
         |Required permission: `${TransactionReadPermission.value}`
         |""".stripMargin
  }

  object GetTransactionHistoryAsAdmin {
    val path: EndpointInput[(UserId, CurrencyId)] =
      adminPath / walletOwnerIdPathParam / transactionsPathPart / currencyIdPathParam
    val name: String = "getTransactionHistoryAsAdmin"
    val description: String =
      s"""Get transaction history of a given user.
         |
         |Required permission: `${TransactionAdminReadPermission.value}`
         |""".stripMargin
  }
}
