package phoenix.utils

package object unsafe {
  implicit class EitherOps[A, B](value: Either[A, B]) {
    def get: B = value.getOrElse(throw new RuntimeException("Expected Right, got Left"))
  }
}
