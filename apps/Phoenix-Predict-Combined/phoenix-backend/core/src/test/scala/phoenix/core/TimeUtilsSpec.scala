package phoenix.core
import java.time.OffsetDateTime
import java.time.ZoneOffset

import io.circe.syntax._
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.TimeUtils._

class TimeUtilsSpec extends AnyWordSpecLike with Matchers {

  "toLocalDate and toUtcOffsetDateTimeAtStartOfDay" should {

    "parse a local date String to a OffsetDateTime" in {
      val dateStr = "2020-08-20"
      val date = dateStr.toLocalDate.toUtcOffsetDateTimeAtStartOfDay

      date must be(OffsetDateTime.of(2020, 8, 20, 0, 0, 0, 0, ZoneOffset.UTC))
    }
  }

  "toUtcOffsetDateTime" should {
    "parse a zoned date time String to a OffsetDateTime" in {
      val dateTimeStr = "2020-08-19T22:15:00+01:00"
      val dateTime = dateTimeStr.toUtcOffsetDateTime

      dateTime must be(OffsetDateTime.of(2020, 8, 19, 21, 15, 0, 0, ZoneOffset.UTC))
    }
  }

  "Json serialization/deserialization" should {
    import io.circe._

    import phoenix.core.JsonFormats.offsetDateTimeCodec

    "serialize a OffsetDateTime to json" in {
      val dateTime = OffsetDateTime.of(2020, 10, 6, 12, 58, 0, 0, ZoneOffset.UTC)
      val json = dateTime.asJson
      json must be(Json.fromString("2020-10-06T12:58:00Z"))
    }

    "deserialize a json string to OffsetDateTime" in {
      val jsonDate = Json.fromString("2020-10-06T12:58:00Z")
      val dateTime = jsonDate.as[OffsetDateTime]
      dateTime must be(Right(OffsetDateTime.of(2020, 10, 6, 12, 58, 0, 0, ZoneOffset.UTC)))
    }

    "return error for invalid date types" in {
      val jsonDate = Json.fromString("2020-10-06")
      jsonDate.as[OffsetDateTime] must matchPattern {
        case Left(_) =>
      }
    }
  }
}
