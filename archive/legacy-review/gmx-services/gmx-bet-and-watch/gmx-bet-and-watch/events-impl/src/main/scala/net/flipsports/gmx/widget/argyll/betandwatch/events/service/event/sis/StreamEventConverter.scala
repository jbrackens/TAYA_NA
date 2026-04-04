package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sis

import java.time.{LocalDateTime, ZoneOffset}

import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingStatusType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingStatusType.StreamingStatusType
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.{NOT_AVAILABLE, ProviderEvent}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.dto.Event

trait StreamEventConverter {

  def toStreamEvent(event: Event, provider: ProviderType, streamingModel: StreamingModelType)
                   (implicit currentTime: LocalDateTime): ProviderEvent = {
    ProviderEvent(
      provider = provider,
      id = event.streamId,
      location = event.competition,
      startTime = event.startDateUtc,
      description = event.title.getOrElse(NOT_AVAILABLE),
      testData = false,
      streamingStatus = status(event),
      streamingModel = streamingModel,
      allowedCountries = Seq(),
      deniedCountries = deniedCountries(event)
    )
  }

  private def status(event: Event)(implicit currentTime: LocalDateTime): StreamingStatusType = {
    val currentTimeUTC = currentTime.atZone(ZoneOffset.UTC)
    event match {
      case x if x.startDateUtc.isAfter(currentTimeUTC) => StreamingStatusType.UPCOMING
      case x if !x.startDateUtc.isAfter(currentTimeUTC) && x.endDateUtc.isAfter(currentTimeUTC) => StreamingStatusType.LIVE
      case x if !x.endDateUtc.isAfter(currentTimeUTC) => StreamingStatusType.FINISHED
      case _ => StreamingStatusType.VOD
    }
  }

  private def deniedCountries(event: Event): Seq[String] = event.blockedCountryCode
}
