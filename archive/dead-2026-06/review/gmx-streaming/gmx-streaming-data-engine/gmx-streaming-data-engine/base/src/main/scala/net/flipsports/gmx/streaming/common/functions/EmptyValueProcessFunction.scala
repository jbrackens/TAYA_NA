package net.flipsports.gmx.streaming.common.functions

import com.typesafe.scalalogging.LazyLogging
import org.apache.flink.streaming.api.functions.ProcessFunction
import org.apache.flink.util.Collector

class EmptyValueProcessFunction[SOURCE] extends ProcessFunction[SOURCE, SOURCE] with Serializable with LazyLogging {

  override def processElement(value: SOURCE, ctx: ProcessFunction[SOURCE, SOURCE]#Context, out: Collector[SOURCE]): Unit =
    if (value == null) {
      logger.trace("Null value. Filtering it on output context")
    } else {
      out.collect(value)
    }

}
