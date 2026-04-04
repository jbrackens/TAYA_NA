package net.flipsports.gmx.widget.argyll.betandwatch.webgateway

import akka.stream.Materializer
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception._
import net.flipsports.gmx.widget.argyll.betandwatch.webgateway.toggles.Toggles
import play.api.mvc.{Filter, RequestHeader, Result}

import scala.concurrent.Future

class ErrorSimulatorFilter(implicit val mat: Materializer) extends Filter {

  val msg: String = "ERROR simulated by request headers"

  def apply(next: (RequestHeader) => Future[Result])(request: RequestHeader): Future[Result] = {
    if (Toggles.SIMULATE_EXCEPTIONS.isActive) {
      request.headers
        .get("x-flip-simulate-exception")
        .map(simulate)
    }

    next(request)
  }

  private def simulate(exceptionName: String) = {
    exceptionName match {
      case ErrorCodes.EVENT_NOT_FOUND => throw new EventNotFoundException(msg)
      case ErrorCodes.STREAMING_NOT_AVAILABLE => throw new StreamingNotAvailableException(msg)
      case ErrorCodes.INVALID_USER_COUNTRY => throw new InvalidUserCountryException(msg)
      case ErrorCodes.NO_QUALIFYING_BET => throw new NoQualifyingBetException(msg)
      case ErrorCodes.VIDEO_NOT_AVAILABLE => throw new VideoNotAvailableException(msg)
      case _ => //NO-OP
    }
  }
}
