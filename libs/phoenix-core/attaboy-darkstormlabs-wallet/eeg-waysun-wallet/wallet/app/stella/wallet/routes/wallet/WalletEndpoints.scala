package stella.wallet.routes.wallet

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
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.wallet.TransferFundsRequest
import stella.wallet.models.wallet.WalletBalance
import stella.wallet.models.wallet.WalletBalanceInCurrency
import stella.wallet.routes.wallet.WalletEndpointsDetails._
import stella.wallet.services.WalletBoundedContext.WalletPermissions._

object WalletEndpoints {
  import stella.wallet.routes.ResponseFormats._
  import errorOutputFormats._
  import errorOutputSchemas._

  def getBalancesEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    Unit,
    (StatusCode, Response[ErrorOutput]),
    Response[WalletBalance],
    Any,
    Future] =
    endpointWithJwtValidation(BalanceReadPermission).get
      .in(GetBalances.path)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[WalletBalance]])
      .name(GetBalances.name)
      .description(GetBalances.description)

  def getBalanceEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    CurrencyId,
    (StatusCode, Response[ErrorOutput]),
    Response[WalletBalanceInCurrency],
    Any,
    Future] =
    endpointWithJwtValidation(BalanceReadPermission).get
      .in(GetBalance.path)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[WalletBalanceInCurrency]])
      .name(GetBalance.name)
      .description(GetBalance.description)

  def getBalancesAsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    UserId,
    (StatusCode, Response[ErrorOutput]),
    Response[WalletBalance],
    Any,
    Future] =
    endpointWithJwtValidation(BalanceAdminReadPermission).get
      .in(GetBalancesAsAdmin.path)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[WalletBalance]])
      .name(GetBalancesAsAdmin.name)
      .description(GetBalancesAsAdmin.description)

  def getBalanceAsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (UserId, CurrencyId),
    (StatusCode, Response[ErrorOutput]),
    Response[WalletBalanceInCurrency],
    Any,
    Future] =
    endpointWithJwtValidation(BalanceAdminReadPermission).get
      .in(GetBalanceAsAdmin.path)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[WalletBalanceInCurrency]])
      .name(GetBalanceAsAdmin.name)
      .description(GetBalanceAsAdmin.description)

  def transferFundsAsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, UserId, TransferFundsRequest),
    (StatusCode, Response[ErrorOutput]),
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(TransactionAdminWritePermission).post
      .in(TransferFundsAsAdmin.path)
      .in(jsonBody[TransferFundsRequest])
      .out(statusCode(StatusCode.Ok))
      .name(TransferFundsAsAdmin.name)
      .description(TransferFundsAsAdmin.description)

  def swaggerDefinition(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext): SwaggerDefinition =
    SwaggerDefinition(
      getBalancesEndpoint,
      getBalanceEndpoint,
      getBalancesAsAdminEndpoint,
      getBalanceAsAdminEndpoint,
      transferFundsAsAdminEndpoint)
}
