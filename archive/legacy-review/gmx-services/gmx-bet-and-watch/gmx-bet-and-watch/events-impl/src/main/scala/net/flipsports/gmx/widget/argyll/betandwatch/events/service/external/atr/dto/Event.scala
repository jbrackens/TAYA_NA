package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto

import java.time.ZonedDateTime

import net.flipsports.gmx.common.internal.partner.atr.cons.ATRContentType
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.EventType.EventType
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.LiveEventStatus.LiveEventStatus

case class Event(id: Long, eventNumber: Long, eventType: EventType, contentType: ATRContentType,
                 startTime: ZonedDateTime, endTime: ZonedDateTime,
                 description: String, location: String, locationCode: String, country: String,
                 liveEventStatus: LiveEventStatus, vod: Boolean, geoRule: GeoRule) {

  def isTest:Boolean = ATRContentType.TEST_EVENTS.equals(contentType)
}