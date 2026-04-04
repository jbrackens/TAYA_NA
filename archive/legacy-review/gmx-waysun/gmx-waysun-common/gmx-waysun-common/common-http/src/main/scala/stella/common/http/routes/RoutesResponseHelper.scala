package stella.common.http.routes

import scala.util.Failure
import scala.util.Success
import scala.util.Try

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import sttp.model.StatusCode

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.routes.TapirAuthDirectives.ErrorOut

trait RoutesResponseHelper {
  import RoutesResponseHelper.log

  protected def handleUnexpectedFutureError[T](errorMessage: => String)(
      futureResult: Try[Either[ErrorOut, T]]): Try[Either[ErrorOut, T]] =
    futureResult match {
      case _ @Success(_) => futureResult
      case Failure(e)    => Success(Left(handleUnexpectedError(errorMessage, e)))
    }

  protected def handleUnexpectedError(errorMessage: String, underlyingError: Throwable): ErrorOut = {
    log.error(errorMessage, underlyingError)
    val response = errorCodeResponse(PresentationErrorCode.InternalError)
    StatusCode.InternalServerError -> response
  }

  protected def errorCodeResponse(code: PresentationErrorCode): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(code))
}

object RoutesResponseHelper {
  private val log: Logger = LoggerFactory.getLogger(getClass)
}
