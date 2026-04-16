package phoenix.core.validation

import scala.util.Try

import cats.Applicative
import cats.data.EitherT
import cats.data.NonEmptyList
import cats.data.Validated

object Validation {
  type Validation[T] = Validated[NonEmptyList[ValidationException], T]

  implicit class ValidationOps[T](self: Validated[NonEmptyList[ValidationException], T]) {
    def combined: Validated[ValidationException, T] = self.leftMap(ValidationException.combineErrors)
    def toEitherCombined: Either[ValidationException, T] = combined.toEither
    def toEitherTCombined[F[_]: Applicative]: EitherT[F, ValidationException, T] = EitherT.fromEither(toEitherCombined)
    def toTryCombined: Try[T] = toEitherCombined.toTry
  }
}
