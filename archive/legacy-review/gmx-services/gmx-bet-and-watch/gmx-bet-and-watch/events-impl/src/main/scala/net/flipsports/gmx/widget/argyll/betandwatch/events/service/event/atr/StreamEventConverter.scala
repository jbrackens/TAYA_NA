package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.atr

import net.flipsports.gmx.common.internal.partner.commons.cons.StreamingModelType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.ProviderType.ProviderType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingStatusType
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.model.StreamingStatusType.StreamingStatusType
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.ProviderEvent
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.LiveEventStatus.{Available, Finished, NotYetAvailable}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.{Event, GeoRuleType}

trait StreamEventConverter {

  def toStreamEvent(event: Event, provider: ProviderType, streamingModel: StreamingModelType): ProviderEvent = {
    ProviderEvent(
      provider = provider,
      id = event.id.toString,
      location = event.location,
      startTime = event.startTime,
      description = event.description,
      testData = event.isTest,
      streamingStatus = status(event),
      streamingModel = streamingModel,
      allowedCountries = allowedCountries(event),
      deniedCountries = deniedCountries(event)
    )
  }

  private def status(event: Event): StreamingStatusType = {
    (event.liveEventStatus, event.vod) match {
      case (NotYetAvailable, _) => StreamingStatusType.UPCOMING
      case (Available, _) => StreamingStatusType.LIVE
      case (Finished, false) => StreamingStatusType.FINISHED
      case (Finished, true) => StreamingStatusType.VOD
    }
  }

  private def allowedCountries(event: Event): Seq[String] =
    if (event.geoRule.ruleType == GeoRuleType.Allow) {
      event.geoRule.countries
    } else {
      Seq()
    }

  private def deniedCountries(event: Event): Seq[String] =
    if (event.geoRule.ruleType == GeoRuleType.Deny) {
      event.geoRule.countries
    } else {
      Seq()
    }
}
