package net.flipsports.gmx.common.primitive

import scala.language.implicitConversions

object ImplicitConverters {

  implicit class BoolToOption(val self: Boolean) extends AnyVal {
    def toOption[A](value: => A): Option[A] =
      if (self) Some(value) else None
  }

  implicit def charSequence2String(source: CharSequence): String =
    if (source == null)
      null
    else
      source.toString


  implicit def mapCharSequence2String(map: Map[CharSequence, CharSequence]): Map[String, String] =
    map.map(item => (charSequence2String(item._1), charSequence2String(item._2)))
}