package phoenix.core

import java.time.{ ZoneOffset, ZonedDateTime }

import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike
import phoenix.core.TimeUtils._

class TimeUtilsSpec extends AnyWordSpecLike with Matchers {

  "FromIsoDateTime" should {

    "parse a String to a ZonedDateTime" in {
      val dateStr = "2020-08-20"
      val date = dateStr.toUtcZonedDateTimeAtStartOfDay

      date must be(ZonedDateTime.of(2020, 8, 20, 0, 0, 0, 0, ZoneOffset.UTC))
    }
  }

  "FromIsoDate" should {

    "parse a String to a ZonedDateTime" in {
      val dateTimeStr = "2020-08-19T22:15:00"
      val dateTime = dateTimeStr.toUtcZonedDateTime

      dateTime must be(ZonedDateTime.of(2020, 8, 19, 22, 15, 0, 0, ZoneOffset.UTC))
    }
  }

  "Json serialization/deserialization" should {
    import phoenix.core.JsonFormats.ZonedDateTimeFormat
    import spray.json._

    "serialize a ZonedDateTime to json" in {
      val dateTime = ZonedDateTime.of(2020, 10, 6, 12, 58, 0, 0, ZoneOffset.UTC)
      val json: JsValue = dateTime.toJson
      json must be(JsString("2020-10-06T12:58:00"))
    }

    "deserialize a json string to ZonedDateTime" in {
      val jsonDate: JsValue = JsString("2020-10-06T12:58:00")
      val dateTime = jsonDate.convertTo[ZonedDateTime]
      dateTime must be(ZonedDateTime.of(2020, 10, 6, 12, 58, 0, 0, ZoneOffset.UTC))
    }

    "throw deserializationError for invalid date types" in {
      val jsonDate: JsValue = JsString("2020-10-06")
      val thrown = the[spray.json.DeserializationException] thrownBy jsonDate.convertTo[ZonedDateTime]
      thrown.getMessage must include("'2020-10-06' is not a valid date value. Dates must be in ISO-8601 format")
    }
  }
}
