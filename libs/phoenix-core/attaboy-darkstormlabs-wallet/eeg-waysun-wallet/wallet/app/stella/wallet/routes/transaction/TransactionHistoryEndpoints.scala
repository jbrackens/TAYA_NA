package stella.wallet.routes.transaction

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import sttp.model.StatusCode
import sttp.tapir.generic.auto._
import sttp.tapir.json.spray.jsonBody
import sttp.tapir.server.PartialServerEndpoint
import sttp.tapir.statusCode

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.SwaggerDefinition
import stella.common.http.routes.TapirAuthDirectives.endpointWithJwtValidation
import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.transaction.Transaction
import stella.wallet.models.transaction.TransactionType
import stella.wallet.routes.PathsAndParams._
import stella.wallet.routes.transaction.TransactionHistoryEndpointsDetails.GetTransactionHistory
import stella.wallet.routes.transaction.TransactionHistoryEndpointsDetails.GetTransactionHistoryAsAdmin
import stella.wallet.services.WalletBoundedContext.WalletPermissions._

object TransactionHistoryEndpoints {
  import stella.wallet.routes.ResponseFormats._
  import errorOutputFormats._
  import errorOutputSchemas._

  def getTransactionHistoryEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (CurrencyId, Set[TransactionType], Option[OffsetDateTime], Option[OffsetDateTime], Boolean),
    (StatusCode, Response[ErrorOutput]),
    Response[Seq[Transaction]],
    Any,
    Future] =
    endpointWithJwtValidation(TransactionReadPermission).get
      .in(GetTransactionHistory.path)
      .in(transactionTypesQueryParam)
      .in(dateRangeStartQueryParam)
      .in(dateRangeEndQueryParam)
      .in(sortFromNewestToOldestQueryParam)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[Transaction]]])
      .name(GetTransactionHistory.name)
      .description(GetTransactionHistory.description)

  def getTransactionHistoryAsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (UserId, CurrencyId, Set[TransactionType], Option[OffsetDateTime], Option[OffsetDateTime], Boolean),
    (StatusCode, Response[ErrorOutput]),
    Response[Seq[Transaction]],
    Any,
    Future] =
    endpointWithJwtValidation(TransactionAdminReadPermission).get
      .in(GetTransactionHistoryAsAdmin.path)
      .in(transactionTypesQueryParam)
      .in(dateRangeStartQueryParam)
      .in(dateRangeEndQueryParam)
      .in(sortFromNewestToOldestQueryParam)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[Transaction]]])
      .name(GetTransactionHistoryAsAdmin.name)
      .description(GetTransactionHistoryAsAdmin.description)

  def swaggerDefinition(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext): SwaggerDefinition =
    SwaggerDefinition(getTransactionHistoryEndpoint, getTransactionHistoryAsAdminEndpoint)
}
