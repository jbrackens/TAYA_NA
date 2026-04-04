package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr

import java.time.{LocalDateTime, ZoneId, ZoneOffset, ZonedDateTime}

import net.flipsports.gmx.common.internal.partner.atr.cons.ATRContentType
import net.flipsports.gmx.common.internal.scala.json.EnumerationConverters
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.BitrateLevel.BitrateLevel
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.EventType.EventType
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.GeoRuleType.GeoRuleType
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.LiveEventStatus.LiveEventStatus
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.MediaFormat.MediaFormat
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto._
import play.api.libs.functional.syntax.{unlift, _}
import play.api.libs.json._

import scala.util.matching.Regex

object SportMediastreamClientConverters {

  private val eventTypeConverter = Format(
    EnumerationConverters.enumReads(EventType),
    EnumerationConverters.enumWrites
  )

  private val liveEventStatusConverter = Format(
    EnumerationConverters.enumReads(LiveEventStatus),
    EnumerationConverters.enumWrites
  )

  private val geoRuleTypeConverter = Format(
    EnumerationConverters.enumReads(GeoRuleType),
    EnumerationConverters.enumWrites
  )

  private val bitrateLevelConverter = Format(
    EnumerationConverters.enumReads(BitrateLevel),
    EnumerationConverters.enumWrites
  )

  private val mediaFormatConverter = Format(
    EnumerationConverters.enumReads(MediaFormat),
    EnumerationConverters.enumWrites
  )

  private val timestampPattern: Regex = "/Date\\(([0-9]+)\\)/".r

  private def timestampFromDateString(timeStr: String): ZonedDateTime = {
    val timestampPattern(timestamp) = timeStr
    val seconds = timestamp.toLong / 1000
    LocalDateTime.ofEpochSecond(seconds, 0, ZoneOffset.UTC).atZone(ZoneId.of("UTC"))
  }

  private val dateConverter = Format(
    implicitly[Reads[String]].map(x => timestampFromDateString(x)),
    (_: ZonedDateTime) => ??? //intentionally not implemented - we do not use Writer
  )

  private val atrContentTypeConverter = Format(
    implicitly[Reads[Long]].map(x => toContentType(x)),
    (_: ATRContentType) => ???
  )

  private def toContentType(contentId: Long): ATRContentType = ATRContentType.MAPPING.find(contentId)

  implicit val geoRuleConverter: Format[GeoRule] = (
    (__ \ "RuleType").format[GeoRuleType](geoRuleTypeConverter) and
      (__ \ "Countries").format[Seq[String]]
    ) (GeoRule.apply, unlift(GeoRule.unapply))

  implicit val eventConverter: Format[Event] = (
    (__ \ "ID").format[Long] and
      (__ \ "EventNumber").format[Long] and
      (__ \ "EventType").format[EventType](eventTypeConverter) and
      (__ \ "ContentTypeID").format[ATRContentType](atrContentTypeConverter) and
      (__ \ "StartDateTime").format[ZonedDateTime](dateConverter) and
      (__ \ "EndDateTime").format[ZonedDateTime](dateConverter) and
      (__ \ "Description").format[String] and
      (__ \ "Location").format[String] and
      (__ \ "VenueCode").format[String] and
      (__ \ "Country").format[String] and
      (__ \ "LiveEventStatus").format[LiveEventStatus](liveEventStatusConverter) and
      (__ \ "VOD").format[Boolean] and
      (__ \ "GeoRule").format[GeoRule]
    ) (Event.apply, unlift(Event.unapply))

  implicit val videoStreamConverter: Format[VideoStream] = (
    (__ \ "StreamID").format[Long] and
      (__ \ "BitrateLevel").format[BitrateLevel](bitrateLevelConverter) and
      (__ \ "MediaFormat").format[MediaFormat](mediaFormatConverter) and
      (__ \ "Url").format[String]
    ) (VideoStream.apply, unlift(VideoStream.unapply))

}
