package phoenix.core

import java.time.format.DateTimeFormatter
import java.time._

object TimeUtils {

  private val utcZoneId: ZoneId = ZoneOffset.UTC

  implicit class StringOps(self: String) {
    def toUtcZonedDateTimeAtStartOfDay: ZonedDateTime = {
      val ld = LocalDate.parse(self, DateTimeFormatter.ISO_LOCAL_DATE)
      ZonedDateTime.of(ld.atStartOfDay(), utcZoneId)
    }

    def toUtcZonedDateTime: ZonedDateTime = {
      val ldt = LocalDateTime.parse(self, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
      ZonedDateTime.of(ldt, utcZoneId)
    }
  }
}
