package stella.usercontext.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import io.circe.Json
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
import stella.common.models.Ids.UserId

import stella.usercontext.routes.PathsAndParams._
import stella.usercontext.routes.UserContextEndpointsDetails.DeleteUserContext
import stella.usercontext.routes.UserContextEndpointsDetails.DeleteUserContextAsAdmin
import stella.usercontext.routes.UserContextEndpointsDetails.GetUserContext
import stella.usercontext.routes.UserContextEndpointsDetails.GetUserContextAsAdmin
import stella.usercontext.routes.UserContextEndpointsDetails.ModifyUserContext
import stella.usercontext.routes.UserContextEndpointsDetails.ModifyUserContextAsAdmin
import stella.usercontext.routes.UserContextEndpointsDetails.PutUserContext
import stella.usercontext.routes.UserContextEndpointsDetails.PutUserContextAsAdmin
import stella.usercontext.services.UserContextBoundedContext.UserContextPermissions._

object UserContextEndpoints {
  import ResponseFormats._
  import errorOutputFormats._
  import errorOutputSchemas._

  def putUserContextAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, UserId, Json),
    (StatusCode, Response[ErrorOutput]),
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(UserContextAdminWritePermission).put
      .in(adminPath)
      .in(jsonBody[Json])
      .out(statusCode(StatusCode.Ok))
      .name(PutUserContextAsAdmin.name)
      .description(PutUserContextAsAdmin.description)

  def modifyUserContextAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, UserId, Json),
    (StatusCode, Response[ErrorOutput]),
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(UserContextAdminWritePermission).patch
      .in(adminPath)
      .in(jsonBody[Json])
      .out(statusCode(StatusCode.Ok))
      .name(ModifyUserContextAsAdmin.name)
      .description(ModifyUserContextAsAdmin.description)

  def getUserContextAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, UserId),
    (StatusCode, Response[ErrorOutput]),
    Response[Json],
    Any,
    Future] =
    endpointWithJwtValidation(UserContextAdminReadPermission).get
      .in(adminPath)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Json]])
      .name(GetUserContextAsAdmin.name)
      .description(GetUserContextAsAdmin.description)

  def deleteUserContextAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, UserId),
    (StatusCode, Response[ErrorOutput]),
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(UserContextAdminWritePermission).delete
      .in(adminPath)
      .out(statusCode(StatusCode.NoContent))
      .name(DeleteUserContextAsAdmin.name)
      .description(DeleteUserContextAsAdmin.description)

  def putUserContextEndpoint(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext)
      : PartialServerEndpoint[String, StellaAuthContext, Json, (StatusCode, Response[ErrorOutput]), Unit, Any, Future] =
    endpointWithJwtValidation(UserContextWritePermission).put
      .in(basePath)
      .in(jsonBody[Json])
      .out(statusCode(StatusCode.Ok))
      .name(PutUserContext.name)
      .description(PutUserContext.description)

  def modifyUserContextEndpoint(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext)
      : PartialServerEndpoint[String, StellaAuthContext, Json, (StatusCode, Response[ErrorOutput]), Unit, Any, Future] =
    endpointWithJwtValidation(UserContextWritePermission).patch
      .in(basePath)
      .in(jsonBody[Json])
      .out(statusCode(StatusCode.Ok))
      .name(ModifyUserContext.name)
      .description(ModifyUserContext.description)

  def getUserContextEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    Unit,
    (StatusCode, Response[ErrorOutput]),
    Response[Json],
    Any,
    Future] =
    endpointWithJwtValidation(UserContextReadPermission).get
      .in(basePath)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Json]])
      .name(GetUserContext.name)
      .description(GetUserContext.description)

  def deleteUserContextEndpoint(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext)
      : PartialServerEndpoint[String, StellaAuthContext, Unit, (StatusCode, Response[ErrorOutput]), Unit, Any, Future] =
    endpointWithJwtValidation(UserContextWritePermission).delete
      .in(basePath)
      .out(statusCode(StatusCode.NoContent))
      .name(DeleteUserContext.name)
      .description(DeleteUserContext.description)

  def swaggerDefinition(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext): SwaggerDefinition =
    SwaggerDefinition(
      putUserContextAdminEndpoint,
      modifyUserContextAdminEndpoint,
      getUserContextAdminEndpoint,
      deleteUserContextAdminEndpoint,
      putUserContextEndpoint,
      modifyUserContextEndpoint,
      getUserContextEndpoint,
      deleteUserContextEndpoint)
}
