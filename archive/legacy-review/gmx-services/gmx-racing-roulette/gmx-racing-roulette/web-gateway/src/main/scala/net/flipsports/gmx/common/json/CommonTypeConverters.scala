package net.flipsports.gmx.common.json

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

import play.api.libs.json.Reads.DefaultZonedDateTimeReads
import play.api.libs.json.Writes.temporalWrites
import play.api.libs.json.{Format, Writes}

object CommonTypeConverters {

  implicit lazy val DefaultZonedDateTimeWrites: Writes[ZonedDateTime] =
    temporalWrites[ZonedDateTime, DateTimeFormatter](
      DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mmxxx")
    )

  implicit lazy val DefaultZonedDateTimeFormat: Format[ZonedDateTime] =
    Format(DefaultZonedDateTimeReads, DefaultZonedDateTimeWrites)

}