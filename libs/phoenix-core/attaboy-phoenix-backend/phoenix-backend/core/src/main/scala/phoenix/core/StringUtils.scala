package phoenix.core

import java.util.regex.Pattern

object StringUtils {
  implicit class StringOps[A](self: String) {
    def ensureEndsWith(suffix: String): String = {
      if (self.endsWith(suffix)) self else self + suffix
    }

    def ensureDoesNotEndWith(suffix: String): String = {
      self.replaceAll(s"(${Pattern.quote(suffix)})+$$", "")
    }
  }
}
