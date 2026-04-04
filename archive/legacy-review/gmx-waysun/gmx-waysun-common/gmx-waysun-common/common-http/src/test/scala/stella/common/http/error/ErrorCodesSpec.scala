package stella.common.http.error

import cats.data.NonEmptyList
import org.scalatest.matchers.should
import org.scalatest.wordspec.AnyWordSpec
import spray.json.DeserializationException
import spray.json.JsArray
import spray.json.JsBoolean
import spray.json.JsObject
import spray.json.JsString

import stella.common.http.Response

class ErrorCodesSpec extends AnyWordSpec with should.Matchers {

  private object TestPresentationErrorCode extends PresentationErrorCode {
    override def value: String = "foo"
  }

  private val detailsField = "details"
  private val errorCodesField = "errorCodes"
  private val errorMessageField = "errorMessage"
  private val statusField = "status"

  "errorOutputResponseFormat" should {
    "properly encode all codes" in {
      val format = new ErrorOutput.Formats().errorOutputResponseFormat
      PresentationErrorCode.commonValues.foreach { code =>
        val encoded = format.write(Response.asFailure(ErrorOutput(NonEmptyList.of(code, TestPresentationErrorCode))))
        encoded shouldBe JsObject(
          Map(
            detailsField -> JsObject(
              Map(errorCodesField -> JsArray(JsString(code.value), JsString(TestPresentationErrorCode.value)))),
            statusField -> JsString("error")))
      }
    }

    "properly encode error message" in {
      val format = new ErrorOutput.Formats().errorOutputResponseFormat
      val errorCode = PresentationErrorCode.InternalError
      val errorMessage = "foo"
      val encoded = format.write(Response.asFailure(ErrorOutput.one(errorCode, errorMessage)))
      encoded shouldBe JsObject(
        Map(
          detailsField -> JsObject(
            Map(errorCodesField -> JsArray(JsString(errorCode.value)), errorMessageField -> JsString(errorMessage))),
          statusField -> JsString("error")))
    }

    "fail when decoding unknown code" in {
      val format = new ErrorOutput.Formats().errorOutputResponseFormat
      val unknownCode = TestPresentationErrorCode.value
      val json = JsObject(
        Map(
          detailsField -> JsObject(Map(
            errorCodesField -> JsArray(JsString(PresentationErrorCode.InternalError.value), JsString(unknownCode)))),
          statusField -> JsString("error")))
      the[DeserializationException] thrownBy {
        format.read(json)
      } should have message s"${TestPresentationErrorCode.value} is not supported error code"
    }

    "fail when decoding other type than String as code" in {
      val format = new ErrorOutput.Formats().errorOutputResponseFormat
      val unexpectedCodeJson = JsBoolean(false)
      val json = JsObject(
        Map(
          detailsField -> JsObject(
            Map(errorCodesField -> JsArray(JsString(PresentationErrorCode.InternalError.value), unexpectedCodeJson))),
          statusField -> JsString("error")))
      the[DeserializationException] thrownBy {
        format.read(json)
      } should have message s"Expected String when deserializing PresentationErrorCode but found $unexpectedCodeJson"
    }

    "properly decode known codes" in {
      val format = new ErrorOutput.Formats(additionalCodes = TestPresentationErrorCode).errorOutputResponseFormat
      val errorCodes = PresentationErrorCode.commonValues.toVector :+ TestPresentationErrorCode
      val errorCodesJsStrings = errorCodes.map(code => JsString(code.value))
      val json = JsObject(
        Map(
          detailsField -> JsObject(Map(errorCodesField -> JsArray(errorCodesJsStrings))),
          statusField -> JsString("error")))
      format.read(json) shouldBe Response.asFailure(ErrorOutput(NonEmptyList.fromListUnsafe(errorCodes.toList)))
    }

    "properly decode error message" in {
      val format = new ErrorOutput.Formats().errorOutputResponseFormat
      val errorCode = PresentationErrorCode.InternalError
      val errorMessage = "bar"
      val json = JsObject(
        Map(
          detailsField -> JsObject(
            Map(errorCodesField -> JsArray(JsString(errorCode.value)), errorMessageField -> JsString(errorMessage))),
          statusField -> JsString("error")))
      format.read(json) shouldBe Response.asFailure(ErrorOutput.one(errorCode, errorMessage))
    }

    "fail when error codes are not specified" in {
      val format = new ErrorOutput.Formats().errorOutputResponseFormat
      val json =
        JsObject(
          Map(detailsField -> JsObject(Map(errorMessageField -> JsString("baz"))), statusField -> JsString("error")))
      the[DeserializationException] thrownBy {
        format.read(json)
      } should have message s"Object is missing required member '$errorCodesField'"
    }
  }
}
