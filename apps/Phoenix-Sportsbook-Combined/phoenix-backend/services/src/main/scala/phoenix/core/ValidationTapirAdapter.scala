package phoenix.core

import cats.data.NonEmptyList
import cats.data.Validated
import sttp.tapir.DecodeResult

import phoenix.core.validation.Validation._
import phoenix.core.validation.ValidationException

object ValidationTapirAdapter {
  implicit class ValidationTapirOps[T](self: Validated[NonEmptyList[ValidationException], T]) {
    def toDecodeResult(originalRawValue: String): DecodeResult[T] =
      self.combined.fold(
        validationException => DecodeResult.Error(originalRawValue, validationException),
        correct => DecodeResult.Value(correct))
  }
}
