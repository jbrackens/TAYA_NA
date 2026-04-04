package phoenix.utils

object ThrowableWithCause {
  def unapply(e: Throwable): Option[Throwable] = Option(e.getCause)
}
