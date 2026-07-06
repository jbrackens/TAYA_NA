package phoenix.core

object UnitUtils {
  implicit class UnitCastOps(self: Any) {

    /** Explicit cast to Unit to avoid unnecessary `discarded non-Unit value` warning (assuming -Ywarn-value-discard is passed to scalac). */
    def toUnit(): Unit = ()
  }
}
