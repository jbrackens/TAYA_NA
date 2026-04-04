package phoenix.core

import java.time.{ LocalDate, LocalDateTime, LocalTime, ZoneId, ZoneOffset, ZonedDateTime }
import java.time.format.DateTimeFormatter

object TimeUtils {

  def toUTC(ldt: LocalDateTime): ZonedDateTime =
    toTimeZone(ldt, "UTC", 0)

  private def toTimeZone(ldt: LocalDateTime, zoneId: String, offsetHours: Int): ZonedDateTime =
    ZonedDateTime.ofLocal(ldt, ZoneId.of(zoneId), ZoneOffset.ofHours(offsetHours))
}

trait FromIsoDate[A] {
  def fromIsoDate(a: A): ZonedDateTime
}

object FromIsoDate {

  def apply[A](implicit sh: FromIsoDate[A]): FromIsoDate[A] = sh

  object ops {
    def fromIsoDate[A: FromIsoDate](a: A) = FromIsoDate[A].fromIsoDate(a)

    implicit class FromIsoDateOps[A: FromIsoDate](a: A) {
      def fromIsoDate = FromIsoDate[A].fromIsoDate(a)
    }
  }

  implicit val fromIsoDateString: FromIsoDate[String] =
    str => {
      val ld = LocalDate.parse(str, DateTimeFormatter.ISO_LOCAL_DATE)
      val ldt = LocalDateTime.of(ld, LocalTime.MIN)
      TimeUtils.toUTC(ldt)
    }
}

trait FromIsoDateTime[A] {
  def fromIsoDateTime(a: A): ZonedDateTime
}

object FromIsoDateTime {

  def apply[A](implicit sh: FromIsoDateTime[A]): FromIsoDateTime[A] = sh

  object ops {
    def fromIsoDateTime[A: FromIsoDateTime](a: A) = FromIsoDateTime[A].fromIsoDateTime(a)

    implicit class FromIsoDateTimeOps[A: FromIsoDateTime](a: A) {
      def fromIsoDateTime = FromIsoDateTime[A].fromIsoDateTime(a)
    }
  }

  implicit val fromIsoDateTimeString: FromIsoDateTime[String] =
    str => {
      val ldt = LocalDateTime.parse(str, DateTimeFormatter.ISO_LOCAL_DATE_TIME)
      TimeUtils.toUTC(ldt)
    }
}
