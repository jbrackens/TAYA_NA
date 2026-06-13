package stella.wallet.routes

import java.time.OffsetDateTime

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.transaction.TransactionType

object TestConstants {
  object Endpoint {
    val getCurrenciesEndpointPath = "/wallet/currencies"
    val getCurrenciesAsAdminEndpointPath = "/wallet/admin/currencies"
    val createCurrencyAsAdminEndpointPath = "/wallet/admin/currencies"
    val createCurrencyAsSuperAdminEndpointPath = "/wallet/superadmin/currencies"

    val getBalancesEndpointPath = "/wallet/balances"

    def getCurrencyEndpointPath(currencyId: CurrencyId) = s"/wallet/currencies/$currencyId"
    def getCurrencyAsAdminEndpointPath(currencyId: CurrencyId) = s"/wallet/admin/currencies/$currencyId"
    def getCurrenciesAsSuperAdminEndpointPath(projectId: Option[ProjectId] = None) =
      "/wallet/superadmin/currencies" + projectId.map(id => s"?$projectIdQueryParamName=$id").getOrElse("")
    def getCurrencyAsSuperAdminEndpointPath(currencyId: CurrencyId) = s"/wallet/superadmin/currencies/$currencyId"

    def updateCurrencyAsAdminEndpointPath(currencyId: CurrencyId) = s"/wallet/admin/currencies/$currencyId"
    def updateCurrencyAsSuperAdminEndpointPath(currencyId: CurrencyId) = s"/wallet/superadmin/currencies/$currencyId"
    def deleteCurrencyFromProjectAsAdminEndpointPath(projectId: ProjectId, currencyId: CurrencyId) =
      s"/wallet/admin/$projectId/currencies/$currencyId"

    def getBalanceEndpointPath(currencyId: CurrencyId) = s"/wallet/balances/$currencyId"
    def getBalancesAsAdminEndpointPath(walletOwnerId: UserId): String = s"/wallet/admin/$walletOwnerId/balances"
    def getBalanceAsAdminEndpointPath(walletOwnerId: UserId, currencyId: CurrencyId) =
      s"/wallet/admin/$walletOwnerId/balances/$currencyId"

    def transferFundsAsAdminEndpointPath(projectId: ProjectId, walletOwnerId: UserId) =
      s"/wallet/admin/$projectId/$walletOwnerId/transactions"

    def getTransactionHistoryEndpointPath(
        currencyId: CurrencyId,
        transactionTypes: Set[TransactionType] = Set.empty,
        dateRangeStart: Option[OffsetDateTime] = None,
        dateRangeEnd: Option[OffsetDateTime] = None,
        sortFromNewestToOldest: Option[Boolean] = None): String =
      s"/wallet/transactions/$currencyId?" + commonTransactionHistoryQueryParams(
        transactionTypes,
        dateRangeStart,
        dateRangeEnd,
        sortFromNewestToOldest)

    def getTransactionHistoryAsAdminEndpointPath(
        walletOwnerId: UserId,
        currencyId: CurrencyId,
        transactionTypes: Set[TransactionType] = Set.empty,
        dateRangeStart: Option[OffsetDateTime] = None,
        dateRangeEnd: Option[OffsetDateTime] = None,
        sortFromNewestToOldest: Option[Boolean] = None): String =
      s"/wallet/admin/$walletOwnerId/transactions/$currencyId?" + commonTransactionHistoryQueryParams(
        transactionTypes,
        dateRangeStart,
        dateRangeEnd,
        sortFromNewestToOldest)

    private def commonTransactionHistoryQueryParams(
        transactionTypes: Set[TransactionType],
        dateRangeStart: Option[OffsetDateTime],
        dateRangeEnd: Option[OffsetDateTime],
        sortFromNewestToOldest: Option[Boolean]): String = {
      val transactionTypesPart =
        transactionTypes.map(tpe => s"$transactionTypesQueryParamName=${tpe.entryName}").mkString("", "&", "&")
      val dateRangeStartPart = dateRangeStart.map(v => s"$dateRangeStartQueryParamName=$v&").getOrElse("")
      val dateRangeEndPart = dateRangeEnd.map(v => s"$dateRangeEndQueryParamName=$v&").getOrElse("")
      val sortFromNewestToOldestPart =
        sortFromNewestToOldest.map(v => s"$sortFromNewestToOldestQueryParamName=$v").getOrElse("")
      s"$transactionTypesPart$dateRangeStartPart$dateRangeEndPart$sortFromNewestToOldestPart"
    }
  }

  val currencyNameFieldName = "name"
  val currencyVerboseNameFieldName = "verboseName"
  val currencySymbolFieldName = "symbol"
  val amountFieldName = "amount"
  val externalTransactionIdFieldName = "externalTransactionId"
  val titleFieldName = "title"

  val walletOwnerIdPathParamName = "wallet_owner_id"

  val projectIdQueryParamName = "project_id"
  val dateRangeStartQueryParamName = "date_range_start"
  val dateRangeEndQueryParamName = "date_range_end"
  val sortFromNewestToOldestQueryParamName = "sort_newest_to_oldest"
  val transactionTypesQueryParamName = "transaction_types"

  val maxCurrencyNameLength = 32
  val maxCurrencyVerboseNameLength = 64
  val maxCurrencySymbolLength = 16
  val maxExternalTransactionIdLength = 128
  val maxTitleLength = 128
  val maxUserIdLength = 100
}
