package net.flipsports.gmx.common.internal.scala.core.jdk

import java.{time => jt}

import scala.concurrent.duration._

/**
  * Mimics Scala Java to/from Scala converters.
  * I didn't want to introduce `scala-java8-compat` library just for this one method.
  * When moving to Scala 2.13 we can remove this and use scala.jdk.DurationConverters.
  */
object DurationConverters {

  implicit class DurationHasAsScala(d: jt.Duration) {
    def asScala: FiniteDuration = d.toMillis.milliseconds
  }
}
