package net.flipsports.gmx.widget.argyll.betandwatch.webgateway

import com.typesafe.scalalogging.LazyLogging
import javax.inject.Provider
import net.flipsports.gmx.common.internal.scala.core.exception.NotLoggedException
import net.flipsports.gmx.common.internal.scala.play.api.{ApiError, ErrorHandler}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception.ErrorCodes._
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception._
import play.api.mvc.Results.{Forbidden, NotFound, Unauthorized}
import play.api.mvc.{RequestHeader, Result}
import play.api.routing.Router
import play.api.{Configuration, Environment, OptionalSourceMapper, UsefulException}

class BusinessErrorHandler(env: Environment,
                           config: Configuration,
                           sourceMapper: OptionalSourceMapper,
                           router: Provider[Router])
  extends ErrorHandler(env, config, sourceMapper, router)
    with LazyLogging {

  override protected def logServerError(request: RequestHeader, usefulException: UsefulException): Unit =
    usefulException.cause match {
      case _: NotLoggedException => logger.info("Business error for ({}) [{}] CAUSE: {}", request.method, request.uri, usefulException.cause.getMessage)
      case _ => super.logServerError(request, usefulException)
    }

  override protected def handleError(request: RequestHeader, exception: UsefulException): Result =
    exception.cause match {
      case e: EventNotFoundException => NotFound(fault(ApiError(EVENT_NOT_FOUND, e.getMessage)))
      case e: StreamingNotAvailableException => NotFound(fault(ApiError(STREAMING_NOT_AVAILABLE, e.getMessage)))
      case e: InvalidUserCountryException => Forbidden(fault(ApiError(INVALID_USER_COUNTRY, e.getMessage)))
      case e: NoQualifyingBetException => Forbidden(fault(ApiError(NO_QUALIFYING_BET, e.getMessage)))
      case e: VideoNotAvailableException => NotFound(fault(ApiError(VIDEO_NOT_AVAILABLE, e.getMessage)))
      case e: UnauthorizedException => Unauthorized(fault(ApiError(UNAUTHORISED, e.getMessage)))
      case _ => super.handleError(request, exception)
    }
}
