package stella.wallet.routes.wallet

import sttp.tapir.EndpointInput

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.routes.PathsAndParams._
import stella.wallet.services.WalletBoundedContext.WalletPermissions._

object WalletEndpointsDetails {

  object GetBalances {
    val path: EndpointInput[Unit] = basePath / balancesPathPart
    val name: String = "getBalances"
    val description: String =
      s"""Get the wallet balances of a sender for all currencies associated with a project.
         |
         |Required permission: `${BalanceReadPermission.value}`
         |""".stripMargin
  }

  object GetBalance {
    val path: EndpointInput[CurrencyId] = basePath / balancesPathPart / currencyIdPathParam
    val name: String = "getBalance"
    val description: String =
      s"""Get a wallet balance of a sender for a particular currency associated with a project.
         |
         |Required permission: `${BalanceReadPermission.value}`
         |""".stripMargin
  }

  object GetBalancesAsAdmin {
    val path: EndpointInput[UserId] = adminPath / walletOwnerIdPathParam / balancesPathPart
    val name: String = "getBalancesAsAdmin"
    val description: String =
      s"""Get the wallet balances of a given user for all currencies associated with a project.
         |
         |Required permission: `${BalanceAdminReadPermission.value}`
         |""".stripMargin
  }

  object GetBalanceAsAdmin {
    val path: EndpointInput[(UserId, CurrencyId)] =
      adminPath / walletOwnerIdPathParam / balancesPathPart / currencyIdPathParam
    val name: String = "getBalanceAsAdmin"
    val description: String =
      s"""Get a wallet balance of a given user for a particular currency associated with a project.
         |
         |Required permission: `${BalanceAdminReadPermission.value}`
         |""".stripMargin
  }

  object TransferFundsAsAdmin {
    val path: EndpointInput[(ProjectId, UserId)] =
      adminPath / projectIdPathParam / walletOwnerIdPathParam / transactionsPathPart
    val name: String = "transferFundsAsAdmin"
    val description: String =
      s"""Top up or withdraw funds in a wallet of a given user.
         |
         |Required permission: `${TransactionAdminWritePermission.value}`
         |""".stripMargin
  }
}
