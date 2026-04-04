package eeg.waysun.events.validators

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters

object Names {

  val kafkaConsumerGroup = (parameters: BusinessMetaParameters) =>
    s"eeg-streaming.events-validation-on-${parameters.brand().sourceBrand.name}"

  val validMessagesSink = "eeg-streaming.sink-valid-events"

  val failedMessagesSink = "eeg-streaming.sink-failed-events"
}
