package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.dto

import java.time.ZonedDateTime

import net.flipsports.gmx.common.internal.partner.rmg.cons.RMGContentType

case class Event(id: Long, contentType: RMGContentType,
                 startTime: ZonedDateTime, endTime: ZonedDateTime,
                 description: String, location: String,
                 chargeable: Boolean, blockedCountryCode: Array[String]) {

  val availableFrom: ZonedDateTime = startTime.minusDays(1).withHour(20).withMinute(0)
}
