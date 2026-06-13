package net.flipsports.gmx.streaming.sbtech.processors.v1.model

import net.flipsports.gmx.streaming.sbtech.Implicits
import org.apache.flink.streaming.api.scala.OutputTag

object Output {

  val brandFailures = OutputTag("model-transformation-failure")(Implicits.Failures.failedRows)
}
