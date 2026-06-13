package net.flipsports.gmx.streaming.common.job.stats

import com.codahale.metrics.SlidingWindowReservoir
import org.apache.flink.api.common.functions.RichMapFunction
import org.apache.flink.configuration.Configuration
import org.apache.flink.dropwizard.metrics.DropwizardHistogramWrapper
import org.apache.flink.metrics.Histogram

class LongValuesHistogram[S] extends RichMapFunction[S,S] {
  @transient private var histogram: Histogram = _

  override def open(config: Configuration): Unit = {
     val dropwizardHistogram: com.codahale.metrics.Histogram= new com.codahale.metrics.Histogram(new SlidingWindowReservoir(500))

    histogram = getRuntimeContext()
      .getMetricGroup()
      .histogram("processed.events.histogram", new DropwizardHistogramWrapper(dropwizardHistogram))
  }

  override def map(value: S): S = {
    histogram.update(value.hashCode())
    value
  }
}