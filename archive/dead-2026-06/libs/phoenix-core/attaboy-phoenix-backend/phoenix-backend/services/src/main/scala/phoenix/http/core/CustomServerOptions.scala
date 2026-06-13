package phoenix.http.core
import sttp.model.Header
import sttp.model.StatusCode
import sttp.tapir._
import sttp.tapir.generic.auto._
import sttp.tapir.server.akkahttp.AkkaHttpServerOptions
import sttp.tapir.server.interceptor.ValuedEndpointOutput
import sttp.tapir.server.interceptor.decodefailure.DecodeFailureHandler
import sttp.tapir.server.interceptor.decodefailure.DefaultDecodeFailureHandler
import sttp.tapir.server.interceptor.decodefailure.DefaultDecodeFailureHandler.FailureMessages
import sttp.tapir.server.interceptor.decodefailure.DefaultDecodeFailureHandler.respond

import phoenix.core.error.ErrorDetails
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationError
import phoenix.core.error.PresentationErrorCode.RequestDecodingFailed
import phoenix.http.routes.HttpBody.jsonBody

object CustomServerOptions {
  val instance: AkkaHttpServerOptions =
    AkkaHttpServerOptions.customInterceptors.decodeFailureHandler(decodeFailureHandler).options

  private def decodeFailureHandler: DecodeFailureHandler =
    DefaultDecodeFailureHandler(
      respond(_, badRequestOnPathErrorIfPathShapeMatches = false, badRequestOnPathInvalidIfPathShapeMatches = true),
      FailureMessages.failureMessage,
      jsonErrorResponse)

  private def jsonErrorResponse
      : (StatusCode, List[Header], String) => ValuedEndpointOutput[(StatusCode, List[Header], ErrorResponse)] =
    (code, hs, message) => {
      ValuedEndpointOutput(
        statusCode.and(headers).and(jsonBody[ErrorResponse]),
        (code, hs, ErrorResponse.one(code, PresentationError(RequestDecodingFailed, Some(ErrorDetails(message))))))
    }
}
