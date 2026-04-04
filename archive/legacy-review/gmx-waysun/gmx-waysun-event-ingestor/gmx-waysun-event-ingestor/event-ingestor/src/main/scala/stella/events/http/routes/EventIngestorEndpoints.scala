package stella.events.http.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.json.spray.jsonBody
import sttp.tapir.server.PartialServerEndpoint

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.SwaggerDefinition
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.http.routes.TapirAuthDirectives.endpointWithJwtValidation

import stella.events.EventIngestorBoundedContext.EventIngestorPermissions
import stella.events.EventIngestorBoundedContext.EventIngestorPermissions.SubmitEvent
import stella.events.http.routes.json.IncomingAdminEvent
import stella.events.http.routes.json.IncomingEvent

object EventIngestorEndpoints {
  import ResponseFormats._
  import errorOutputFormats._
  import errorOutputSchemas._

  private val basePath = "event_ingestor"

  def submitEvent(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext)
      : PartialServerEndpoint[String, StellaAuthContext, IncomingEvent, ErrorOut, Unit, Any, Future] =
    endpointWithJwtValidation(requiredPermissions = SubmitEvent).post
      .in(basePath / "event")
      .in(jsonBody[IncomingEvent])
      .out(statusCode(StatusCode.Ok))
      .name("submitEvent")
      .description(s"""Allows to store the client's events in the system.
           |
           |Required permission: `${EventIngestorPermissions.SubmitEvent.value}`
           |""".stripMargin)

  def submitEventAsSuperAdmin(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    IncomingAdminEvent,
    (StatusCode, Response[ErrorOutput]),
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventIngestorPermissions.SubmitEventAsSuperAdmin).post
      .in(basePath / "superadmin" / "any" / "event")
      .in(jsonBody[IncomingAdminEvent])
      .out(statusCode(StatusCode.Ok))
      .name("submitEventAsSuperAdmin")
      .description(s"""Allows to store in the system the events of any user in any project.
           |
           |Required permission: `${EventIngestorPermissions.SubmitEventAsSuperAdmin.value}`
           |""".stripMargin)

  def submitEventAsAdmin(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    IncomingAdminEvent,
    (StatusCode, Response[ErrorOutput]),
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventIngestorPermissions.SubmitEventAsAdmin).post
      .in(basePath / "admin" / "any" / "event")
      .in(jsonBody[IncomingAdminEvent])
      .out(statusCode(StatusCode.Ok))
      .name("submitEventAsAdmin")
      .description(s"""Allows to store in the system the events of any user from the project which admin has access to.
                      |
                      |Required permission: `${EventIngestorPermissions.SubmitEventAsAdmin.value}`
                      |""".stripMargin)

  def swaggerDefinition(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext): SwaggerDefinition =
    SwaggerDefinition(submitEvent, submitEventAsSuperAdmin, submitEventAsAdmin)
}
