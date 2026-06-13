package net.flipsports.gmx.streaming.common.job.stats

import org.apache.flink.api.common.functions.RichMapFunction
import org.apache.flink.configuration.Configuration
import org.apache.flink.dropwizard.metrics.DropwizardMeterWrapper
import org.apache.flink.metrics.Meter

class AverageThroughputMeter[S] extends RichMapFunction[S, S] {
  @transient private var meter: Meter = _

  override def open(config: Configuration): Unit = {
    val dropwizardMeter = new com.codahale.metrics.Meter()
    meter = getRuntimeContext()
      .getMetricGroup()
      .meter("processed.events.throughput.per.minute", new DropwizardMeterWrapper(dropwizardMeter))
  }

  override def map(value: S): S = {
    meter.markEvent()
    value
  }
}