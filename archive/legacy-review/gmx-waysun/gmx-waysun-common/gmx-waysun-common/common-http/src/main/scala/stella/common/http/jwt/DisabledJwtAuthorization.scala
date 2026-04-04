package stella.common.http.jwt

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import stella.common.http.BearerToken
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

/** Authorization strategy which doesn't verify JWT and gives all permissions but doesn't specify extra authContext */
class DisabledJwtAuthorization(
    val dummyUserId: UserId = UserId.random(),
    val dummyProjectId: ProjectId = ProjectId.random())
    extends JwtAuthorization[StellaAuthContext] {

  override def verify(token: BearerToken, requiredPermissions: Seq[Permission])(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthorization.JwtAuthorizationError, StellaAuthContext] =
    EitherT.fromEither(
      Right(
        StellaAuthContext(
          FullyPermissivePermissions,
          userId = dummyUserId,
          primaryProjectId = dummyProjectId,
          additionalProjectIds = Set.empty)))
}
