package net.flipsports.gmx.streaming

import scala.collection.JavaConverters._
import scala.language.implicitConversions

package object sbtech {

  implicit def asString(source: CharSequence): String =
    if (source == null)
      null
    else
      source.toString

  implicit def asMap(map: java.util.Map[CharSequence, CharSequence]): java.util.Map[String, String] =
    map.asScala.map(item => (asString(item._1), asString(item._2))).asJava

}