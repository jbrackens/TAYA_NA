package gmx.widget.siteextentions.datafeed.legacy

import tech.argyll.video.core.sbtech.SBTechOperatorType
import tech.argyll.video.datafeed.DataFeedApplication

object LegacySyncRunner {
  def start(operatorType: SBTechOperatorType): Unit = {
    DataFeedApplication.main(Array(operatorType.toString))
  }
}
