package phoenix.core

import enumeratum.Enum
import enumeratum.EnumEntry

object EnumUtils {
  implicit class EnumOps[A <: EnumEntry](self: Enum[A]) {
    def withUnderlyingObjectNameOption(objectName: String): Option[A] = {
      self.values.find(_.toString == objectName) // scalafix:ok
    }
  }
}
