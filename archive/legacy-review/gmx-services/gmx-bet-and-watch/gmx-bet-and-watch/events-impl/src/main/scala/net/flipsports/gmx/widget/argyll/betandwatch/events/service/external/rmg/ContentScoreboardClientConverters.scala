package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg

import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter

import net.flipsports.gmx.common.internal.partner.rmg.cons.RMGContentType
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.dto.Event

object ContentScoreboardClientConverters {

  private val timeFormat: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXX")

  def xmlToEvent(node: scala.xml.Node): Event = {
    Event(
      (node \@ "id").toLong,
      toContentType((node \@ "contentTypeId").toLong),
      toZonedDateTime(node \@ "startDateTime"),
      toZonedDateTime(node \@ "endDateTime"),
      (node \@ "description"),
      (node \@ "location"),
      (node \@ "chargeable").toBoolean,
      toStringList(node \@ "blockedCountryCodes")
    )
  }

  private def toContentType(id: Long) = RMGContentType.MAPPING.find(id)

  private def toZonedDateTime(timeStr: String) = ZonedDateTime.parse(timeStr, timeFormat)

  def toStringList(str: String): Array[String] = str.split(" ").filter(_.nonEmpty)

}