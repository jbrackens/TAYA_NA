package eeg.waysun.events.validators.jobs

import eeg.waysun.events.validators.streams.EventValidatorStream
import net.flipsports.gmx.streaming.common.job.{MetaParameters, WaysunMetaParameters}

object EventValidatorJob extends BaseJob("ingestor", new WaysunMetaParameters {}) {

  def main(args: Array[String]): Unit = EventValidatorStream(args, MetaParameters(name), businessMetaParams, config)

  val startup = "eeg.waysun.events.validators.jobs.EventValidatorJob"
}
