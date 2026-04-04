package phoenix.core

object OptionUtils {

  implicit class OptionOps[A](self: Option[A]) {
    def invariantContains(elem: A): Boolean = self.contains(elem)
  }

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
