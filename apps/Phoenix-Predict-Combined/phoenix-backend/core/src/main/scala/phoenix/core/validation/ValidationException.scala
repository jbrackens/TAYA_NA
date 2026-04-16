package phoenix.core.validation

import cats.data.NonEmptyList

final case class ValidationException(message: String, cause: Option[Throwable] = None)
    extends RuntimeException(message, cause.orNull)

object ValidationException {
  def combineErrors(multipleErrors: NonEmptyList[ValidationException]): ValidationException =
    ValidationException(combinedMessage(multipleErrors))

  private def combinedMessage(errors: NonEmptyList[ValidationException]): String = errors.toList.mkString(",")
}
