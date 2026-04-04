package phoenix.core.exceptions

import akka.http.scaladsl.model.StatusCodes
import cats.data.NonEmptyList

import scala.util.control.NonFatal

object ExceptionAdapters {

  /**
   * An exception adapter implementation can be used to convert failures
   * within a bounded context to more generic failure type
   */
  trait ExceptionAdapter {

    /**
     * Creates a [[DomainException]] from any bounded context specific exceptions.
     */
    def toDomainException: DomainException
  }

  implicit class BoundedContextExceptionAdapter(exception: InternalExceptionLike) extends ExceptionAdapter {
    override def toDomainException: DomainException = {
      exception.underlying match {
        case Some(throwable) => toDomainException(exception.reason, throwable)
        case None =>
          DomainException(
            ErrorType.Business,
            errorCode = exception.errorCode,
            NonEmptyList.of(ErrorMessage(exception.reason)),
            None)
      }
    }

    private def toDomainException(reason: String, exception: Throwable): DomainException = {
      exception match {
        case NonFatal(throwable) =>
          DomainException(
            ErrorType.System,
            errorCode = StatusCodes.InternalServerError.intValue,
            NonEmptyList.of(ErrorMessage(reason)),
            Some(throwable))
      }
    }
  }
}
