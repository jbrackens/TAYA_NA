package net.flipsports.gmx.widget.argyll.betandwatch.events

import net.flipsports.gmx.widget.argyll.betandwatch.events.api.exception.{InvalidUserCountryException, NoQualifyingBetException, StreamingNotAvailableException, UnauthorizedException}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingStatusType.{INVALID_USER_COUNTRY, NO_QUALIFYING_BET, STREAMING_NOT_AVAILABLE, UNAUTHORISED}
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.User.UserEitherError
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.{EventStatus, User}
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{EventMapping, ProviderEvent}

import scala.util.Right

trait Helpers {
  def authorized(in: UserEitherError): User = in match {
    case Right(user) => user
    case Left(error) => throw new UnauthorizedException(error)
  }

  def stream(eventMapping: EventMapping): ProviderEvent = {
    eventMapping.stream.getOrElse(throwStreamingNotAvailable(eventMapping.event.id))
  }

  private def throwStreamingNotAvailable(sbtechId: Long): ProviderEvent = {
    throw new StreamingNotAvailableException(s"Not streaming available for event '$sbtechId'")
  }

  protected def handleError(mapping: EventMapping): PartialFunction[Throwable, EventStatus] = {
    case _: StreamingNotAvailableException => EventStatus(STREAMING_NOT_AVAILABLE, mapping.provider, mapping.streamingModel, mapping.event.countryCode, mapping.event.sportType)
    case _: InvalidUserCountryException => EventStatus(INVALID_USER_COUNTRY, mapping.provider, mapping.streamingModel, mapping.event.countryCode, mapping.event.sportType)
    case _: NoQualifyingBetException => EventStatus(NO_QUALIFYING_BET, mapping.provider, mapping.streamingModel, mapping.event.countryCode, mapping.event.sportType)
    case _: UnauthorizedException => EventStatus(UNAUTHORISED, mapping.provider, mapping.streamingModel, mapping.event.countryCode, mapping.event.sportType)
  }
}
