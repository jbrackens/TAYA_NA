package net.flipsports.gmx.streaming.common.job.stats

import org.apache.flink.api.common.functions.RichMapFunction
import org.apache.flink.configuration.Configuration
import org.apache.flink.metrics.Counter

class MessageCounter[S] extends RichMapFunction[S, S] with Serializable {

  @transient private var counter: Counter = _

  override def open(parameters: Configuration): Unit = {
    counter = getRuntimeContext()
      .getMetricGroup()
      .counter("processed.events.counter")
  }

  override def map(value: S): S = {
    counter.inc()
    value
  }
}

