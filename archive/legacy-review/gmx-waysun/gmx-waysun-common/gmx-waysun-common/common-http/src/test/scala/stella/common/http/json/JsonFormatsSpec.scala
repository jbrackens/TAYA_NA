package stella.common.http.json

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

import org.scalatest.matchers.should
import org.scalatest.wordspec.AnyWordSpec
import spray.json.DeserializationException
import spray.json.JsBoolean
import spray.json.JsString

import stella.common.http.json.JsonFormats.offsetDateTimeFormat
import stella.common.http.json.JsonFormats.uuidFormat

class JsonFormatsSpec extends AnyWordSpec with should.Matchers {

  "offsetDateTimeFormat" should {
    "fail when decoding other value than String" in {
      val unexpectedJson = JsBoolean(false)
      the[DeserializationException] thrownBy {
        offsetDateTimeFormat.read(unexpectedJson)
      } should have message s"Expected String when deserializing date time but found $unexpectedJson"
    }

    "fail when decoding incorrect String" in {
      val incorrectValue = "incorrect-value"
      the[DeserializationException] thrownBy {
        offsetDateTimeFormat.read(JsString(incorrectValue))
      } should have message "Specified date time is not correct ISO-8601 date time"
    }

    "succeed when decoding correct String with UTC zone" in {
      val dateTime = OffsetDateTime.of(2021, 8, 9, 10, 11, 12, 13, ZoneOffset.UTC)
      val res = offsetDateTimeFormat.read(JsString("2021-08-09T10:11:12.000000013Z"))
      res shouldBe dateTime
    }

    "succeed when decoding correct String with zone different than UTC" in {
      val dateTime = OffsetDateTime.of(2021, 8, 9, 10, 11, 12, 18000, ZoneOffset.ofHours(1))
      val res = offsetDateTimeFormat.read(JsString("2021-08-09T10:11:12.000018+01:00"))
      res shouldBe dateTime
    }

    "encode properly" in {
      val dateTime = OffsetDateTime.of(2021, 8, 9, 10, 11, 12, 180002, ZoneOffset.ofHours(1))
      val res = offsetDateTimeFormat.write(dateTime)
      res shouldBe JsString("2021-08-09T10:11:12.000180002+01:00")
    }
  }

  "uuidFormat" should {
    "fail when decoding other value than String" in {
      val unexpectedJson = JsBoolean(false)
      the[DeserializationException] thrownBy {
        uuidFormat.read(unexpectedJson)
      } should have message s"Expected String when deserializing UUID but found $unexpectedJson"
    }

    "fail when decoding incorrect uuid String" in {
      val incorrectValue = "incorrect-value"
      the[DeserializationException] thrownBy {
        uuidFormat.read(JsString(incorrectValue))
      } should have message "Specified String is not correct UUID"
    }

    "succeed when decoding proper uuid" in {
      val uuid = UUID.randomUUID()
      val res = uuidFormat.read(JsString(uuid.toString))
      res shouldBe uuid
    }

    "encode properly" in {
      val uuid = UUID.randomUUID()
      val res = uuidFormat.write(uuid)
      res shouldBe JsString(uuid.toString)
    }
  }
}
