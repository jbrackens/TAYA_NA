package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.dto

import java.time.ZonedDateTime

case class Event(streamId: String,
                 startDateUtc: ZonedDateTime, endDateUtc: ZonedDateTime,
                 title: Option[String], sportId: String, sportName: String, competition: String,
                 country: String, blockedCountryCode: Array[String]) {

  def containsDate(toCheck: ZonedDateTime): Boolean = {
    startDateUtc.isBefore(toCheck) && endDateUtc.isAfter(toCheck)
  }
}