package net.flipsports.gmx.common.internal.scala.logging

import scala.reflect.ClassTag
import scala.reflect.runtime.universe._

/**
  * Prints case class with field names (from https://stackoverflow.com/a/35536677)
  */
object PrettyPrint {
  def prettyToString[T: TypeTag](x: T)(implicit classTag: ClassTag[T]): String = {
    val instance = x.asInstanceOf[T]
    val mirror = runtimeMirror(instance.getClass.getClassLoader)
    val accessors = getCaseAccessors[T]
    var res = List.empty[String]
    accessors.foreach { z ⇒
      val instanceMirror = mirror.reflect(instance)
      val fieldMirror = instanceMirror.reflectField(z.asTerm)
      val s = s"${z.name} = ${fieldMirror.get}"
      res = s :: res
    }
    val beautified = x.getClass.getSimpleName + "(" + res.mkString(", ") + ")"
    beautified
  }

  private def getCaseAccessors[T: TypeTag] = typeOf[T].members.collect {
    case m: MethodSymbol if m.isCaseAccessor => m
  }.toList
}