package eeg.waysun.events.aggregation.jobs

import eeg.waysun.events.aggregation.streams.EventAggregatorStream
import net.flipsports.gmx.streaming.common.job.{MetaParameters, WaysunMetaParameters}

object EventAggregatorJob extends BaseJob("aggregator", new WaysunMetaParameters {}) {

  def main(args: Array[String]): Unit =
    new EventAggregatorStream(args, MetaParameters(name), businessMetaParams, config)

  val startup = "eeg.waysun.events.validators.jobs.EventAggregatorJob"
}
