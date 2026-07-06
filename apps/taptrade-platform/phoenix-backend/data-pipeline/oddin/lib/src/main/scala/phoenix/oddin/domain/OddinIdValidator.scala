package phoenix.oddin.domain

import scala.reflect.ClassTag

import cats.data.Validated

import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException

object OddinIdValidator {

  def fromString[T: ClassTag](value: String, prefix: String, constructFn: String => T): Validation[T] =
    Validated.condNel(
      value.startsWith(prefix),
      constructFn(value),
      ValidationException(
        s"An ${implicitly[ClassTag[T]].runtimeClass.getSimpleName} must have a format '$prefix*' but received '$value'"))
}
