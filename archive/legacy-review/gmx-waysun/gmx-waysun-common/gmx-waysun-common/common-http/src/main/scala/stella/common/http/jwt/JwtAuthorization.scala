package stella.common.http.jwt

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import stella.common.http.BearerToken
import stella.common.http.jwt.JwtAuthorization.JwtAuthorizationError

trait JwtAuthorization[AC <: AuthContext] {

  def verify(token: BearerToken, requiredPermissions: Seq[Permission])(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthorizationError, AC]
}

object JwtAuthorization {
  sealed trait JwtAuthorizationError

  case object InactiveAuthTokenError extends JwtAuthorizationError

  final case class InvalidAuthTokenError(msg: String, cause: Option[Throwable] = None) extends JwtAuthorizationError

  object InvalidAuthTokenError {
    def apply(msg: String, cause: Throwable): InvalidAuthTokenError = InvalidAuthTokenError(msg, Some(cause))
  }

  final case class MissingPermissionsError(msg: String) extends JwtAuthorizationError

  final case class ServiceDiscoveryEndpointError(msg: String, cause: Option[Throwable] = None)
      extends JwtAuthorizationError

  object ServiceDiscoveryEndpointError {
    def apply(msg: String, cause: Throwable): ServiceDiscoveryEndpointError =
      ServiceDiscoveryEndpointError(msg, Some(cause))
  }

  final case class JwksLookupError(msg: String, cause: Option[Throwable] = None) extends JwtAuthorizationError

  object JwksLookupError {
    def apply(msg: String, cause: Throwable): JwksLookupError = JwksLookupError(msg, Some(cause))
  }
}
