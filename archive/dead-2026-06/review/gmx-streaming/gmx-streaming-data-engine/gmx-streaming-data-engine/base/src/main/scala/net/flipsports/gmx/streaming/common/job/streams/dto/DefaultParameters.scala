package net.flipsports.gmx.streaming.common.job.streams.dto

import net.flipsports.gmx.streaming.common.job.streams.dto.Parameter._
import org.slf4j.event.Level

object DefaultParameters {

  object Log {
    val processElementLogLevel: Parameter[String] = stringParameter("log.level.processElement", Level.DEBUG.toString)

    val broadcastElementLogLevel: Parameter[String] = stringParameter("log.level.broadcastElement", Level.DEBUG.toString)

    val timerTickLogLevel: Parameter[String] = stringParameter("log.level.timerTick", Level.DEBUG.toString)

    val stateOperationLogLevel: Parameter[String] = stringParameter("log.level.stateOperation", Level.DEBUG.toString)

    val globalLogLevel: Parameter[String] = stringParameter("log.level.global", Level.DEBUG.toString)

  }

  object Parallelism {

    val global: Parameter[Int] = intParameter("parallelism.global", 1)

    val sourceFunction: Parameter[Int] = intParameter("parallelism.source.function", 1)

    val mapTransformation: Parameter[Int] = intParameter("parallelism.source.map", 1)
  }
}
