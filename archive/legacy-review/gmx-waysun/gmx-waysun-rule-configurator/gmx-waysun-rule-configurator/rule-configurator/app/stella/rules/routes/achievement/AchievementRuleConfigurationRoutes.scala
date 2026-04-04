package stella.rules.routes.achievement

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import play.api.routing.Router.Routes
import sttp.model.StatusCode
import sttp.tapir.server.play.PlayServerInterpreter

import stella.common.http.Response
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.AchievementConfigurationRuleId
import stella.rules.models.achievement.http.CreateAchievementRuleConfigurationRequest
import stella.rules.models.achievement.http.UpdateAchievementRuleConfigurationRequest
import stella.rules.routes.RuleConfiguratorRoutes
import stella.rules.routes.eitherTUnit
import stella.rules.routes.error.AdditionalPresentationErrorCode.AchievementRuleConfigurationIsActive
import stella.rules.services.RuleConfiguratorBoundedContext
import stella.rules.services.RuleConfiguratorBoundedContext._

class AchievementRuleConfigurationRoutes(
    boundedContext: RuleConfiguratorBoundedContext,
    serverInterpreter: PlayServerInterpreter)(implicit
    jwtAuthorization: JwtAuthorization[StellaAuthContext],
    ec: ExecutionContext)
    extends RuleConfiguratorRoutes {

  import AchievementRuleConfigurationRoutes.log

  lazy val achievementRuleRoutes: Routes = getAchievementRuleConfigurations
    .orElse(createAchievementRuleConfiguration)
    .orElse(getAchievementRuleConfiguration)
    .orElse(updateAchievementRuleConfiguration)
    .orElse(deleteAchievementRuleConfiguration)
    .orElse(getAchievementRuleConfigurationsAsAdmin)
    .orElse(createAchievementRuleConfigurationAsAdmin)
    .orElse(getAchievementRuleConfigurationAsAdmin)
    .orElse(updateAchievementRuleConfigurationAsAdmin)
    .orElse(deleteAchievementRuleConfigurationAsAdmin)

  lazy val getAchievementRuleConfigurations: Routes = {
    val endpoint =
      AchievementRuleConfigurationEndpoints.getAchievementRuleConfigurationsEndpoint.serverLogic {
        authContext => includeInactive =>
          getAchievementRuleConfigurations(includeInactive, getPrimaryProjectId(authContext))
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getAchievementRuleConfigurationsAsAdmin: Routes = {
    val endpoint =
      AchievementRuleConfigurationEndpoints.getAchievementRuleConfigurationsAdminEndpoint.serverLogic { authContext =>
        { case (projectId, includeInactive) =>
          getAchievementRuleConfigurations(
            includeInactive,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val createAchievementRuleConfiguration: Routes = {
    val endpoint =
      AchievementRuleConfigurationEndpoints.createAchievementRuleConfigurationEndpoint.serverLogic {
        authContext => createRequest =>
          createAchievementRuleConfiguration(createRequest, getPrimaryProjectId(authContext))
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val createAchievementRuleConfigurationAsAdmin: Routes = {
    val endpoint =
      AchievementRuleConfigurationEndpoints.createAchievementRuleConfigurationAdminEndpoint.serverLogic { authContext =>
        { case (projectId, createRequest) =>
          createAchievementRuleConfiguration(
            createRequest,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getAchievementRuleConfiguration: Routes = {
    val endpoint =
      AchievementRuleConfigurationEndpoints.getAchievementRuleConfigurationEndpoint.serverLogic {
        authContext => achievementRuleId =>
          getAchievementRuleConfiguration(achievementRuleId, getPrimaryProjectId(authContext))
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getAchievementRuleConfigurationAsAdmin: Routes = {
    val endpoint =
      AchievementRuleConfigurationEndpoints.getAchievementRuleConfigurationAdminEndpoint.serverLogic { authContext =>
        { case (projectId, achievementRuleId) =>
          getAchievementRuleConfiguration(
            achievementRuleId,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val updateAchievementRuleConfiguration: Routes = {
    val endpoint =
      AchievementRuleConfigurationEndpoints.updateAchievementRuleConfigurationEndpoint.serverLogic { authContext =>
        { case (ruleId, updateRequest) =>
          updateAchievementRuleConfiguration(ruleId, updateRequest, getPrimaryProjectId(authContext))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val updateAchievementRuleConfigurationAsAdmin: Routes = {
    val endpoint =
      AchievementRuleConfigurationEndpoints.updateAchievementRuleConfigurationAdminEndpoint.serverLogic { authContext =>
        { case (projectId, ruleId, updateRequest) =>
          updateAchievementRuleConfiguration(
            ruleId,
            updateRequest,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val deleteAchievementRuleConfiguration: Routes = {
    val endpoint =
      AchievementRuleConfigurationEndpoints.deleteInactiveAchievementRuleConfigurationEndpoint.serverLogic {
        authContext => achievementRuleId =>
          deleteAchievementRuleConfiguration(achievementRuleId, getPrimaryProjectId(authContext))
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val deleteAchievementRuleConfigurationAsAdmin: Routes = {
    val endpoint =
      AchievementRuleConfigurationEndpoints.deleteInactiveAchievementRuleConfigurationAdminEndpoint.serverLogic {
        authContext =>
          { case (projectId, achievementRuleId) =>
            deleteAchievementRuleConfiguration(
              achievementRuleId,
              projectId,
              validate = authContext.verifyUserHasAccessToProject(projectId))
          }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  private def getAchievementRuleConfigurations(
      includeInactive: Boolean,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) = {
    (for {
      _ <- validate
      resp <- EitherT
        .right[ErrorOut](boundedContext.getAchievementRuleConfigurations(includeInactive, projectId))
        .map(configs => Response.asSuccess(configs))
    } yield resp).value.transform(handleUnexpectedFutureError(
      s"Couldn't get achievement rule configurations for project $projectId. Inactive ones included: $includeInactive"))
  }

  private def createAchievementRuleConfiguration(
      createRequest: CreateAchievementRuleConfigurationRequest,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) = {
    (for {
      _ <- validate
      resp <- boundedContext
        .createAchievementRuleConfiguration(createRequest, projectId)
        .bimap(
          {
            case e: EventConfigurationNotFoundError =>
              handleEventConfigurationNotFoundError(e)
            case e: EventConfigurationFieldNotFoundError =>
              handleEventConfigurationFieldNotFoundError(e)
            case e: EventConfigurationFieldNotProvidedError =>
              handleEventConfigurationFieldNotProvidedError(e)
            case e: AggregationRuleConfigurationNotFoundError =>
              handleAggregationRuleConfigurationNotFoundError(e)
            case e: AchievementRuleConfigurationNameAlreadyUsedError =>
              handleAchievementRuleConfigurationNameAlreadyUsedError(e)
            case e: UnexpectedRuleConfiguratorError =>
              handleUnexpectedError(
                s"Couldn't create achievement rule configuration $createRequest for project $projectId. Cause: ${e.details}",
                e.underlying)
          },
          { createdAchievementRuleConfiguration =>
            log.trace(
              s"Created achievement rule configuration $createdAchievementRuleConfiguration for project $projectId")
            Response.asSuccess(createdAchievementRuleConfiguration)
          })
    } yield resp).value.transform(handleUnexpectedFutureError(
      s"Couldn't create achievement rule configuration $createRequest for project $projectId"))
  }

  private def getAchievementRuleConfiguration(
      achievementRuleId: AchievementConfigurationRuleId,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) = {
    (for {
      _ <- validate
      resp <- boundedContext
        .getAchievementRuleConfiguration(achievementRuleId, projectId)
        .bimap(
          {
            case e: AchievementRuleConfigurationNotFoundError =>
              handleAchievementRuleConfigurationNotFoundError(e)
            case e: UnexpectedRuleConfiguratorError =>
              handleUnexpectedError(
                s"Couldn't get achievement rule configuration with id $achievementRuleId for project $projectId. Cause: ${e.details}",
                e.underlying)
          },
          { achievementRuleConfiguration =>
            log.trace(s"Fetched achievement rule configuration $achievementRuleConfiguration")
            Response.asSuccess(achievementRuleConfiguration)
          })
    } yield resp).value.transform(handleUnexpectedFutureError(
      s"Couldn't get achievement rule configuration with id $achievementRuleId for project $projectId"))
  }

  private def updateAchievementRuleConfiguration(
      achievementRuleId: AchievementConfigurationRuleId,
      updateRequest: UpdateAchievementRuleConfigurationRequest,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) = {
    (for {
      _ <- validate
      resp <- boundedContext
        .updateAchievementRuleConfiguration(achievementRuleId, updateRequest, projectId)
        .bimap(
          {
            case e: AchievementRuleConfigurationNotFoundError =>
              handleAchievementRuleConfigurationNotFoundError(e)
            case e: UnexpectedRuleConfiguratorError =>
              handleUnexpectedError(
                s"Couldn't update achievement rule configuration with id $achievementRuleId for project $projectId. Request: $updateRequest. Cause: ${e.details}",
                e.underlying)
          },
          { achievementRuleConfiguration =>
            log.trace(s"Updated achievement rule configuration $achievementRuleConfiguration")
            Response.asSuccess(achievementRuleConfiguration)
          })
    } yield resp).value.transform(handleUnexpectedFutureError(
      s"Couldn't update achievement rule configuration with id $achievementRuleId for project $projectId. Request: $updateRequest"))
  }

  private def deleteAchievementRuleConfiguration(
      achievementRuleId: AchievementConfigurationRuleId,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) = {
    (for {
      _ <- validate
      resp <- boundedContext
        .deleteAchievementRuleConfiguration(achievementRuleId, projectId)
        .leftMap({
          case e: AchievementRuleConfigurationNotFoundError =>
            handleAchievementRuleConfigurationNotFoundError(e)
          case e: AchievementRuleConfigurationIsActiveError =>
            log.trace(e.errorMessage)
            val response = errorCodeResponse(AchievementRuleConfigurationIsActive)
            StatusCode.Conflict -> response
          case e: UnexpectedRuleConfiguratorError =>
            handleUnexpectedError(
              s"Couldn't delete achievement rule configuration with id $achievementRuleId for project $projectId. Cause: ${e.underlying}",
              e.underlying)
        })
    } yield resp).value.transform(handleUnexpectedFutureError(
      s"Couldn't delete achievement rule configuration with id $achievementRuleId for project $projectId"))
  }

  private def getPrimaryProjectId(authContext: StellaAuthContext) = ProjectId(authContext.primaryProjectId)
}

object AchievementRuleConfigurationRoutes {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
