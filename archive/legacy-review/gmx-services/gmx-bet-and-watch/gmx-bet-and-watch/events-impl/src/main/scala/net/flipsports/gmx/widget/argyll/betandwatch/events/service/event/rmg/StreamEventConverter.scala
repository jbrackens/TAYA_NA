package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.rmg

import java.time.{LocalDateTime, ZoneOffset}

import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingStatusType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingStatusType.StreamingStatusType
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.ProviderEvent
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.dto.Event

trait StreamEventConverter {

  def toStreamEvent(event: Event, provider: ProviderType, streamingModel: StreamingModelType)
                   (implicit currentTime: LocalDateTime): ProviderEvent = {
    ProviderEvent(
      provider = provider,
      id = event.id.toString,
      location = event.location,
      startTime = event.startTime,
      description = event.description,
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
      case x if x.availableFrom.isAfter(currentTimeUTC) => StreamingStatusType.UPCOMING
      case _ => StreamingStatusType.LIVE
    }
  }

  private def deniedCountries(event: Event): Seq[String] = event.blockedCountryCode
}
