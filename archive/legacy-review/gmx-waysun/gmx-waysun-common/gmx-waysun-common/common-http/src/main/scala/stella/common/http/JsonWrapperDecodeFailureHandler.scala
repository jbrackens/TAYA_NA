package stella.common.http

import spray.json.JsonFormat
import sttp.model.Header
import sttp.model.StatusCode
import sttp.tapir.DecodeResult.Error
import sttp.tapir.DecodeResult.Error.JsonDecodeException
import sttp.tapir.Schema
import sttp.tapir.headers
import sttp.tapir.json.spray.jsonBody
import sttp.tapir.server.interceptor.DecodeFailureContext
import sttp.tapir.server.interceptor.decodefailure.DefaultDecodeFailureHandler
import sttp.tapir.server.interceptor.decodefailure.DefaultDecodeFailureHandler.FailureMessages
import sttp.tapir.server.model.ValuedEndpointOutput
import sttp.tapir.statusCode

import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode

class JsonWrapperDecodeFailureHandler(implicit
    errorOutputResponseFormat: JsonFormat[Response[ErrorOutput]],
    errorOutputResponseSchema: Schema[Response[ErrorOutput]])
    extends DefaultDecodeFailureHandler(
      DefaultDecodeFailureHandler
        .respond(_, badRequestOnPathErrorIfPathShapeMatches = false, badRequestOnPathInvalidIfPathShapeMatches = true),
      JsonWrapperDecodeFailureHandler.failureMessage,
      (oldStatusCode: StatusCode, oldHeaders: List[Header], oldMessage: String) => {
        val errorCode = JsonWrapperDecodeFailureHandler.errorCodeForStatus(oldStatusCode)
        val errorOutput = Response.asFailure(ErrorOutput.one(errorCode, oldMessage))
        ValuedEndpointOutput(
          statusCode.and(headers).and(jsonBody[Response[ErrorOutput]]),
          (oldStatusCode, oldHeaders, errorOutput))
      })

object JsonWrapperDecodeFailureHandler {
  def errorCodeForStatus(status: StatusCode): PresentationErrorCode = status match {
    case StatusCode.BadRequest          => PresentationErrorCode.BadRequest
    case StatusCode.Unauthorized        => PresentationErrorCode.Unauthorized
    case StatusCode.Forbidden           => PresentationErrorCode.Forbidden
    case StatusCode.InternalServerError => PresentationErrorCode.InternalError
    case _                              => PresentationErrorCode.OtherError
  }

  def failureMessage(failureContext: DecodeFailureContext): String = {
    val base = FailureMessages.failureSourceMessage(failureContext.failingInput)
    val detail = FailureMessages.failureDetailMessage(failureContext.failure)
    // this method is based on FailureMessages.failureMessage but with this one improvement
    // to bring back a behaviour from the old Tapir version that we rely on in many places
    val improvedDetails = detail.orElse {
      failureContext.failure match {
        case Error(_, ex: JsonDecodeException) if ex.errors.isEmpty && !ex.getMessage.isBlank => Some(ex.getMessage)
        case _                                                                                => None
      }
    }
    FailureMessages.combineSourceAndDetail(base, improvedDetails)
  }
}
