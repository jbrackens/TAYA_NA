package stella.common.http.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import spray.json.JsonFormat
import sttp.model.StatusCode
import sttp.tapir.Schema
import sttp.tapir.TapirAuth.bearer
import sttp.tapir.endpoint
import sttp.tapir.json.spray.jsonBody
import sttp.tapir.server.PartialServerEndpoint
import sttp.tapir.statusCode

import stella.common.http.BearerToken
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode.InactiveAuthToken
import stella.common.http.error.PresentationErrorCode.InvalidAuthToken
import stella.common.http.error.PresentationErrorCode.JwksError
import stella.common.http.error.PresentationErrorCode.MissingPermissions
import stella.common.http.error.PresentationErrorCode.OidcConfigLookupError
import stella.common.http.jwt.AuthContext
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.JwtAuthorization.InactiveAuthTokenError
import stella.common.http.jwt.JwtAuthorization.InvalidAuthTokenError
import stella.common.http.jwt.JwtAuthorization.JwksLookupError
import stella.common.http.jwt.JwtAuthorization.JwtAuthorizationError
import stella.common.http.jwt.JwtAuthorization.MissingPermissionsError
import stella.common.http.jwt.JwtAuthorization.ServiceDiscoveryEndpointError
import stella.common.http.jwt.Permission

object TapirAuthDirectives {
  type ErrorOut = (StatusCode, Response[ErrorOutput])

  private val log: Logger = LoggerFactory.getLogger(getClass)

  /**
   * Allows to verify JWT and the permissions, which it contains, before executing the actual endpoint's logic.
   * If requiredPermissions is specified, JWT needs to contain at least one of these permissions.
   * Otherwise user is not allowed to perform an operation.
   */
  def endpointWithJwtValidation[AC <: AuthContext](requiredPermissions: Permission*)(implicit
      auth: JwtAuthorization[AC],
      ec: ExecutionContext,
      errorOutputResponseFormat: JsonFormat[Response[ErrorOutput]],
      errorOutputResponseSchema: Schema[Response[ErrorOutput]])
      : PartialServerEndpoint[String, AC, Unit, (StatusCode, Response[ErrorOutput]), Unit, Any, Future] =
    endpoint
      .securityIn(bearer[String]())
      .errorOut(statusCode)
      .errorOut(jsonBody[Response[ErrorOutput]])
      .serverSecurityLogic { jwt =>
        auth
          .verify(BearerToken(jwt), requiredPermissions)
          .leftMap { e =>
            logError(requiredPermissions, jwt, e)
            toErrorOut(e)
          }
          .value
      }

  private def logError[AC <: AuthContext](
      requiredPermissions: Seq[Permission],
      jwt: String,
      error: JwtAuthorizationError): Unit =
    error match {
      case _: JwksLookupError | _: ServiceDiscoveryEndpointError =>
        log.error(s"Internal error when processing token $jwt with required permissions $requiredPermissions: $error")
      case _ =>
        log.debug(
          s"Authorization error when processing token $jwt with required permissions $requiredPermissions: $error")
    }

  private def toErrorOut(error: JwtAuthorizationError): ErrorOut =
    error match {
      case InactiveAuthTokenError =>
        StatusCode.Unauthorized -> Response.asFailure(ErrorOutput.one(InactiveAuthToken))
      case _: InvalidAuthTokenError =>
        StatusCode.Unauthorized -> Response.asFailure(ErrorOutput.one(InvalidAuthToken))
      case _: MissingPermissionsError =>
        StatusCode.Forbidden -> Response.asFailure(ErrorOutput.one(MissingPermissions))
      case _: JwksLookupError =>
        StatusCode.InternalServerError -> Response.asFailure(ErrorOutput.one(JwksError))
      case _: ServiceDiscoveryEndpointError =>
        StatusCode.InternalServerError -> Response.asFailure(ErrorOutput.one(OidcConfigLookupError))
    }
}
