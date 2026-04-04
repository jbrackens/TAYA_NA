package phoenix.core

import java.time._
import java.time.format.DateTimeFormatter

import cats.data.NonEmptyList
import phoenix.core.TimeUtils._
import spray.json.DefaultJsonProtocol.StringJsonFormat
import spray.json._

object JsonFormats {

  implicit object ZonedDateTimeFormat extends RootJsonFormat[ZonedDateTime] {

    private val formatter = DateTimeFormatter.ISO_LOCAL_DATE_TIME.withZone(ZoneId.of("GMT"))

    def write(obj: ZonedDateTime): JsValue = {
      JsString(formatter.format(obj))
    }

    def read(json: JsValue): ZonedDateTime =
      json match {
        case JsString(s) =>
          try {
            s.toUtcZonedDateTime
          } catch {
            case _: Throwable => error(s)
          }
        case _ =>
          error(json.toString())
      }

    def error(value: Any): ZonedDateTime = {
      val example = formatter.format(ZonedDateTime.of(2012, 1, 1, 12, 34, 56, 789, ZoneId.of("UTC")))
      deserializationError(s"'$value' is not a valid date value. Dates must be in ISO-8601 format, e.g. '$example'")
    }
  }

  implicit val offsetDateTimeFormat: RootJsonFormat[OffsetDateTime] =
    new RootJsonFormat[OffsetDateTime] {
      override def write(dateTime: OffsetDateTime): JsValue = ZonedDateTimeFormat.write(dateTime.toZonedDateTime)

      override def read(json: JsValue): OffsetDateTime = ZonedDateTimeFormat.read(json).toOffsetDateTime
    }

  implicit val instantFormat: RootJsonFormat[Instant] = new RootJsonFormat[Instant] {
    override def write(obj: Instant): JsValue = JsString(DateTimeFormatter.ISO_INSTANT.format(obj))
    override def read(json: JsValue): Instant =
      Instant.from(DateTimeFormatter.ISO_INSTANT.parse(json.convertTo[String]))
  }

  implicit def nonEmptyListFormat[T](implicit listEvidence: RootJsonFormat[List[T]]): RootJsonFormat[NonEmptyList[T]] =
    new RootJsonFormat[NonEmptyList[T]] {
      override def read(json: JsValue): NonEmptyList[T] = NonEmptyList.fromListUnsafe(json.convertTo[List[T]])

      override def write(nel: NonEmptyList[T]): JsValue = listEvidence.write(nel.toList)
    }

  implicit val unitWriter: RootJsonWriter[Unit] = new RootJsonWriter[Unit] {
    override def write(obj: Unit): JsValue = JsObject()
  }
}
