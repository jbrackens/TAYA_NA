package net.flipsports.gmx.streaming.internal

import scala.collection.JavaConverters._
import scala.language.implicitConversions

package object compliance {

  implicit def asString(source: CharSequence): String =
    if (source == null)
      null
    else
      source.toString

  implicit def asCharSequence(source: String): CharSequence =
    if (source == null)
      null
    else
      source

  implicit def asMap(map: java.util.Map[CharSequence, CharSequence]): java.util.Map[String, String] =
    map.asScala.map(item => (asString(item._1), asString(item._2))).asJava

  implicit def reverseMap(map: Map[String, String]): java.util.Map[CharSequence, CharSequence] =
    map.map(item => (asCharSequence(item._1), asCharSequence(item._2))).asJava

  def fixEmail(email: String) = email.replaceFirst("_se_", "")
}