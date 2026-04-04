package stella.common.http.error

import ca.mrvisser.sealerate
import cats.data.NonEmptyList
import spray.json.DefaultJsonProtocol._
import spray.json.JsString
import spray.json.JsValue
import spray.json.RootJsonFormat
import spray.json.deserializationError
import sttp.tapir.Schema
import sttp.tapir.SchemaType.SArray
import sttp.tapir.SchemaType.SString

import stella.common.http.Response
import stella.common.http.json.JsonFormats.nonEmptyListFormat

final case class ErrorOutput(errorCodes: NonEmptyList[PresentationErrorCode], errorMessage: Option[String] = None)

object ErrorOutput {

  /** Particular services should specify their additional codes */
  class Formats(additionalCodes: PresentationErrorCode*) {
    private val allCodes: Set[PresentationErrorCode] = PresentationErrorCode.commonValues ++ additionalCodes

    implicit lazy val presentationErrorCodeFormat: RootJsonFormat[PresentationErrorCode] =
      new RootJsonFormat[PresentationErrorCode] {
        override def read(json: JsValue): PresentationErrorCode = json match {
          case JsString(value) =>
            allCodes.find(_.value == value).getOrElse(deserializationError(s"$value is not supported error code"))
          case _ => deserializationError(s"Expected String when deserializing PresentationErrorCode but found $json")
        }

        override def write(obj: PresentationErrorCode): JsValue = JsString(obj.value)
      }

    implicit lazy val errorOutputFormat: RootJsonFormat[ErrorOutput] = jsonFormat2(ErrorOutput.apply)

    implicit lazy val errorOutputResponseFormat: RootJsonFormat[Response[ErrorOutput]] =
      Response.responseFormat[ErrorOutput]
  }

  /** Particular services should specify their additional error codes */
  class Schemas(additionalCodes: PresentationErrorCode*) {
    private val allCodes: Set[PresentationErrorCode] = PresentationErrorCode.commonValues ++ additionalCodes

    lazy implicit val presentationErrorCodeSchema: Schema[PresentationErrorCode] =
      Schema[PresentationErrorCode](
        schemaType = SString(),
        description = Some(s"One of: ${allCodes.map(_.value).mkString(", ")}"),
        encodedExample = Some(PresentationErrorCode.BadRequest.value))

    implicit lazy val presentationErrorCodesListSchema: Schema[NonEmptyList[PresentationErrorCode]] =
      Schema[NonEmptyList[PresentationErrorCode]](
        schemaType = SArray(presentationErrorCodeSchema)(_.toList),
        description = Some("Non-empty collection of error codes"))

    implicit lazy val errorOutputSchema: Schema[ErrorOutput] = Schema
      .derived[ErrorOutput]
      .modify(_.errorMessage)(_.encodedExample("Expected JSON Object body but got plain String"))

    implicit lazy val errorOutputResponseSchema: Schema[Response[ErrorOutput]] =
      Schema
        .derived[Response[ErrorOutput]]
        .modify(_.status)(_.description(s"Error status: ${Response.errorStatus}").encodedExample(Response.errorStatus))
  }

  def one(errorCode: PresentationErrorCode): ErrorOutput = ErrorOutput(NonEmptyList.one(errorCode))

  def one(errorCode: PresentationErrorCode, errorMessage: String): ErrorOutput =
    ErrorOutput(NonEmptyList.one(errorCode), Some(errorMessage))
}

// we allow the particular services to add their own error codes
trait PresentationErrorCode {
  def value: String
}

sealed trait CommonPresentationErrorCode extends PresentationErrorCode

object PresentationErrorCode {
  val commonValues: Set[CommonPresentationErrorCode] = sealerate.values[CommonPresentationErrorCode]

  case object InactiveAuthToken extends CommonPresentationErrorCode {
    override val value: String = "inactiveAuthToken"
  }

  case object InvalidAuthToken extends CommonPresentationErrorCode {
    override val value: String = "invalidAuthToken"
  }

  case object InternalError extends CommonPresentationErrorCode {
    override val value: String = "internalError"
  }

  case object BadRequest extends CommonPresentationErrorCode {
    override val value: String = "badRequest"
  }

  case object Unauthorized extends CommonPresentationErrorCode {
    override val value: String = "unauthorized"
  }

  case object Forbidden extends CommonPresentationErrorCode {
    override val value: String = "forbidden"
  }

  case object OtherError extends CommonPresentationErrorCode {
    override val value: String = "other"
  }

  case object MissingPermissions extends CommonPresentationErrorCode {
    override val value: String = "missingPermissions"
  }

  case object JwksError extends CommonPresentationErrorCode {
    override val value: String = "jwksError"
  }

  case object OidcConfigLookupError extends CommonPresentationErrorCode {
    override val value: String = "oidcConfigLookupError"
  }
}
