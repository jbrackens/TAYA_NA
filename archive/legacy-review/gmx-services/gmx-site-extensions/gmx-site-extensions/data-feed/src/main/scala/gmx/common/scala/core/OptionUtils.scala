package gmx.common.scala.core

/**
 * Port from Phoenix project (https://github.com/flipadmin/phoenix-backend/) should be extracted to lib
 */
object OptionUtils {

  implicit class OptionCompanionOps(self: Option.type) {
    def when[A](condition: Boolean)(ifTrue: => A): Option[A] = {
      if (condition) {
        Some(ifTrue)
      } else {
        None
      }
    }

    def whenOpt[A](condition: Boolean)(ifTrue: => Option[A]): Option[A] =
      when(condition)(ifTrue).flatten
  }
}
