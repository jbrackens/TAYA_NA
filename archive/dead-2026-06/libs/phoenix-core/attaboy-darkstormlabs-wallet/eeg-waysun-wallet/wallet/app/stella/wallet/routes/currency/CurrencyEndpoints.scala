package stella.wallet.routes.currency

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.generic.auto._
import sttp.tapir.json.spray.jsonBody
import sttp.tapir.server.PartialServerEndpoint

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.SwaggerDefinition
import stella.common.http.routes.TapirAuthDirectives.endpointWithJwtValidation
import stella.common.models.Ids.ProjectId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.currency._
import stella.wallet.routes.PathsAndParams.optionalProjectIdQueryParam
import stella.wallet.routes.currency.CurrencyEndpointsDetails._
import stella.wallet.services.WalletBoundedContext.WalletPermissions._

object CurrencyEndpoints {
  import stella.wallet.routes.ResponseFormats._
  import errorOutputFormats._
  import errorOutputSchemas._

  def getCurrenciesEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    Unit,
    (StatusCode, Response[ErrorOutput]),
    Response[Seq[Currency]],
    Any,
    Future] =
    endpointWithJwtValidation(CurrencyReadPermission).get
      .in(GetCurrencies.path)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[Currency]]])
      .name(GetCurrencies.name)
      .description(GetCurrencies.description)

  def getCurrencyEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    CurrencyId,
    (StatusCode, Response[ErrorOutput]),
    Response[Currency],
    Any,
    Future] =
    endpointWithJwtValidation(CurrencyReadPermission).get
      .in(GetCurrency.path)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Currency]])
      .name(GetCurrency.name)
      .description(GetCurrency.description)

  def getCurrenciesAsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    Unit,
    (StatusCode, Response[ErrorOutput]),
    Response[Seq[Currency]],
    Any,
    Future] =
    endpointWithJwtValidation(CurrencyAdminReadPermission).get
      .in(GetCurrenciesAsAdmin.path)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[Currency]]])
      .name(GetCurrenciesAsAdmin.name)
      .description(GetCurrenciesAsAdmin.description)

  def getCurrencyAsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    CurrencyId,
    (StatusCode, Response[ErrorOutput]),
    Response[Currency],
    Any,
    Future] =
    endpointWithJwtValidation(CurrencyAdminReadPermission).get
      .in(GetCurrencyAsAdmin.path)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Currency]])
      .name(GetCurrencyAsAdmin.name)
      .description(GetCurrencyAsAdmin.description)

  def getCurrenciesAsSuperAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    Option[ProjectId],
    (StatusCode, Response[ErrorOutput]),
    Response[Seq[Currency]],
    Any,
    Future] =
    endpointWithJwtValidation(CurrencySuperAdminReadPermission).get
      .in(GetCurrenciesAsSuperAdmin.path)
      .in(optionalProjectIdQueryParam)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[Currency]]])
      .name(GetCurrenciesAsSuperAdmin.name)
      .description(GetCurrenciesAsSuperAdmin.description)

  def getCurrencyAsSuperAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    CurrencyId,
    (StatusCode, Response[ErrorOutput]),
    Response[Currency],
    Any,
    Future] =
    endpointWithJwtValidation(CurrencySuperAdminReadPermission).get
      .in(GetCurrencyAsSuperAdmin.path)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Currency]])
      .name(GetCurrencyAsSuperAdmin.name)
      .description(GetCurrencyAsSuperAdmin.description)

  def createCurrencyAsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    CreateCurrencyWithAssociatedProjectsRequest,
    (StatusCode, Response[ErrorOutput]),
    Response[Currency],
    Any,
    Future] =
    endpointWithJwtValidation(CurrencyAdminWritePermission).post
      .in(CreateCurrencyAsAdmin.path)
      .in(jsonBody[CreateCurrencyWithAssociatedProjectsRequest])
      .out(statusCode(StatusCode.Created))
      .out(jsonBody[Response[Currency]])
      .name(CreateCurrencyAsAdmin.name)
      .description(CreateCurrencyAsAdmin.description)

  def createCurrencyAsSuperAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    CreateCurrencyWithAssociatedProjectsRequest,
    (StatusCode, Response[ErrorOutput]),
    Response[Currency],
    Any,
    Future] =
    endpointWithJwtValidation(CurrencySuperAdminWritePermission).post
      .in(CreateCurrencyAsSuperAdmin.path)
      .in(jsonBody[CreateCurrencyWithAssociatedProjectsRequest])
      .out(statusCode(StatusCode.Created))
      .out(jsonBody[Response[Currency]])
      .name(CreateCurrencyAsSuperAdmin.name)
      .description(CreateCurrencyAsSuperAdmin.description)

  def updateCurrencyAsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (CurrencyId, UpdateCurrencyWithAssociatedProjectsRequest),
    (StatusCode, Response[ErrorOutput]),
    Response[Currency],
    Any,
    Future] =
    endpointWithJwtValidation(CurrencyAdminWritePermission).patch
      .in(UpdateCurrencyAsAdmin.path)
      .in(jsonBody[UpdateCurrencyWithAssociatedProjectsRequest])
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Currency]])
      .name(UpdateCurrencyAsAdmin.name)
      .description(UpdateCurrencyAsAdmin.description)

  def updateCurrencyAsSuperAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (CurrencyId, UpdateCurrencyWithAssociatedProjectsRequest),
    (StatusCode, Response[ErrorOutput]),
    Response[Currency],
    Any,
    Future] =
    endpointWithJwtValidation(CurrencySuperAdminWritePermission).patch
      .in(UpdateCurrencyAsSuperAdmin.path)
      .in(jsonBody[UpdateCurrencyWithAssociatedProjectsRequest])
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Currency]])
      .name(UpdateCurrencyAsSuperAdmin.name)
      .description(UpdateCurrencyAsSuperAdmin.description)

  def deleteCurrencyFromProjectAsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, CurrencyId),
    (StatusCode, Response[ErrorOutput]),
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(CurrencyAdminWritePermission).delete
      .in(DeleteCurrencyFromProjectAsAdmin.path)
      .out(statusCode(StatusCode.NoContent))
      .name(DeleteCurrencyFromProjectAsAdmin.name)
      .description(DeleteCurrencyFromProjectAsAdmin.description)

  def swaggerDefinition(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext): SwaggerDefinition =
    SwaggerDefinition(
      getCurrenciesEndpoint,
      getCurrencyEndpoint,
      getCurrenciesAsAdminEndpoint,
      getCurrencyAsAdminEndpoint,
      getCurrenciesAsSuperAdminEndpoint,
      getCurrencyAsSuperAdminEndpoint,
      createCurrencyAsAdminEndpoint,
      createCurrencyAsSuperAdminEndpoint,
      updateCurrencyAsAdminEndpoint,
      updateCurrencyAsSuperAdminEndpoint,
      deleteCurrencyFromProjectAsAdminEndpoint)
}
