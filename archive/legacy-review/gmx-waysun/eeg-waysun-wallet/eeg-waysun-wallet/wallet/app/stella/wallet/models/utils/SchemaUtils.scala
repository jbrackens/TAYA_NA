package stella.wallet.models.utils

import sttp.tapir.Schema

object SchemaUtils {
  def nonBlankStringDescription[T](maxLength: Int): Schema[T] => Schema[T] =
    _.description(s"A non-blank value between 1 and $maxLength characters")
}
