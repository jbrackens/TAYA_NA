package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis

import java.time.format.DateTimeFormatter
import java.time.{LocalDateTime, ZoneId, ZonedDateTime}

import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.dto._
import play.api.libs.json._

object SISStreamClientConverters {

  private val timeFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")

  private def timestampFromDateString(timeStr: String): ZonedDateTime = {
    LocalDateTime.parse(timeStr, timeFormat).atZone(ZoneId.of("UTC"))
  }

  implicit val dateTimeFormat: Format[ZonedDateTime] = Format(
    implicitly[Reads[String]].map(x => timestampFromDateString(x)),
    (_: ZonedDateTime) => ??? //intentionally not implemented - we do not use Writer
  )

  implicit val eventConverter: Format[Event] = Json.format[Event]

  implicit val videoStreamConverter: Format[VideoStream] = Json.format[VideoStream]

}