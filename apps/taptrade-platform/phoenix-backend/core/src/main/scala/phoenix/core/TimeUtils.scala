package phoenix.core

import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.time.temporal.TemporalAdjusters

import scala.concurrent.duration.FiniteDuration

object TimeUtils {

  implicit class TimeUtilsLongOps(self: Long) {
    def toUtcOffsetDateTime: OffsetDateTime =
      OffsetDateTime.ofInstant(Instant.ofEpochMilli(self), ZoneOffset.UTC)
  }

  implicit class TimeUtilsStringOps(self: String) {
    def toLocalDate: LocalDate =
      LocalDate.parse(self, DateTimeFormatter.ISO_LOCAL_DATE)

    def toLocalDateTime: LocalDateTime =
      LocalDateTime.parse(self, DateTimeFormatter.ISO_LOCAL_DATE_TIME)

    def toUtcOffsetDateTime: OffsetDateTime = {
      val odt = OffsetDateTime.parse(self, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
      odt.withOffsetSameInstant(ZoneOffset.UTC)
    }

    def toUtcOffsetDateTimeFromLocalDateTimeFormat: OffsetDateTime =
      OffsetDateTime.of(toLocalDateTime, ZoneOffset.UTC)
  }

  implicit class TimeUtilsLocalDateOps(self: LocalDate) {
    def toUtcOffsetDateTimeAtStartOfDay: OffsetDateTime =
      OffsetDateTime.of(self.atStartOfDay(), ZoneOffset.UTC)

    def formatAsIsoLocalDate: String = self.format(DateTimeFormatter.ISO_LOCAL_DATE)
  }

  implicit class TimeUtilsLocalDateTimeOps(self: LocalDateTime) {
    def toUtcInstant: Instant =
      self.toInstant(ZoneOffset.UTC)

    def toUtcOffsetDateTime: OffsetDateTime =
      OffsetDateTime.of(self, ZoneOffset.UTC)
  }

  implicit class TimeUtilsOffsetDateTimeOps(self: OffsetDateTime) {
    def +(duration: FiniteDuration): OffsetDateTime = self.plusNanos(duration.toNanos)
    def -(duration: FiniteDuration): OffsetDateTime = self.minusNanos(duration.toNanos)

    def atBeginningOfDay(): OffsetDateTime = self.truncatedTo(ChronoUnit.DAYS)
    def atBeginningOfWeek(): OffsetDateTime =
      self.`with`(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atBeginningOfDay()
    def atBeginningOfMonth(): OffsetDateTime = self.withDayOfMonth(1).atBeginningOfDay()

    def toEpochMilli: Long = self.toInstant.toEpochMilli

    def toIsoLocalDateTimeString: String =
      self.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)

    def withTime(time: TimeOfADay): OffsetDateTime =
      self.`with`(time.value)
  }

  implicit class TimeUtilsInstantOps(self: Instant) {
    def toUtcOffsetDateTime: OffsetDateTime = self.atOffset(ZoneOffset.UTC)
  }

  final case class TimeOfADay(value: LocalTime)

  object TimeOfADay {
    def of(hour: Int, minute: Int): TimeOfADay = {
      TimeOfADay(LocalTime.of(hour, minute))
    }
  }

  final case class Date(value: LocalDate) {
    def noon(zoneId: ZoneId): OffsetDateTime = {
      val localDateTime = LocalDateTime.of(value, LocalTime.NOON)
      OffsetDateTime.of(localDateTime, zoneId.getRules.getOffset(localDateTime))
    }
  }
}
