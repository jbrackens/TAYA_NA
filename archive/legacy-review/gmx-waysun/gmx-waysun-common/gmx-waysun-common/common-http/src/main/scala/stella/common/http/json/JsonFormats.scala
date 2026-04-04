package stella.common.http.json

import java.time.OffsetDateTime
import java.time.format.DateTimeParseException
import java.util.UUID

import cats.data.NonEmptyList
import spray.json.JsString
import spray.json.JsValue
import spray.json.RootJsonFormat
import spray.json.deserializationError

trait JsonFormats {
  implicit def nonEmptyListFormat[T](implicit listEvidence: RootJsonFormat[List[T]]): RootJsonFormat[NonEmptyList[T]] =
    new RootJsonFormat[NonEmptyList[T]] {
      override def read(json: JsValue): NonEmptyList[T] = NonEmptyList.fromListUnsafe(json.convertTo[List[T]])

      override def write(nel: NonEmptyList[T]): JsValue = listEvidence.write(nel.toList)
    }

  implicit val offsetDateTimeFormat: RootJsonFormat[OffsetDateTime] = new RootJsonFormat[OffsetDateTime] {
    override def read(json: JsValue): OffsetDateTime = json match {
      case JsString(dateTimeString) =>
        try {
          OffsetDateTime.parse(dateTimeString)
        } catch {
          case e: DateTimeParseException =>
            deserializationError("Specified date time is not correct ISO-8601 date time", e)
        }
      case _ => deserializationError(s"Expected String when deserializing date time but found $json")
    }

    override def write(obj: OffsetDateTime): JsValue = JsString(obj.toString)
  }

  implicit val uuidFormat: RootJsonFormat[UUID] = new RootJsonFormat[UUID] {
    override def read(value: JsValue): UUID = value match {
      case JsString(str) =>
        try {
          UUID.fromString(str)
        } catch {
          case e: IllegalArgumentException => deserializationError("Specified String is not correct UUID", e)
        }
      case _ => deserializationError(s"Expected String when deserializing UUID but found $value")
    }

    override def write(x: UUID): JsValue = JsString(x.toString)
  }
}
object JsonFormats extends JsonFormats
