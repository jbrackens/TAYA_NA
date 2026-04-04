package stella.rules.routes.event

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.generic.auto._
import sttp.tapir.json.spray.jsonBody
import sttp.tapir.server.PartialServerEndpoint

import stella.common.http.Response
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.SwaggerDefinition
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.http.routes.TapirAuthDirectives.endpointWithJwtValidation
import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.UpdateEventConfigurationRequest
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions._

object EventConfigurationEndpoints {
  import stella.rules.models.Ids.EventConfigurationEventId.eventConfigurationEventIdCodec
  import stella.rules.models.Ids.ProjectIdInstances.projectIdCodec
  import stella.rules.routes.ResponseFormats._
  import errorOutputFormats._
  import errorOutputSchemas._

  private val includeInactiveQueryParam = "include_inactive"
  private val eventConfigIdPathParam = path[EventConfigurationEventId]("event_id")
    .description("An event configuration id assigned by the system when creating this even configuration")
  private val projectIdPathParam = path[ProjectId]("project_id")
  private val baseEventPathInput = "rule_configurator" / "events"
  private val baseAdminEventPathInput = "rule_configurator" / "admin" / projectIdPathParam / "events"
  private val singleEventPathInput = baseEventPathInput / eventConfigIdPathParam
  private val singleAdminEventPathInput = baseAdminEventPathInput / eventConfigIdPathParam

  def getEventConfigurationsEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    Boolean,
    ErrorOut,
    Response[Seq[EventConfiguration]],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventReadPermission).get
      .in(baseEventPathInput)
      .in(query[Boolean](includeInactiveQueryParam).default(false))
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[EventConfiguration]]])
      .name("getEventConfigurations")
      .description(
        s"""Returns an event configurations. By default includes only the active ones, unless the $includeInactiveQueryParam query param was set.
           |
           |Required permission: `${EventReadPermission.value}`
           |""".stripMargin)

  def createEventConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    CreateEventConfigurationRequest,
    ErrorOut,
    Response[EventConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventWritePermission).post
      .in(baseEventPathInput)
      .in(jsonBody[CreateEventConfigurationRequest])
      .out(statusCode(StatusCode.Created))
      .out(jsonBody[Response[EventConfiguration]])
      .name("createEventConfiguration")
      .description(s"""Creates a new event configuration.
           |
           |Required permission: `${EventWritePermission.value}`
           |""".stripMargin)

  def getEventConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    EventConfigurationEventId,
    ErrorOut,
    Response[EventConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventReadPermission).get
      .in(singleEventPathInput)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[EventConfiguration]])
      .name("getEventConfiguration")
      .description(s"""Returns an event configuration for a given id.
           |
           |Required permission: `${EventReadPermission.value}`
           |""".stripMargin)

  def updateEventConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (EventConfigurationEventId, UpdateEventConfigurationRequest),
    ErrorOut,
    Response[EventConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventWritePermission).patch
      .in(singleEventPathInput)
      .in(jsonBody[UpdateEventConfigurationRequest])
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[EventConfiguration]])
      .name("updateEventConfiguration")
      .description(s"""Activates/deactivates an event configuration with a given id or changes its description. No-op, if the configuration is already in the desired state.
           |
           |Required permission: `${EventWritePermission.value}`
           |""".stripMargin)

  def deleteInactiveEventConfigurationEndpoint(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext)
      : PartialServerEndpoint[String, StellaAuthContext, EventConfigurationEventId, ErrorOut, Unit, Any, Future] =
    endpointWithJwtValidation(requiredPermissions = EventWritePermission).delete
      .in(singleEventPathInput)
      .out(statusCode(StatusCode.NoContent))
      .name("deleteEventConfiguration")
      .description(s"""Deletes an inactive event configuration with a given id.
           |
           |Required permission: `${EventWritePermission.value}`
           |""".stripMargin)

  def getEventConfigurationsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, Boolean),
    ErrorOut,
    Response[Seq[EventConfiguration]],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventAdminReadPermission).get
      .in(baseAdminEventPathInput)
      .in(query[Boolean](includeInactiveQueryParam).default(false))
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[EventConfiguration]]])
      .name("getEventConfigurationsAsAdmin")
      .description(
        s"""Returns an event configurations. By default includes only the active ones, unless the $includeInactiveQueryParam query param was set.
           |
           |Required permission: `${EventAdminReadPermission.value}`
           |""".stripMargin)

  def createEventConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, CreateEventConfigurationRequest),
    ErrorOut,
    Response[EventConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventAdminWritePermission).post
      .in(baseAdminEventPathInput)
      .in(jsonBody[CreateEventConfigurationRequest])
      .out(statusCode(StatusCode.Created))
      .out(jsonBody[Response[EventConfiguration]])
      .name("createEventConfigurationAsAdmin")
      .description(s"""Creates a new event configuration.
                      |
                      |Required permission: `${EventAdminWritePermission.value}`
                      |""".stripMargin)

  def getEventConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, EventConfigurationEventId),
    ErrorOut,
    Response[EventConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventAdminReadPermission).get
      .in(singleAdminEventPathInput)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[EventConfiguration]])
      .name("getEventConfigurationAsAdmin")
      .description(s"""Returns an event configuration for a given id.
                      |
                      |Required permission: `${EventAdminReadPermission.value}`
                      |""".stripMargin)

  def updateEventConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, EventConfigurationEventId, UpdateEventConfigurationRequest),
    ErrorOut,
    Response[EventConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventAdminWritePermission).patch
      .in(singleAdminEventPathInput)
      .in(jsonBody[UpdateEventConfigurationRequest])
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[EventConfiguration]])
      .name("updateEventConfigurationAsAdmin")
      .description(s"""Activates/deactivates an event configuration with a given id or changes its description. No-op, if the configuration is already in the desired state.
                      |
                      |Required permission: `${EventAdminWritePermission.value}`
                      |""".stripMargin)

  def deleteInactiveEventConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, EventConfigurationEventId),
    ErrorOut,
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = EventAdminWritePermission).delete
      .in(singleAdminEventPathInput)
      .out(statusCode(StatusCode.NoContent))
      .name("deleteEventConfigurationAsAdmin")
      .description(s"""Deletes an inactive event configuration with a given id.
                      |
                      |Required permission: `${EventAdminWritePermission.value}`
                      |""".stripMargin)

  def swaggerDefinition(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext): SwaggerDefinition =
    SwaggerDefinition(
      getEventConfigurationsEndpoint,
      createEventConfigurationEndpoint,
      getEventConfigurationEndpoint,
      updateEventConfigurationEndpoint,
      deleteInactiveEventConfigurationEndpoint,
      getEventConfigurationsAdminEndpoint,
      createEventConfigurationAdminEndpoint,
      getEventConfigurationAdminEndpoint,
      updateEventConfigurationAdminEndpoint,
      deleteInactiveEventConfigurationAdminEndpoint)
}
