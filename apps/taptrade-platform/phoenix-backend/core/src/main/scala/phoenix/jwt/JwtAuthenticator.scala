package phoenix.jwt

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.bifunctor._

import phoenix.http.BearerToken
import phoenix.jwt.JwtAuthenticator.JwtAuthenticationError

trait JwtAuthenticator {

  protected def introspectTokenOnProvider(bearerToken: BearerToken)(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthenticator.InactiveAuthTokenError.type, Unit]

  def verifyWithoutIntrospection(bearerToken: BearerToken)(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthenticator.InvalidAuthTokenError, Permissions]

  final def verifyWithIntrospection(bearerToken: BearerToken)(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthenticationError, Permissions] = {
    for {
      permissions <- verifyWithoutIntrospection(bearerToken)
      _ <- introspectTokenOnProvider(bearerToken).leftWiden[JwtAuthenticationError]
    } yield permissions
  }

  final def verify(bearerToken: BearerToken, withIntrospection: Boolean)(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthenticationError, Permissions] = {
    if (withIntrospection) {
      verifyWithIntrospection(bearerToken)
    } else {
      verifyWithoutIntrospection(bearerToken).leftWiden[JwtAuthenticationError]
    }
  }
}

object JwtAuthenticator {
  sealed trait JwtAuthenticationError

  final case class InvalidAuthTokenError(underlying: Throwable) extends JwtAuthenticationError
  case object InactiveAuthTokenError extends JwtAuthenticationError
}
