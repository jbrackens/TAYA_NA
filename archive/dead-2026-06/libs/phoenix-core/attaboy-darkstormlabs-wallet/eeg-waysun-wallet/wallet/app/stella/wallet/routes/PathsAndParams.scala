package stella.wallet.routes

import java.time.OffsetDateTime
import java.util.UUID

import sttp.tapir._

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.Ids.CurrencyId.currencyIdCodec
import stella.wallet.models.Ids.ProjectIdInstances.projectIdCodec
import stella.wallet.models.Ids.UserIdInstances.userIdCodec
import stella.wallet.models.transaction.TransactionType

object PathsAndParams {
  val basePath: EndpointInput[Unit] = "wallet"
  val adminPath: EndpointInput[Unit] = basePath / "admin"
  val superAdminPath: EndpointInput[Unit] = basePath / "superadmin"

  val projectIdPathParamName = "project_id"
  val currencyIdPathParamName = "currency_id"
  val walletOwnerIdPathParamName = "wallet_owner_id"

  val projectIdQueryParamName = "project_id"
  val dateRangeStartQueryParamName = "date_range_start"
  val dateRangeEndQueryParamName = "date_range_end"
  val sortFromNewestToOldestQueryParamName = "sort_newest_to_oldest"
  val transactionTypesQueryParamName = "transaction_types"

  val balancesPathPart = "balances"
  val currenciesPathPart = "currencies"
  val transactionsPathPart = "transactions"

  val projectIdPathParam: EndpointInput.PathCapture[ProjectId] = path[ProjectId](projectIdPathParamName)
  val currencyIdPathParam: EndpointInput.PathCapture[CurrencyId] = path[CurrencyId](currencyIdPathParamName)

  val walletOwnerIdPathParam: EndpointInput.PathCapture[UserId] =
    path[UserId](walletOwnerIdPathParamName).example(UserId(UUID.fromString("79a85f64-5717-4562-b3fc-2c963f66afa6")))

  val optionalProjectIdQueryParam: EndpointInput.Query[Option[ProjectId]] =
    query[Option[ProjectId]](projectIdQueryParamName).default(None)

  val dateRangeStartQueryParam: EndpointInput.Query[Option[OffsetDateTime]] =
    query[Option[OffsetDateTime]](dateRangeStartQueryParamName).default(None)

  // We could verify that end date is >= start date but actually it doesn't break anything. User will just get an empty seq
  val dateRangeEndQueryParam: EndpointInput.Query[Option[OffsetDateTime]] =
    query[Option[OffsetDateTime]](dateRangeEndQueryParamName).default(None)

  val sortFromNewestToOldestQueryParam: EndpointInput.Query[Boolean] =
    query[Boolean](sortFromNewestToOldestQueryParamName).default(true)

  val transactionTypesQueryParam: EndpointInput.Query[Set[TransactionType]] =
    query[Set[TransactionType]](transactionTypesQueryParamName).default(Set.empty)
}
