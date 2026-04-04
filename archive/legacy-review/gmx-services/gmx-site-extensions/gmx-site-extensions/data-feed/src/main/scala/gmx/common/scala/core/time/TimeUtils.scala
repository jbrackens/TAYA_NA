package gmx.common.scala.core.time

import java.time._
import java.time.format.DateTimeFormatter

/**
 * Port from Phoenix project (https://github.com/flipadmin/phoenix-backend/) should be extracted to lib
 */
object TimeUtils {

  implicit class TimeUtilsLongOps(self: Long) {
    def toInstant: Instant =
      Instant.ofEpochMilli(self)

    def toUtcOffsetDateTime: OffsetDateTime =
      OffsetDateTime.ofInstant(self.toInstant, ZoneOffset.UTC)
  }

  implicit class TimeUtilsInstantOps(self: Instant) {
    def toUtcOffsetDateTime: OffsetDateTime =
      OffsetDateTime.ofInstant(self, ZoneOffset.UTC)
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
  }

  implicit class TimeUtilsLocalDateOps(self: LocalDate) {
    def toUtcOffsetDateTimeAtStartOfDay: OffsetDateTime =
      OffsetDateTime.of(self.atStartOfDay(), ZoneOffset.UTC)
  }

  implicit class TimeUtilsLocalDateTimeOps(self: LocalDateTime) {
    def toUtcOffsetDateTime: OffsetDateTime =
      OffsetDateTime.of(self, ZoneOffset.UTC)
  }

  implicit class TimeUtilsOffsetDateTimeOps(self: OffsetDateTime) {
    def toIsoString: String =
      self.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
  }
}
