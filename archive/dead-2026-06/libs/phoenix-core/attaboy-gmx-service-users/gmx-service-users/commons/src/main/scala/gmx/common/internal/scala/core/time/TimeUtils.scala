package gmx.common.internal.scala.core.time

import java.time.{ Duration, Instant, ZoneOffset, ZonedDateTime }
import java.util.TimeZone

import com.ibm.icu.util.{ TimeZone => IcuTimeZone }

object TimeUtils {

  def fromEpochMilli(in: Long): ZonedDateTime =
    Instant.ofEpochMilli(in).atZone(ZoneOffset.UTC)

  def toEpochMilli(in: ZonedDateTime): Long =
    in.toInstant.toEpochMilli

  def getCurrentTime: ZonedDateTime = ZonedDateTime.now(ZoneOffset.UTC)

  def calculateOffset(
      dateUTC: ZonedDateTime,
      countryCode: String
    ): Int = {
    //TODO handle countries with multiple timezones | https://flipsports.atlassian.net/browse/GMV3-330
    val timeZones: Array[String]   = IcuTimeZone.getAvailableIDs(countryCode)
    val timeZone: Option[TimeZone] = timeZones.headOption.map(TimeZone.getTimeZone)

    val result: Long = timeZone
      .map(zone => dateUTC.withZoneSameLocal(zone.toZoneId))
      .map(dateAdjusted => Duration.between(dateAdjusted, dateUTC).toHours)
      .getOrElse(0)

    result.toInt
  }
}
