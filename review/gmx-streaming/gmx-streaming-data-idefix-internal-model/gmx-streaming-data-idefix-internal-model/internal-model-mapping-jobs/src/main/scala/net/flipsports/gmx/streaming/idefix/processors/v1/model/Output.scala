package net.flipsports.gmx.streaming.idefix.processors.v1.model

import net.flipsports.gmx.streaming.idefix.Implicits
import org.apache.flink.streaming.api.scala.OutputTag

object Output {

  val brandFailures = OutputTag("model-transformation-failure")(Implicits.Failures.failedRows)
}
