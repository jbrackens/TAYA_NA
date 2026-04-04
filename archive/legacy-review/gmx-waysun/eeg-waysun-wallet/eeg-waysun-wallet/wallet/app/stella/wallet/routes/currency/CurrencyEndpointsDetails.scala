package stella.wallet.routes.currency

import sttp.tapir._

import stella.common.models.Ids.ProjectId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.routes.PathsAndParams._
import stella.wallet.services.WalletBoundedContext.WalletPermissions._

object CurrencyEndpointsDetails {

  object GetCurrencies {
    val path: EndpointInput[Unit] = basePath / currenciesPathPart
    val name: String = "getCurrencies"
    val description: String =
      s"""Get all currencies associated with a user's project.
         |
         |Required permission: `${CurrencyReadPermission.value}`
         |""".stripMargin
  }

  object GetCurrency {
    val path: EndpointInput[CurrencyId] = basePath / currenciesPathPart / currencyIdPathParam
    val name: String = "getCurrency"
    val description: String =
      s"""Get a currency associated with a user's project.
         |
         |Required permission: `${CurrencyReadPermission.value}`
         |""".stripMargin
  }

  object GetCurrenciesAsAdmin {
    val path: EndpointInput[Unit] = adminPath / currenciesPathPart
    val name: String = "getCurrenciesAsAdmin"
    val description: String =
      s"""Get all currencies associated with an admin's project
         |
         |Required permission: `${CurrencyAdminReadPermission.value}`
         |""".stripMargin
  }

  object GetCurrencyAsAdmin {
    val path: EndpointInput[CurrencyId] = adminPath / currenciesPathPart / currencyIdPathParam
    val name: String = "getCurrencyAsAdmin"
    val description: String =
      s"""Get a currency associated with an admin's project.
         |
         |Required permission: `${CurrencyAdminReadPermission.value}`
         |""".stripMargin
  }

  object GetCurrenciesAsSuperAdmin {
    val path: EndpointInput[Unit] = superAdminPath / currenciesPathPart
    val name: String = "getCurrenciesAsSuperAdmin"
    val description: String =
      s"""Get currencies defined in a system. Optionally specify the project they are associated with.
         |
         |Required permission: `${CurrencySuperAdminReadPermission.value}`
         |""".stripMargin
  }

  object GetCurrencyAsSuperAdmin {
    val path: EndpointInput[CurrencyId] = superAdminPath / currenciesPathPart / currencyIdPathParam
    val name: String = "getCurrencyAsSuperAdmin"
    val description: String =
      s"""Get a currency.
           |
           |Required permission: `${CurrencySuperAdminReadPermission.value}`
           |""".stripMargin
  }

  object CreateCurrencyAsAdmin {
    val path: EndpointInput[Unit] = adminPath / currenciesPathPart
    val name: String = "createCurrencyAsAdmin"
    val description: String =
      s"""Create a currency associated with an admin's project.
         |
         |Required permission: `${CurrencyAdminWritePermission.value}`
         |""".stripMargin
  }

  object UpdateCurrencyAsAdmin {
    val path: EndpointInput[CurrencyId] = adminPath / currenciesPathPart / currencyIdPathParam
    val name: String = "updateCurrencyAsAdmin"
    val description: String =
      s"""Update a currency associated with an admin's project without changing the list of projects it's associated with.
         |
         |Required permission: `${CurrencyAdminWritePermission.value}`
         |""".stripMargin
  }

  object CreateCurrencyAsSuperAdmin {
    val path: EndpointInput[Unit] = superAdminPath / currenciesPathPart
    val name: String = "createCurrencyAsSuperAdmin"
    val description: String =
      s"""Create a currency associated with the given projects.
         |
         |Required permission: `${CurrencySuperAdminWritePermission.value}`
         |""".stripMargin
  }

  object UpdateCurrencyAsSuperAdmin {
    val path: EndpointInput[CurrencyId] = superAdminPath / currenciesPathPart / currencyIdPathParam
    val name: String = "updateCurrencyAsSuperAdmin"
    val description: String =
      s"""Update a currency and associate it with the given projects.
         |
         |Required permission: `${CurrencySuperAdminWritePermission.value}`
         |""".stripMargin
  }

  object DeleteCurrencyFromProjectAsAdmin {
    val path: EndpointInput[(ProjectId, CurrencyId)] =
      adminPath / projectIdPathParam / currenciesPathPart / currencyIdPathParam
    val name: String = "deleteCurrencyFromProjectAsAdmin"
    val description: String =
      s"""Removes an association between a currency and an admin's project.
         |
         |Required permission: `${CurrencyAdminWritePermission.value}`
         |""".stripMargin
  }
}
