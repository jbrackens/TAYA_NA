package phoenix.core.exceptions

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.model.StatusCodes
import cats.data.NonEmptyList
import com.fasterxml.jackson.core.{ JsonGenerator, JsonParser }
import com.fasterxml.jackson.databind.annotation.{ JsonDeserialize, JsonSerialize }
import com.fasterxml.jackson.databind.deser.std.StdDeserializer
import com.fasterxml.jackson.databind.ser.std.StdSerializer
import com.fasterxml.jackson.databind.{ DeserializationContext, SerializerProvider }
import phoenix.CborSerializable
import phoenix.core.exceptions.ErrorType.{ ErrorTypeDeserializer, ErrorTypeSerializer }
import pureconfig.ConfigSource
import pureconfig.generic.auto._

@JsonSerialize(using = classOf[ErrorTypeSerializer])
@JsonDeserialize(using = classOf[ErrorTypeDeserializer])
sealed trait ErrorType extends CborSerializable
object ErrorType {
  final case object Business extends ErrorType
  final case object System extends ErrorType

  class ErrorTypeSerializer extends StdSerializer[ErrorType](classOf[ErrorType]) {
    override def serialize(errorType: ErrorType, gen: JsonGenerator, provider: SerializerProvider): Unit = {
      val serialized = errorType match {
        case Business => "business"
        case System   => "system"
      }
      gen.writeString(serialized)
    }
  }

  class ErrorTypeDeserializer extends StdDeserializer[ErrorType](classOf[ErrorType]) {
    override def deserialize(parser: JsonParser, context: DeserializationContext): ErrorType =
      parser.getText match {
        case "business" => Business
        case "system"   => System
      }
  }
}

final case class ErrorMessage(message: String) extends AnyVal

trait InternalExceptionLike {

  /**
   * The error message
   */
  val reason: String

  /**
   * The error code
   *
   * This will be sent as HTTP status code.
   * The default value for any business exception is a 400 bad request
   * and can provide a custom value based on the context.
   */
  val errorCode: Int

  /**
   * The underlying Throwable in case of any system failure.
   */
  val underlying: Option[Throwable]
}

abstract class BoundedContextException(
    val reason: String,
    val errorCode: Int = StatusCodes.BadRequest.intValue,
    val underlying: Option[Throwable] = None)
    extends InternalExceptionLike

/**
 * Domain specific exceptions are created and returned from each bounded context.
 */
case class DomainException(
    errorType: ErrorType,
    errorCode: Int,
    errorMessages: NonEmptyList[ErrorMessage],
    cause: Option[Throwable])
    extends CborSerializable {

  def combinedErrorMessage: String =
    errorMessages.toList.map(_.message).mkString("\n")
}

/**
 * User facing error response.
 */
final case class PhoenixClientError(success: Boolean = false, error: ClientError)

object PhoenixClientError {
  import spray.json.DefaultJsonProtocol._
  import spray.json.RootJsonFormat

  implicit val clientErrorFormat: RootJsonFormat[ClientError] = jsonFormat4(ClientError)
  implicit val errorFormat: RootJsonFormat[PhoenixClientError] = jsonFormat2(PhoenixClientError.apply)
}

final case class ClientError(
    code: Int,
    message: String,
    additionalErrors: Seq[String] = Seq.empty,
    stackTrace: Option[String] = None)

case class ExceptionConfig(enableStackTraces: Boolean)

object ExceptionConfig {

  val PathRoot = "phoenix.exceptions"

  def apply(system: ActorSystem[Nothing]): ExceptionConfig =
    ConfigSource.fromConfig(system.settings.config).at(PathRoot).loadOrThrow[ExceptionConfig]

  def fromString(config: String): ExceptionConfig =
    ConfigSource.string(config).at(PathRoot).loadOrThrow[ExceptionConfig]
}
