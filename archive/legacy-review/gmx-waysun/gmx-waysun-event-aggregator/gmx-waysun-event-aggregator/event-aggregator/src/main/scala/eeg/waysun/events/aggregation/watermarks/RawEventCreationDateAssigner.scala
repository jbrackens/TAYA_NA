package eeg.waysun.events.aggregation.watermarks

import eeg.waysun.events.aggregation.Types

class RawEventCreationDateAssigner extends NowAssignerWithPeriodicWatermarks[Types.Validated.Source] {}

object RawEventCreationDateAssigner {

  def apply(): RawEventCreationDateAssigner = new RawEventCreationDateAssigner()
}
