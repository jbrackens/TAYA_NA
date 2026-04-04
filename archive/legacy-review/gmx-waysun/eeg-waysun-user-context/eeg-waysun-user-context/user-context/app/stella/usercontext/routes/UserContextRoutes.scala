package stella.usercontext.routes

import scala.concurrent.ExecutionContext

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import play.api.routing.Router.Routes
import sttp.model.StatusCode
import sttp.tapir.server.play.PlayServerInterpreter

import stella.common.http.Response
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.StellaAuthContext
import stella.common.http.routes.RoutesResponseHelper
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.usercontext.models.Ids.UserContextKey
import stella.usercontext.services.UserContextBoundedContext
import stella.usercontext.services.UserContextBoundedContext.Errors.UnexpectedUserContextError

/** Combines endpoints definitions with their actual logic */
class UserContextRoutes(boundedContext: UserContextBoundedContext, serverInterpreter: PlayServerInterpreter)(implicit
    auth: JwtAuthorization[StellaAuthContext],
    ec: ExecutionContext)
    extends RoutesResponseHelper {

  import UserContextRoutes.log

  lazy val userContextRoutes: Routes =
    putUserContextAsAdmin
      .orElse(modifyUserContextAsAdmin)
      .orElse(getUserContextAsAdmin)
      .orElse(deleteUserContextAsAdmin)
      .orElse(putUserContext)
      .orElse(modifyUserContext)
      .orElse(getUserContext)
      .orElse(deleteUserContext)

  lazy val putUserContextAsAdmin: Routes = {
    val endpoint = UserContextEndpoints.putUserContextAdminEndpoint.serverLogic { authContext =>
      { case (projectId, userId, userData) =>
        val adminId = getUserId(authContext)
        val userContextKey = UserContextKey(projectId, userId)
        (for {
          _ <- authContext.verifyUserHasAccessToProject(projectId)
          _ <- boundedContext
            .putUserContext(userContextKey, userData)
            .bimap(
              { case e: UnexpectedUserContextError =>
                handleUnexpectedError(
                  s"Couldn't put user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}",
                  e.underlying)
              },
              { _ =>
                log.trace(s"Put user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}")
              })
        } yield ()).value.transform(handleUnexpectedFutureError(
          s"Couldn't put user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val modifyUserContextAsAdmin: Routes = {
    val endpoint = UserContextEndpoints.modifyUserContextAdminEndpoint.serverLogic { authContext =>
      { case (projectId, userId, userDataDiff) =>
        val adminId = getUserId(authContext)
        val userContextKey = UserContextKey(projectId, userId)
        (for {
          _ <- authContext.verifyUserHasAccessToProject(projectId)
          _ <- boundedContext
            .modifyUserContext(userContextKey, userDataDiff)
            .bimap(
              { case e: UnexpectedUserContextError =>
                handleUnexpectedError(
                  s"Couldn't modify user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}",
                  e.underlying)
              },
              { _ =>
                log.trace(s"Modified user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}")
              })
        } yield ()).value.transform(handleUnexpectedFutureError(
          s"Couldn't modify user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getUserContextAsAdmin: Routes = {
    val endpoint = UserContextEndpoints.getUserContextAdminEndpoint.serverLogic { authContext =>
      { case (projectId, userId) =>
        val adminId = getUserId(authContext)
        val userContextKey = UserContextKey(projectId, userId)
        (for {
          _ <- authContext.verifyUserHasAccessToProject(projectId)
          response <- boundedContext
            .getUserContext(userContextKey)
            .bimap(
              { case e: UnexpectedUserContextError =>
                handleUnexpectedError(
                  s"Couldn't get user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}",
                  e.underlying)
              },
              { json =>
                log.trace(s"Fetched user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}")
                Response.asSuccess(json)
              })
        } yield response).value.transform(handleUnexpectedFutureError(
          s"Couldn't get user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val deleteUserContextAsAdmin: Routes = {
    val endpoint = UserContextEndpoints.deleteUserContextAdminEndpoint.serverLogic { authContext =>
      { case (projectId, userId) =>
        val adminId = getUserId(authContext)
        val userContextKey = UserContextKey(projectId, userId)
        (for {
          _ <- authContext.verifyUserHasAccessToProject(projectId)
          _ <- boundedContext
            .deleteUserContext(userContextKey)
            .bimap(
              { case e: UnexpectedUserContextError =>
                handleUnexpectedError(
                  s"Couldn't delete user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}",
                  e.underlying)
              },
              { _ =>
                log.trace(s"Deleted user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}")
              })
        } yield ()).value.transform(handleUnexpectedFutureError(
          s"Couldn't delete user context ${adminOperationLogDetailsSuffix(adminId, projectId, userId)}"))
      }
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val putUserContext: Routes = {
    val endpoint = UserContextEndpoints.putUserContextEndpoint.serverLogic { authContext => userData =>
      val projectId = getProjectId(authContext)
      val userId = getUserId(authContext)
      val userContextKey = UserContextKey(projectId, userId)
      boundedContext
        .putUserContext(userContextKey, userData)
        .bimap(
          { case e: UnexpectedUserContextError =>
            handleUnexpectedError(
              s"Couldn't put user context ${operationLogDetailsSuffix(projectId, userId)}",
              e.underlying)
          },
          { _ =>
            log.trace(s"Put user context ${operationLogDetailsSuffix(projectId, userId)}")
          })
        .value
        .transform(
          handleUnexpectedFutureError(s"Couldn't put user context ${operationLogDetailsSuffix(projectId, userId)}"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val modifyUserContext: Routes = {
    val endpoint = UserContextEndpoints.modifyUserContextEndpoint.serverLogic { authContext => userDataDiff =>
      val projectId = getProjectId(authContext)
      val userId = getUserId(authContext)
      val userContextKey = UserContextKey(projectId, userId)
      boundedContext
        .modifyUserContext(userContextKey, userDataDiff)
        .bimap(
          { case e: UnexpectedUserContextError =>
            handleUnexpectedError(
              s"Couldn't modify user context ${operationLogDetailsSuffix(projectId, userId)}",
              e.underlying)
          },
          { _ =>
            log.trace(s"Modified user context ${operationLogDetailsSuffix(projectId, userId)}")
          })
        .value
        .transform(
          handleUnexpectedFutureError(s"Couldn't modify user context ${operationLogDetailsSuffix(projectId, userId)}"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val getUserContext: Routes = {
    val endpoint = UserContextEndpoints.getUserContextEndpoint.serverLogic { authContext => _ =>
      val projectId = getProjectId(authContext)
      val userId = getUserId(authContext)
      val userContextKey = UserContextKey(projectId, userId)
      boundedContext
        .getUserContext(userContextKey)
        .bimap(
          { case e: UnexpectedUserContextError =>
            handleUnexpectedError(
              s"Couldn't get user context ${operationLogDetailsSuffix(projectId, userId)}",
              e.underlying)
          },
          { json =>
            log.trace(s"Fetched user context ${operationLogDetailsSuffix(projectId, userId)}")
            Response.asSuccess(json)
          })
        .value
        .transform(
          handleUnexpectedFutureError(s"Couldn't get user context ${operationLogDetailsSuffix(projectId, userId)}"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  lazy val deleteUserContext: Routes = {
    val endpoint = UserContextEndpoints.deleteUserContextEndpoint.serverLogic { authContext => _ =>
      val projectId = getProjectId(authContext)
      val userId = getUserId(authContext)
      val userContextKey = UserContextKey(projectId, userId)
      boundedContext
        .deleteUserContext(userContextKey)
        .bimap(
          { case e: UnexpectedUserContextError =>
            handleUnexpectedError(
              s"Couldn't delete user context ${operationLogDetailsSuffix(projectId, userId)}",
              e.underlying)
          },
          { _ =>
            log.trace(s"Deleted user context ${operationLogDetailsSuffix(projectId, userId)}")
          })
        .value
        .transform(
          handleUnexpectedFutureError(s"Couldn't delete user context ${operationLogDetailsSuffix(projectId, userId)}"))
    }
    serverInterpreter.toRoutes(endpoint)
  }

  private def getProjectId(authContext: StellaAuthContext): ProjectId = ProjectId(authContext.primaryProjectId)

  private def getUserId(authContext: StellaAuthContext): UserId = UserId(authContext.userId)

  protected def handleUnexpectedError(errorMessage: String, underlyingError: Option[Throwable]): ErrorOut = {
    underlyingError match {
      case Some(err) => log.error(errorMessage, err)
      case None      => log.error(errorMessage)
    }
    val response = errorCodeResponse(PresentationErrorCode.InternalError)
    StatusCode.InternalServerError -> response
  }

  private def adminOperationLogDetailsSuffix(adminId: UserId, projectId: ProjectId, userId: UserId): String =
    s"as admin $adminId ${operationLogDetailsSuffix(projectId, userId)}"

  private def operationLogDetailsSuffix(projectId: ProjectId, userId: UserId): String =
    s"for project $projectId and user $userId"
}

object UserContextRoutes {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
