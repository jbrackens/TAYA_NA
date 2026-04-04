package gmx.widget.siteextentions.datafeed

import gmx.widget.siteextentions.datafeed.legacy.LegacySyncRunner

object Main extends App {
  LegacySyncRunner.start(OperatorTypeConfig.operatorType)

  Application.run(args)
}
