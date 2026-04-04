package phoenix.wallets.infrastructure.http

import scala.concurrent.ExecutionContext

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._

import phoenix.core.Clock
import phoenix.core.pagination.PaginatedResult
import phoenix.http.core.TapirAuthDirectives.punterEndpoint
import phoenix.http.routes.EndpointInputs
import phoenix.http.routes.EndpointInputs.enumQueryWithAllValuesAsDefault
import phoenix.http.routes.EndpointInputs.timeRangeFilter
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.jwt.JwtAuthenticator
import phoenix.wallets.TransactionCategory
import phoenix.wallets.WalletTransactionView
import phoenix.wallets.WalletsBoundedContextProtocol.Balance
import phoenix.wallets.infrastructure.WalletJsonFormats._

object WalletEndpoints extends TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.core.currency.CurrencyTapirSchemas._
  import phoenix.wallets.infrastructure.http.WalletTapirSchemas._

  def walletTransactionsEndpoint(implicit auth: JwtAuthenticator, clock: Clock, ec: ExecutionContext) =
    punterEndpoint.get
      .in("punters" / "wallet" / "transactions")
      .in(timeRangeFilter.queryParams)
      .in(enumQueryWithAllValuesAsDefault[TransactionCategory]("filters.category"))
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[WalletTransactionView]])
      .out(statusCode(StatusCode.Ok))

  def walletBalanceEndpoint(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    punterEndpoint.get.in("punters" / "wallet" / "balance").out(jsonBody[Balance]).out(statusCode(StatusCode.Ok))

  def responsibilityCheckAcceptanceEndpoint(implicit auth: JwtAuthenticator, ec: ExecutionContext) =
    punterEndpoint.put.in("responsibility-check" / "accept").out(statusCode(StatusCode.NoContent))

}
