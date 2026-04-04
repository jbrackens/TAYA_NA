package eeg.waysun.events.aggregation.functions

import net.flipsports.gmx.streaming.common.conversion.DateFormats.zone

import java.time.temporal.ChronoField
import java.time.{Instant, OffsetDateTime, ZoneOffset}

case class DetailedDateTime(dateTime: Long) extends Serializable {
  val event = Instant.ofEpochMilli(dateTime).atZone(zone)

  val year = event.get(ChronoField.YEAR)

  val month = event.get(ChronoField.MONTH_OF_YEAR)

  val day = event.get(ChronoField.DAY_OF_MONTH)

  val hour = event.get(ChronoField.HOUR_OF_DAY)

  val minute = event.get(ChronoField.MINUTE_OF_HOUR)

  val seconds = event.get(ChronoField.SECOND_OF_MINUTE)

  def asOffsetDateTime: OffsetDateTime =
    OffsetDateTime.of(year, month, day, hour, minute, seconds, 0, ZoneOffset.UTC)

}
