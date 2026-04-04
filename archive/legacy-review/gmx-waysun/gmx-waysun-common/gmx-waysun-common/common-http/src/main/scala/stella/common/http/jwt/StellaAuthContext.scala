package stella.common.http.jwt

import scala.concurrent.Future

import cats.data.EitherT
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import sttp.model.StatusCode

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.routes.TapirAuthDirectives.ErrorOut
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

final case class StellaAuthContext(
    permissions: Permissions,
    userId: UserId, // aka sub
    primaryProjectId: ProjectId,
    additionalProjectIds: Set[ProjectId])
    extends AuthContext {
  import StellaAuthContext.log

  def verifyUserHasAccessToProject(projectId: ProjectId): EitherT[Future, ErrorOut, Unit] =
    if (projectId == primaryProjectId || additionalProjectIds.contains(projectId))
      EitherT[Future, ErrorOut, Unit](Future.successful(Right(())))
    else {
      log.error(s"User does not have access to project $projectId")
      val response = Response.asFailure(ErrorOutput.one(PresentationErrorCode.Forbidden))
      EitherT[Future, ErrorOut, Unit](Future.successful(Left(StatusCode.Forbidden -> response)))
    }
}

object StellaAuthContext {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
