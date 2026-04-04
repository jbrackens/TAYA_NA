package stella.rules.routes.aggregation

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.generic.auto._
import sttp.tapir.json.spray.jsonBody
import sttp.tapir.server.PartialServerEndpoint

import stella.common.core.Clock
import stella.common.http.Response
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.SwaggerDefinition
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.http.routes.TapirAuthDirectives.endpointWithJwtValidation
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.ProjectId._

import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.Ids.ProjectIdInstances._
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.aggregation.http.UpdateAggregationRuleConfigurationRequest
import stella.rules.routes.ResponseFormats
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions._

object AggregationRuleConfigurationEndpoints {

  import ResponseFormats._
  import errorOutputFormats._
  import errorOutputSchemas._
  import stella.rules.models.Ids.AggregationRuleConfigurationRuleId.aggregationRuleConfigurationRuleIdCodec

  private val includeInactiveQueryParam = "include_inactive"
  private val aggregationRuleIdPathParam = "aggregation_rule_id"
  private val aggregationProjectIdPathParam = "project_id"
  private val baseAggregationPathInput = "rule_configurator" / "aggregations"
  private val ruleIdPathCapture = path[AggregationRuleConfigurationRuleId](aggregationRuleIdPathParam).description(
    "An aggregation rule configuration id assigned by the system when creating this aggregation rule configuration")
  private val baseAggregationAdminPathInput =
    "rule_configurator" / "admin" / path[ProjectId](aggregationProjectIdPathParam) / "aggregations"
  private val singleAggregationRulePathInput = baseAggregationPathInput / ruleIdPathCapture
  private val singleAggregationRuleAdminPathInput = baseAggregationAdminPathInput / ruleIdPathCapture

  def getAggregationRuleConfigurationsEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    Boolean,
    ErrorOut,
    Response[Seq[AggregationRuleConfiguration]],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AggregationRuleReadPermission).get
      .in(baseAggregationPathInput)
      .in(query[Boolean](includeInactiveQueryParam).default(false))
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[AggregationRuleConfiguration]]])
      .name("getAggregationRuleConfigurations")
      .description(
        s"""Returns an aggregation rule configurations. By default includes only the active ones, unless the $includeInactiveQueryParam query param was set.
           |
           |Required permission: `${AggregationRuleReadPermission.value}`
           |""".stripMargin)

  def createAggregationRuleConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext,
      clock: Clock): PartialServerEndpoint[
    String,
    StellaAuthContext,
    CreateAggregationRuleConfigurationRequest,
    ErrorOut,
    Response[AggregationRuleConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AggregationRuleWritePermission).post
      .in(baseAggregationPathInput)
      .in(jsonBody[CreateAggregationRuleConfigurationRequest])
      .out(statusCode(StatusCode.Created))
      .out(jsonBody[Response[AggregationRuleConfiguration]])
      .name("createAggregationRuleConfiguration")
      .description(s"""Creates a new aggregation rule configuration.
          |
          |Required permission: `${AggregationRuleWritePermission.value}`
          |""".stripMargin)

  def getAggregationRuleConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    AggregationRuleConfigurationRuleId,
    ErrorOut,
    Response[AggregationRuleConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AggregationRuleReadPermission).get
      .in(singleAggregationRulePathInput)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[AggregationRuleConfiguration]])
      .name("getAggregationRuleConfiguration")
      .description(s"""Returns an aggregation rule configuration for a given id.
          |
          |Required permission: `${AggregationRuleReadPermission.value}`
          |""".stripMargin)

  def updateAggregationRuleConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (AggregationRuleConfigurationRuleId, UpdateAggregationRuleConfigurationRequest),
    ErrorOut,
    Response[AggregationRuleConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AggregationRuleWritePermission).patch
      .in(singleAggregationRulePathInput)
      .in(jsonBody[UpdateAggregationRuleConfigurationRequest])
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[AggregationRuleConfiguration]])
      .name("updateAggregationRuleConfiguration")
      .description(s"""Activates/deactivates an aggregation rule configuration with a given id or changes its description.. No-op, if the configuration is already in the desired state.
          |
          |Required permission: `${AggregationRuleWritePermission.value}`
          |""".stripMargin)

  def deleteInactiveAggregationRuleConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    AggregationRuleConfigurationRuleId,
    ErrorOut,
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AggregationRuleWritePermission).delete
      .in(singleAggregationRulePathInput)
      .out(statusCode(StatusCode.NoContent))
      .name("deleteAggregationRuleConfiguration")
      .description(s"""Deletes an inactive aggregation rule configuration with a given id.
          |
          |Required permission: `${AggregationRuleWritePermission.value}`
          |""".stripMargin)

  def getAggregationRuleConfigurationsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, Boolean),
    ErrorOut,
    Response[Seq[AggregationRuleConfiguration]],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AggregationRuleAdminReadPermission).get
      .in(baseAggregationAdminPathInput)
      .in(query[Boolean](includeInactiveQueryParam).default(false))
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[AggregationRuleConfiguration]]])
      .name("getAggregationRuleConfigurationsAsAdmin")
      .description(
        s"""Returns an aggregation rule configurations. By default includes only the active ones, unless the $includeInactiveQueryParam query param was set.
           |
           |Required permission: `${AggregationRuleAdminReadPermission.value}`
           |""".stripMargin)

  def createAggregationRuleConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext,
      clock: Clock): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, CreateAggregationRuleConfigurationRequest),
    ErrorOut,
    Response[AggregationRuleConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AggregationRuleAdminWritePermission).post
      .in(baseAggregationAdminPathInput)
      .in(jsonBody[CreateAggregationRuleConfigurationRequest])
      .out(statusCode(StatusCode.Created))
      .out(jsonBody[Response[AggregationRuleConfiguration]])
      .name("createAggregationRuleConfigurationAsAdmin")
      .description(s"""Creates a new aggregation rule configuration.
           |
           |Required permission: `${AggregationRuleAdminWritePermission.value}`
           |""".stripMargin)

  def getAggregationRuleConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, AggregationRuleConfigurationRuleId),
    ErrorOut,
    Response[AggregationRuleConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AggregationRuleAdminReadPermission).get
      .in(singleAggregationRuleAdminPathInput)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[AggregationRuleConfiguration]])
      .name("getAggregationRuleConfigurationAsAdmin")
      .description(s"""Returns an aggregation rule configuration for a given id.
           |
           |Required permission: `${AggregationRuleAdminReadPermission.value}`
           |""".stripMargin)

  def updateAggregationRuleConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, AggregationRuleConfigurationRuleId, UpdateAggregationRuleConfigurationRequest),
    ErrorOut,
    Response[AggregationRuleConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AggregationRuleAdminWritePermission).patch
      .in(singleAggregationRuleAdminPathInput)
      .in(jsonBody[UpdateAggregationRuleConfigurationRequest])
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[AggregationRuleConfiguration]])
      .name("updateAggregationRuleConfigurationAsAdmin")
      .description(s"""Activates/deactivates an aggregation rule configuration with a given id or changes its description.. No-op, if the configuration is already in the desired state.
           |
           |Required permission: `${AggregationRuleAdminWritePermission.value}`
           |""".stripMargin)

  def deleteInactiveAggregationRuleConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, AggregationRuleConfigurationRuleId),
    ErrorOut,
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AggregationRuleAdminWritePermission).delete
      .in(singleAggregationRuleAdminPathInput)
      .out(statusCode(StatusCode.NoContent))
      .name("deleteAggregationRuleConfigurationAsAdmin")
      .description(s"""Deletes an inactive aggregation rule configuration with a given id.
           |
           |Required permission: `${AggregationRuleAdminWritePermission.value}`
           |""".stripMargin)

  def swaggerDefinition(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext,
      clock: Clock): SwaggerDefinition =
    SwaggerDefinition(
      getAggregationRuleConfigurationsEndpoint,
      createAggregationRuleConfigurationEndpoint,
      getAggregationRuleConfigurationEndpoint,
      updateAggregationRuleConfigurationEndpoint,
      deleteInactiveAggregationRuleConfigurationEndpoint,
      getAggregationRuleConfigurationsAdminEndpoint,
      createAggregationRuleConfigurationAdminEndpoint,
      getAggregationRuleConfigurationAdminEndpoint,
      updateAggregationRuleConfigurationAdminEndpoint,
      deleteInactiveAggregationRuleConfigurationAdminEndpoint)
}
