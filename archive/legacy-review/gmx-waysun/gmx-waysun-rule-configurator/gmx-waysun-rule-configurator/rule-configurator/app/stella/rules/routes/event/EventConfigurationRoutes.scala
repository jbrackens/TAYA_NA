package stella.rules.routes.event

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import play.api.routing.Router.Routes
import sttp.model.StatusCode
import sttp.tapir.server.play.PlayServerInterpreter

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.UpdateEventConfigurationRequest
import stella.rules.routes.RuleConfiguratorRoutes
import stella.rules.routes.eitherTUnit
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationIsActive
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationIsInUse
import stella.rules.services.RuleConfiguratorBoundedContext
import stella.rules.services.RuleConfiguratorBoundedContext._

/** Combines endpoints definitions with their actual logic */
class EventConfigurationRoutes(
    boundedContext: RuleConfiguratorBoundedContext,
    serverInterpreter: PlayServerInterpreter)(implicit
    jwtAuthorization: JwtAuthorization[StellaAuthContext],
    ec: ExecutionContext)
    extends RuleConfiguratorRoutes {
  import EventConfigurationRoutes._

  lazy val eventRoutes: Routes = getEventConfigurations
    .orElse(createEventConfiguration)
    .orElse(getEventConfiguration)
    .orElse(updateEventConfiguration)
    .orElse(deleteInactiveEventConfiguration)
    .orElse(getEventConfigurationsAsAdmin)
    .orElse(createEventConfigurationAsAdmin)
    .orElse(getEventConfigurationAsAdmin)
    .orElse(updateEventConfigurationAsAdmin)
    .orElse(deleteInactiveEventConfigurationAsAdmin)

  lazy val getEventConfigurations: Routes = {
    val endpoint =
      EventConfigurationEndpoints.getEventConfigurationsEndpoint.serverLogic { authContext => includeInactive =>
        val projectId = getPrimaryProjectId(authContext)
        getEventConfigurations(includeInactive, projectId)
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val createEventConfiguration: Routes = {
    val endpoint =
      EventConfigurationEndpoints.createEventConfigurationEndpoint.serverLogic { authContext => createRequest =>
        val projectId = getPrimaryProjectId(authContext)
        createEventConfiguration(createRequest, projectId)
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getEventConfiguration: Routes = {
    val endpoint =
      EventConfigurationEndpoints.getEventConfigurationEndpoint.serverLogic { authContext => eventId =>
        val projectId = getPrimaryProjectId(authContext)
        getEventConfiguration(eventId, projectId)
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val updateEventConfiguration: Routes = {
    val endpoint =
      EventConfigurationEndpoints.updateEventConfigurationEndpoint.serverLogic { authContext =>
        { case (eventId, updateRequest) =>
          val projectId = getPrimaryProjectId(authContext)
          updateEventConfiguration(eventId, updateRequest, projectId)
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val deleteInactiveEventConfiguration: Routes = {
    val endpoint =
      EventConfigurationEndpoints.deleteInactiveEventConfigurationEndpoint.serverLogic { authContext => eventId =>
        val projectId = getPrimaryProjectId(authContext)
        deleteInactiveEventConfiguration(eventId, projectId)
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getEventConfigurationsAsAdmin: Routes = {
    val endpoint =
      EventConfigurationEndpoints.getEventConfigurationsAdminEndpoint.serverLogic { authContext =>
        { case (projectId, includeInactive) =>
          getEventConfigurations(
            includeInactive,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val createEventConfigurationAsAdmin: Routes = {
    val endpoint =
      EventConfigurationEndpoints.createEventConfigurationAdminEndpoint.serverLogic { authContext =>
        { case (projectId, createRequest) =>
          createEventConfiguration(
            createRequest,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getEventConfigurationAsAdmin: Routes = {
    val endpoint =
      EventConfigurationEndpoints.getEventConfigurationAdminEndpoint.serverLogic { authContext =>
        { case (projectId, eventId) =>
          getEventConfiguration(eventId, projectId, validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val updateEventConfigurationAsAdmin: Routes = {
    val endpoint =
      EventConfigurationEndpoints.updateEventConfigurationAdminEndpoint.serverLogic { authContext =>
        { case (projectId, eventId, updateRequest) =>
          updateEventConfiguration(
            eventId,
            updateRequest,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val deleteInactiveEventConfigurationAsAdmin: Routes = {
    val endpoint =
      EventConfigurationEndpoints.deleteInactiveEventConfigurationAdminEndpoint.serverLogic { authContext =>
        { case (projectId, eventId) =>
          deleteInactiveEventConfiguration(
            eventId,
            projectId,
            validate = authContext.verifyUserHasAccessToProject(projectId))
        }
      }
    serverInterpreter.toRoutes(endpoint)
  }

  private def getEventConfigurations(
      includeInactive: Boolean,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) =
    (for {
      _ <- validate
      result <- EitherT[Future, ErrorOut, Response[Seq[EventConfiguration]]](
        boundedContext
          .getEventConfigurations(includeInactive, projectId)
          .map(configs => Right(Response.asSuccess(configs))))
    } yield result).value.transform(handleUnexpectedFutureError(
      s"Couldn't get event configurations for project $projectId. Inactive ones included: $includeInactive"))

  private def createEventConfiguration(
      createRequest: CreateEventConfigurationRequest,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) =
    (for {
      _ <- validate
      result <- boundedContext
        .createEventConfiguration(createRequest, projectId)
        .bimap(
          {
            case e: EventConfigurationNameAlreadyUsedError =>
              handleEventConfigurationNameAlreadyUsedError(e)
            case e: UnexpectedRuleConfiguratorError =>
              handleUnexpectedError(
                s"Couldn't create event configuration $createRequest for project $projectId. Cause: ${e.details}",
                e.underlying)
          },
          { createdEventConfiguration =>
            log.trace(s"Created event configuration $createdEventConfiguration for project $projectId")
            Response.asSuccess(createdEventConfiguration)
          })
    } yield result).value.transform(
      handleUnexpectedFutureError(s"Couldn't create event configuration $createRequest for project $projectId"))

  private def getEventConfiguration(
      eventId: EventConfigurationEventId,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) =
    (for {
      _ <- validate
      result <- boundedContext
        .getEventConfiguration(eventId, projectId)
        .bimap(
          {
            case e: EventConfigurationNotFoundError =>
              handleEventConfigurationNotFoundError(e)
            case e: UnexpectedRuleConfiguratorError =>
              handleUnexpectedError(
                s"Couldn't get event configuration with id $eventId for project $projectId. Cause: ${e.details}",
                e.underlying)
          },
          { fetchedEventConfiguration =>
            log.trace(s"Fetched event configuration $fetchedEventConfiguration")
            Response.asSuccess(fetchedEventConfiguration)
          })
    } yield result).value.transform(
      handleUnexpectedFutureError(s"Couldn't get event configuration with id $eventId for project $projectId}"))

  private def updateEventConfiguration(
      eventId: EventConfigurationEventId,
      updateRequest: UpdateEventConfigurationRequest,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit) =
    (for {
      _ <- validate
      result <- boundedContext
        .updateEventConfiguration(eventId, updateRequest, projectId)
        .bimap(
          {
            case e: EventConfigurationNotFoundError =>
              handleEventConfigurationNotFoundError(e)
            case e: UnexpectedRuleConfiguratorError =>
              handleUnexpectedError(
                s"Couldn't update event configuration with id $eventId for project $projectId. Request: $updateRequest. Cause: ${e.details}",
                e.underlying)
          },
          { eventConfigurationWithChangeActivationState =>
            log.trace(s"Updated event configuration $eventConfigurationWithChangeActivationState")
            Response.asSuccess(eventConfigurationWithChangeActivationState)
          })
    } yield result).value.transform(handleUnexpectedFutureError(
      s"Couldn't update event configuration with id $eventId for project $projectId. Request: $updateRequest"))

  private def deleteInactiveEventConfiguration(
      eventId: EventConfigurationEventId,
      projectId: ProjectId,
      validate: EitherT[Future, ErrorOut, Unit] = eitherTUnit): Future[Either[ErrorOut, Unit]] =
    (for {
      _ <- validate
      result <- boundedContext
        .deleteEventConfiguration(eventId, projectId)
        .leftMap({
          case e: EventConfigurationNotFoundError =>
            handleEventConfigurationNotFoundError(e)
          case e: EventConfigurationIsActiveError =>
            log.trace(e.errorMessage)
            val response = errorCodeResponse(EventConfigurationIsActive)
            StatusCode.Conflict -> response
          case e: EventConfigurationIsInUseError =>
            log.trace(e.errorMessage)
            val response = errorCodeResponse(EventConfigurationIsInUse)
            StatusCode.Conflict -> response
          case e: UnexpectedRuleConfiguratorError =>
            handleUnexpectedError(
              s"Couldn't delete event configuration with id $eventId for project $projectId. Cause: ${e.underlying}",
              e.underlying)
        })
    } yield result).value.transform(
      handleUnexpectedFutureError(s"Couldn't delete event configuration with id $eventId for project $projectId"))

  private def getPrimaryProjectId(authContext: StellaAuthContext) = ProjectId(authContext.primaryProjectId)
}

object EventConfigurationRoutes {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
