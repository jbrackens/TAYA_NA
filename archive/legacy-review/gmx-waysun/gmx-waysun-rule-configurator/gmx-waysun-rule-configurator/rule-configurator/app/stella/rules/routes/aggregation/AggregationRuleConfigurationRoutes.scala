package stella.rules.routes.aggregation

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import play.api.routing.Router.Routes
import sttp.model.StatusCode
import sttp.tapir.server.play.PlayServerInterpreter

import stella.common.core.Clock
import stella.common.http.Response
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.aggregation.http.UpdateAggregationRuleConfigurationRequest
import stella.rules.routes.RuleConfiguratorRoutes
import stella.rules.routes.eitherTUnit
import stella.rules.routes.error.AdditionalPresentationErrorCode.AggregationRuleConfigurationIsActive
import stella.rules.routes.error.AdditionalPresentationErrorCode.AggregationRuleConfigurationIsInUse
import stella.rules.services.RuleConfiguratorBoundedContext
import stella.rules.services.RuleConfiguratorBoundedContext._

/** Combines endpoints definitions with their actual logic */
class AggregationRuleConfigurationRoutes(
    boundedContext: RuleConfiguratorBoundedContext,
    serverInterpreter: PlayServerInterpreter)(implicit
    jwtAuthorization: JwtAuthorization[StellaAuthContext],
    ec: ExecutionContext,
    clock: Clock)
    extends RuleConfiguratorRoutes {
  import AggregationRuleConfigurationRoutes.log

  lazy val aggregationRuleRoutes: Routes = getAggregationRuleConfigurations
    .orElse(createAggregationRuleConfiguration)
    .orElse(getAggregationRuleConfiguration)
    .orElse(updateAggregationRuleConfiguration)
    .orElse(deleteInactiveAggregationRuleConfiguration)
    .orElse(getAggregationRuleConfigurationsAsAdmin)
    .orElse(createAggregationRuleConfigurationAsAdmin)
    .orElse(getAggregationRuleConfigurationAsAdmin)
    .orElse(updateAggregationRuleConfigurationAsAdmin)
    .orElse(deleteInactiveAggregationRuleConfigurationAsAdmin)

  lazy val getAggregationRuleConfigurations: Routes = {
    val endpoint =
      AggregationRuleConfigurationEndpoints.getAggregationRuleConfigurationsEndpoint.serverLogic {
        authContext => includeInactive =>
          getAggregationRuleConfigurations(includeInactive, getPrimaryProjectId(authContext))
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getAggregationRuleConfigurationsAsAdmin: Routes = {
    val endpoint =
      AggregationRuleConfigurationEndpoints.getAggregationRuleConfigurationsAdminEndpoint.serverLogic { authContext =>
        { case (projectId, includeInactive) =>
          getAggregationRuleConfigurations(
            includeInactive,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val createAggregationRuleConfiguration: Routes = {
    val endpoint =
      AggregationRuleConfigurationEndpoints.createAggregationRuleConfigurationEndpoint.serverLogic {
        authContext => createRequest =>
          createAggregationRuleConfiguration(createRequest, getPrimaryProjectId(authContext))
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val createAggregationRuleConfigurationAsAdmin: Routes = {
    val endpoint =
      AggregationRuleConfigurationEndpoints.createAggregationRuleConfigurationAdminEndpoint.serverLogic { authContext =>
        { case (projectId, createRequest) =>
          createAggregationRuleConfiguration(
            createRequest,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getAggregationRuleConfiguration: Routes = {
    val endpoint =
      AggregationRuleConfigurationEndpoints.getAggregationRuleConfigurationEndpoint.serverLogic {
        authContext => aggregationRuleId =>
          getAggregationRuleConfiguration(aggregationRuleId, getPrimaryProjectId(authContext))
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getAggregationRuleConfigurationAsAdmin: Routes = {
    val endpoint =
      AggregationRuleConfigurationEndpoints.getAggregationRuleConfigurationAdminEndpoint.serverLogic { authContext =>
        { case (projectId, aggregationRuleId) =>
          getAggregationRuleConfiguration(
            aggregationRuleId,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val updateAggregationRuleConfiguration: Routes = {
    val endpoint =
      AggregationRuleConfigurationEndpoints.updateAggregationRuleConfigurationEndpoint.serverLogic { authContext =>
        { case (aggregationRuleId, updateRequest) =>
          updateAggregationRuleConfiguration(aggregationRuleId, updateRequest, getPrimaryProjectId(authContext))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val updateAggregationRuleConfigurationAsAdmin: Routes = {
    val endpoint =
      AggregationRuleConfigurationEndpoints.updateAggregationRuleConfigurationAdminEndpoint.serverLogic { authContext =>
        { case (projectId, aggregationRuleId, updateRequest) =>
          updateAggregationRuleConfiguration(
            aggregationRuleId,
            updateRequest,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val deleteInactiveAggregationRuleConfiguration: Routes = {
    val endpoint =
      AggregationRuleConfigurationEndpoints.deleteInactiveAggregationRuleConfigurationEndpoint.serverLogic {
        authContext =>
          { case (aggregationRuleId) =>
            deleteInactiveAggregationRuleConfiguration(aggregationRuleId, getPrimaryProjectId(authContext))
          }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val deleteInactiveAggregationRuleConfigurationAsAdmin: Routes = {
    val endpoint =
      AggregationRuleConfigurationEndpoints.deleteInactiveAggregationRuleConfigurationAdminEndpoint.serverLogic {
        authContext =>
          { case (projectId, aggregationRuleId) =>
            deleteInactiveAggregationRuleConfiguration(
              aggregationRuleId,
              projectId,
              validate = authContext.verifyUserHasAccessToProject(projectId))
          }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  private def getAggregationRuleConfigurations(
      includeInactive: Boolean,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) = {
    (for {
      _ <- validate
      resp <- EitherT
        .right[ErrorOut](boundedContext.getAggregationRuleConfigurations(includeInactive, projectId))
        .map(configs => Response.asSuccess(configs))
    } yield resp).value.transform(handleUnexpectedFutureError(
      s"Couldn't get aggregation rule configurations for project $projectId. Inactive ones included: $includeInactive"))
  }

  private def createAggregationRuleConfiguration(
      createRequest: CreateAggregationRuleConfigurationRequest,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) = {
    (for {
      _ <- validate
      resp <- boundedContext
        .createAggregationRuleConfiguration(createRequest, projectId)
        .bimap(
          {
            case e: EventConfigurationNotFoundError =>
              handleEventConfigurationNotFoundError(e)
            case e: AggregationRuleConfigurationNameAlreadyUsedError =>
              handleAggregationRuleConfigurationNameAlreadyUsedError(e)
            case e: UnexpectedRuleConfiguratorError =>
              handleUnexpectedError(
                s"Couldn't create aggregation rule configuration $createRequest for project $projectId. Cause: ${e.details}",
                e.underlying)
          },
          { createdAggregationRuleConfiguration =>
            log.trace(
              s"Created aggregation rule configuration $createdAggregationRuleConfiguration for project $projectId")
            Response.asSuccess(createdAggregationRuleConfiguration)
          })
    } yield resp).value.transform(handleUnexpectedFutureError(
      s"Couldn't create aggregation rule configuration $createRequest for project $projectId"))
  }

  private def getAggregationRuleConfiguration(
      aggregationRuleId: AggregationRuleConfigurationRuleId,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) = {
    (for {
      _ <- validate
      resp <- boundedContext
        .getAggregationRuleConfiguration(aggregationRuleId, projectId)
        .bimap(
          {
            case e: AggregationRuleConfigurationNotFoundError =>
              handleAggregationRuleConfigurationNotFoundError(e)
            case e: UnexpectedRuleConfiguratorError =>
              handleUnexpectedError(
                s"Couldn't get aggregation rule configuration with id $aggregationRuleId for project $projectId. Cause: ${e.details}",
                e.underlying)
          },
          { fetchedEventConfiguration =>
            log.trace(s"Fetched aggregation rule configuration $fetchedEventConfiguration")
            Response.asSuccess(fetchedEventConfiguration)
          })
    } yield resp).value.transform(handleUnexpectedFutureError(
      s"Couldn't get aggregation rule configuration with id $aggregationRuleId for project $projectId}"))
  }

  private def updateAggregationRuleConfiguration(
      aggregationRuleId: AggregationRuleConfigurationRuleId,
      updateRequest: UpdateAggregationRuleConfigurationRequest,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) = {
    (for {
      _ <- validate
      resp <- boundedContext
        .updateAggregationRuleConfiguration(aggregationRuleId, updateRequest, projectId)
        .bimap(
          {
            case e: AggregationRuleConfigurationNotFoundError =>
              handleAggregationRuleConfigurationNotFoundError(e)
            case e: UnexpectedRuleConfiguratorError =>
              handleUnexpectedError(
                s"Couldn't update aggregation rule configuration with id $aggregationRuleId for project $projectId. Request: $updateRequest. Cause: ${e.details}",
                e.underlying)
          },
          { eventConfigurationWithChangeActivationState =>
            log.trace(s"Updated aggregation rule configuration $eventConfigurationWithChangeActivationState")
            Response.asSuccess(eventConfigurationWithChangeActivationState)
          })
    } yield resp).value.transform(handleUnexpectedFutureError(
      s"Couldn't update aggregation rule configuration with id $aggregationRuleId for project $projectId. Request: $updateRequest"))
  }

  private def deleteInactiveAggregationRuleConfiguration(
      aggregationRuleId: AggregationRuleConfigurationRuleId,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) = {
    (for {
      _ <- validate
      _ <- boundedContext
        .deleteAggregationRuleConfiguration(aggregationRuleId, projectId)
        .leftMap({
          case e: AggregationRuleConfigurationNotFoundError =>
            handleAggregationRuleConfigurationNotFoundError(e)
          case e: AggregationRuleConfigurationIsActiveError =>
            log.trace(e.errorMessage)
            val response = errorCodeResponse(AggregationRuleConfigurationIsActive)
            StatusCode.Conflict -> response
          case e: AggregationRuleConfigurationIsInUseError =>
            log.trace(e.errorMessage)
            val response = errorCodeResponse(AggregationRuleConfigurationIsInUse)
            StatusCode.Conflict -> response
          case e: UnexpectedRuleConfiguratorError =>
            handleUnexpectedError(
              s"Couldn't delete aggregation rule configuration with id $aggregationRuleId for project $projectId. Cause: ${e.underlying}",
              e.underlying)
        })
    } yield ()).value.transform(handleUnexpectedFutureError(
      s"Couldn't delete aggregation rule configuration with id $aggregationRuleId for project $projectId"))
  }

  private def getPrimaryProjectId(authContext: StellaAuthContext) = ProjectId(authContext.primaryProjectId)
}

object AggregationRuleConfigurationRoutes {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
