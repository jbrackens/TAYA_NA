package phoenix.core.exceptions

import java.io.{ CharArrayWriter, PrintWriter }

/**
 * An exception serializer can be used from a frontend facing actor to create meaningful error messages.
 */
trait ExceptionSerializer {
  def serialize(exception: DomainException): PhoenixClientError
}

object ExceptionSerializer {
  def buildStackTrace(exception: Option[Throwable], enableStackTraces: Boolean): Option[String] =
    for {
      ex <- exception if enableStackTraces
    } yield {
      val writer = new CharArrayWriter
      ex.printStackTrace(new PrintWriter(writer))
      writer.toString
    }
}

/**
 * Default implementation of an exception Serializer
 */
class DefaultExceptionSerializer(enableStackTraces: Boolean) extends ExceptionSerializer {
  override def serialize(exception: DomainException): PhoenixClientError = {
    exception.errorType match {
      case ErrorType.Business =>
        buildClientError(exception, None)

      case ErrorType.System =>
        buildClientError(exception, ExceptionSerializer.buildStackTrace(exception.cause, enableStackTraces))
    }
  }

  private[this] def buildClientError(exception: DomainException, stacktrace: Option[String]): PhoenixClientError =
    PhoenixClientError(error = ClientError(
      exception.errorCode,
      exception.errorMessages.head.message,
      exception.errorMessages.tail.map(_.message),
      stacktrace))
}
