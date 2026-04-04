package net.flipsports.gmx.streaming.common.conversion

import scala.language.implicitConversions

object StringOps {

  implicit def asString(source: CharSequence): String =
    if (source == null)
      null
    else
      source.toString
}
