package phoenix.payments.infrastructure.http

import scala.concurrent.Future

import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.model.UsernamePassword
import sttp.tapir.server.PartialServerEndpoint

import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.TapirAuthDirectives.PresentationErrors.unauthorized
import phoenix.payments.infrastructure.WebhookCredentials
import phoenix.payments.infrastructure.http.ErrorMessageXmlFormats._
import phoenix.payments.infrastructure.http.TapirXMLAdapter._

private[http] object PxpRoutesAuthenticator extends TapirCodecEnumeratum {

  def basicAuth(credentials: WebhookCredentials)
      : PartialServerEndpoint[UsernamePassword, Unit, Unit, (StatusCode, ErrorResponse), Unit, Any, Future] = {
    val expectedUsernamePassword = convert(credentials)

    endpoint
      .securityIn(auth.basic[UsernamePassword]())
      .errorOut(statusCode)
      .errorOut(xmlBody[ErrorResponse])
      .serverSecurityLogic { usernamePassword =>
        val authorizationResult =
          Either.cond(
            usernamePassword == expectedUsernamePassword,
            (),
            unauthorized(PresentationErrorCode.UnauthorizedRequest))
        Future.successful(authorizationResult)
      }
  }

  private def convert(credentials: WebhookCredentials): UsernamePassword =
    UsernamePassword(credentials.username.value, Some(credentials.password.value))
}
