package stella.rules.routes.achievement

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.generic.auto.schemaForCaseClass
import sttp.tapir.json.spray.jsonBody
import sttp.tapir.server.PartialServerEndpoint

import stella.common.http.Response
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.SwaggerDefinition
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.http.routes.TapirAuthDirectives.endpointWithJwtValidation
import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.AchievementConfigurationRuleId
import stella.rules.models.achievement.http.AchievementRuleConfiguration
import stella.rules.models.achievement.http.CreateAchievementRuleConfigurationRequest
import stella.rules.models.achievement.http.UpdateAchievementRuleConfigurationRequest
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AchievementRuleAdminReadPermission
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AchievementRuleAdminWritePermission
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AchievementRuleReadPermission
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AchievementRuleWritePermission

object AchievementRuleConfigurationEndpoints {

  import stella.rules.models.Ids.AchievementConfigurationRuleId.achievementConfigurationRuleIdCodec
  import stella.rules.models.Ids.ProjectIdInstances.projectIdCodec
  import stella.rules.routes.ResponseFormats._
  import errorOutputFormats._
  import errorOutputSchemas._

  private val includeInactiveQueryParam = "include_inactive"
  private val achievementProjectIdPathParam = "project_id"
  private val achievementRuleIdPathParam = "achievement_rule_id"
  private val achievementIdPathCapture = path[AchievementConfigurationRuleId](achievementRuleIdPathParam).description(
    "An achievement rule configuration id assigned by the system when creating this achievement rule configuration")
  private val baseAchievementPathInput = "rule_configurator" / "achievements"
  private val baseAchievementAdminPathInput =
    "rule_configurator" / "admin" / path[ProjectId](achievementProjectIdPathParam) / "achievements"
  private val singleAchievementRulePathInput = baseAchievementPathInput / achievementIdPathCapture
  private val singleAchievementRuleAdminPathInput = baseAchievementAdminPathInput / achievementIdPathCapture

  def getAchievementRuleConfigurationsEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    Boolean,
    ErrorOut,
    Response[Seq[AchievementRuleConfiguration]],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AchievementRuleReadPermission).get
      .in(baseAchievementPathInput)
      .in(query[Boolean](includeInactiveQueryParam).default(false))
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[AchievementRuleConfiguration]]])
      .name("getAchievementRuleConfigurations")
      .description(s"""Returns an achievement rule configurations. By default includes only the active ones, unless the
           |$includeInactiveQueryParam query param was set.
           |
           |Required permission: `${AchievementRuleReadPermission.value}`
           |""".stripMargin)

  def createAchievementRuleConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    CreateAchievementRuleConfigurationRequest,
    ErrorOut,
    Response[AchievementRuleConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AchievementRuleWritePermission).post
      .in(baseAchievementPathInput)
      .in(jsonBody[CreateAchievementRuleConfigurationRequest])
      .out(statusCode(StatusCode.Created))
      .out(jsonBody[Response[AchievementRuleConfiguration]])
      .name("createAchievementRuleConfiguration")
      .description(s"""Creates a new achievement rule configuration.
           |
           |Required permission: `${AchievementRuleWritePermission.value}`
           |""".stripMargin)

  def getAchievementRuleConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    AchievementConfigurationRuleId,
    ErrorOut,
    Response[AchievementRuleConfiguration],
    Any,
    Future] = {
    endpointWithJwtValidation(requiredPermissions = AchievementRuleReadPermission).get
      .in(singleAchievementRulePathInput)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[AchievementRuleConfiguration]])
      .name("getAchievementRuleConfiguration")
      .description(s"""Returns an achievement rule configuration for a given id.
           |
           |Required permission: `${AchievementRuleReadPermission.value}`
           |""".stripMargin)
  }

  def updateAchievementRuleConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (AchievementConfigurationRuleId, UpdateAchievementRuleConfigurationRequest),
    ErrorOut,
    Response[AchievementRuleConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AchievementRuleWritePermission).patch
      .in(singleAchievementRulePathInput)
      .in(jsonBody[UpdateAchievementRuleConfigurationRequest])
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[AchievementRuleConfiguration]])
      .name("updateAchievementRuleConfiguration")
      .description(s"""Activates/deactivates an achievement rule configuration with a given id or changes its description. No-op, if the configuration is already in the desired state.
            |
            |Required permission: `${AchievementRuleWritePermission.value}`
            |""".stripMargin)

  def deleteInactiveAchievementRuleConfigurationEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext)
      : PartialServerEndpoint[String, StellaAuthContext, AchievementConfigurationRuleId, ErrorOut, Unit, Any, Future] =
    endpointWithJwtValidation(requiredPermissions = AchievementRuleWritePermission).delete
      .in(singleAchievementRulePathInput)
      .out(statusCode(StatusCode.NoContent))
      .name("deleteInactiveAchievementRuleConfiguration")
      .description(s"""Deletes an inactive achievement rule configuration with a given id.
           |
           |Required permission: `${AchievementRuleWritePermission.value}`
           |""".stripMargin)

  def getAchievementRuleConfigurationsAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, Boolean),
    ErrorOut,
    Response[Seq[AchievementRuleConfiguration]],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AchievementRuleAdminReadPermission).get
      .in(baseAchievementAdminPathInput)
      .in(query[Boolean](includeInactiveQueryParam).default(false))
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[Seq[AchievementRuleConfiguration]]])
      .name("getAchievementRuleConfigurationsAsAdmin")
      .description(s"""Returns an achievement rule configurations. By default includes only the active ones, unless the
          |$includeInactiveQueryParam query param was set.
          |
          |Required permission: `${AchievementRuleAdminReadPermission.value}`
          |""".stripMargin)

  def createAchievementRuleConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, CreateAchievementRuleConfigurationRequest),
    ErrorOut,
    Response[AchievementRuleConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AchievementRuleAdminWritePermission).post
      .in(baseAchievementAdminPathInput)
      .in(jsonBody[CreateAchievementRuleConfigurationRequest])
      .out(statusCode(StatusCode.Created))
      .out(jsonBody[Response[AchievementRuleConfiguration]])
      .name("createAchievementRuleConfigurationAsAdmin")
      .description(s"""Creates a new achievement rule configuration.
          |
          |Required permission: `${AchievementRuleAdminWritePermission.value}`
          |""".stripMargin)

  def getAchievementRuleConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, AchievementConfigurationRuleId),
    ErrorOut,
    Response[AchievementRuleConfiguration],
    Any,
    Future] = {
    endpointWithJwtValidation(requiredPermissions = AchievementRuleAdminReadPermission).get
      .in(singleAchievementRuleAdminPathInput)
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[AchievementRuleConfiguration]])
      .name("getAchievementRuleConfigurationAsAdmin")
      .description(s"""Returns an achievement rule configuration for a given id.
          |
          |Required permission: `${AchievementRuleAdminReadPermission.value}`
          |""".stripMargin)
  }

  def updateAchievementRuleConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, AchievementConfigurationRuleId, UpdateAchievementRuleConfigurationRequest),
    ErrorOut,
    Response[AchievementRuleConfiguration],
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AchievementRuleAdminWritePermission).patch
      .in(singleAchievementRuleAdminPathInput)
      .in(jsonBody[UpdateAchievementRuleConfigurationRequest])
      .out(statusCode(StatusCode.Ok))
      .out(jsonBody[Response[AchievementRuleConfiguration]])
      .name("updateAchievementRuleConfigurationAsAdmin")
      .description(s"""Activates/deactivates an achievement rule configuration with a given id or changes its description. No-op, if the configuration is already in the desired state.
          |
          |Required permission: `${AchievementRuleAdminWritePermission.value}`
          |""".stripMargin)

  def deleteInactiveAchievementRuleConfigurationAdminEndpoint(implicit
      auth: JwtAuthorization[StellaAuthContext],
      ec: ExecutionContext): PartialServerEndpoint[
    String,
    StellaAuthContext,
    (ProjectId, AchievementConfigurationRuleId),
    ErrorOut,
    Unit,
    Any,
    Future] =
    endpointWithJwtValidation(requiredPermissions = AchievementRuleAdminWritePermission).delete
      .in(singleAchievementRuleAdminPathInput)
      .out(statusCode(StatusCode.NoContent))
      .name("deleteInactiveAchievementRuleConfigurationAsAdmin")
      .description(s"""Deletes an inactive achievement rule configuration with a given id.
          |
          |Required permission: `${AchievementRuleAdminWritePermission.value}`
          |""".stripMargin)

  def swaggerDefinition(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext): SwaggerDefinition =
    SwaggerDefinition(
      getAchievementRuleConfigurationsEndpoint,
      createAchievementRuleConfigurationEndpoint,
      getAchievementRuleConfigurationEndpoint,
      updateAchievementRuleConfigurationEndpoint,
      deleteInactiveAchievementRuleConfigurationEndpoint,
      getAchievementRuleConfigurationsAdminEndpoint,
      createAchievementRuleConfigurationAdminEndpoint,
      getAchievementRuleConfigurationsAdminEndpoint,
      createAchievementRuleConfigurationAdminEndpoint,
      deleteInactiveAchievementRuleConfigurationAdminEndpoint)

}
