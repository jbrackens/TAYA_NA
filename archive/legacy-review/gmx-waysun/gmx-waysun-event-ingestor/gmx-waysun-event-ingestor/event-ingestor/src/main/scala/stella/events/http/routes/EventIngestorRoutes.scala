package stella.events.http.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.http.scaladsl.server.Directives._
import akka.http.scaladsl.server.Route
import cats.data.EitherT
import ch.megard.akka.http.cors.scaladsl.CorsDirectives.cors
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import sttp.model.StatusCode
import sttp.tapir.openapi.Server
import sttp.tapir.server.akkahttp.AkkaHttpServerInterpreter
import sttp.tapir.swagger.SwaggerUIOptions
import sttp.tapir.swagger.bundle.SwaggerInterpreter

import stella.common.http.config.OpenApiConfig
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.RoutesResponseHelper
import stella.common.http.routes.TapirAuthDirectives.ErrorOut

import stella.events.EventIngestorBoundedContext
import stella.events.EventIngestorBoundedContext.UnexpectedEventSubmissionException
import stella.events.http.routes.json.IncomingAdminEvent

/** Combines endpoints definitions with their actual logic */
class EventIngestorRoutes(
    eventIngestorBoundedContext: EventIngestorBoundedContext,
    serverInterpreter: AkkaHttpServerInterpreter,
    openApiConfig: OpenApiConfig)(implicit auth: JwtAuthorization[StellaAuthContext], ec: ExecutionContext)
    extends RoutesResponseHelper {
  import EventIngestorRoutes._

  lazy val all: Route = cors() { concat(submitEvent, submitEventAsSuperAdmin, submitEventAsAdmin, openApi) }

  lazy val submitEvent: Route = {
    val endpoint = EventIngestorEndpoints.submitEvent.serverLogic { authContext => event =>
      eventIngestorBoundedContext
        .submitEvent(event, authContext)
        .bimap(
          { case e: UnexpectedEventSubmissionException =>
            log.error(s"UnexpectedEventSubmissionException: Couldn't submit event $event. Cause: $e")
            val response = errorCodeResponse(PresentationErrorCode.InternalError)
            StatusCode.InternalServerError -> response
          },
          { _ =>
            log.trace(s"Persisted event $event")
          })
        .value
        .transform(handleUnexpectedFutureError(s"Couldn't submit event $event"))
    }
    serverInterpreter.toRoute(endpoint)
  }

  lazy val submitEventAsSuperAdmin: Route = {
    val endpoint = EventIngestorEndpoints.submitEventAsSuperAdmin.serverLogic { authContext => event =>
      eventIngestorBoundedContext
        .submitEventAsAdmin(event, authContext)
        .bimap(
          { case e: UnexpectedEventSubmissionException =>
            log.error(s"UnexpectedEventSubmissionException: Couldn't submit event $event as super admin. Cause: $e")
            val response = errorCodeResponse(PresentationErrorCode.InternalError)
            StatusCode.InternalServerError -> response
          },
          { _ =>
            log.trace(s"Persisted event $event as super admin")
          })
        .value
        .transform(handleUnexpectedFutureError(s"Couldn't submit event $event as super admin"))
    }
    serverInterpreter.toRoute(endpoint)
  }

  lazy val submitEventAsAdmin: Route = {
    val endpoint = EventIngestorEndpoints.submitEventAsAdmin.serverLogic { authContext => event =>
      (for {
        _ <- validateAdminProjects(event, authContext)
        _ <- eventIngestorBoundedContext
          .submitEventAsAdmin(event, authContext)
          .bimap(
            { case e: UnexpectedEventSubmissionException =>
              log.error(s"UnexpectedEventSubmissionException: Couldn't submit event $event as admin. Cause: $e")
              val response = errorCodeResponse(PresentationErrorCode.InternalError)
              StatusCode.InternalServerError -> response
            },
            { _ =>
              log.trace(s"Persisted event $event as super admin")
            })
      } yield ()).value.transform(handleUnexpectedFutureError(s"Couldn't submit event $event as admin"))
    }
    serverInterpreter.toRoute(endpoint)
  }

  lazy val openApi: Route =
    serverInterpreter.toRoute(
      SwaggerInterpreter(
        customiseDocsModel = _.servers(List(Server(openApiConfig.serverUrl))),
        swaggerUIOptions = SwaggerUIOptions.default.pathPrefix(List(openApiDocsPath))).fromEndpoints[Future](
        endpoints = EventIngestorEndpoints.swaggerDefinition.endpoints,
        title = "Stella Event Ingestor",
        version = "0.9"))

  private def validateAdminProjects(
      event: IncomingAdminEvent,
      authContext: StellaAuthContext): EitherT[Future, ErrorOut, Unit] =
    event.onBehalfOfProjectId match {
      case Some(onBehalfOfProjectId) => authContext.verifyUserHasAccessToProject(onBehalfOfProjectId)
      case None                      => EitherT.pure[Future, ErrorOut](())
    }
}

object EventIngestorRoutes {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  private val openApiDocsPath = "event_ingestor_docs"
}
