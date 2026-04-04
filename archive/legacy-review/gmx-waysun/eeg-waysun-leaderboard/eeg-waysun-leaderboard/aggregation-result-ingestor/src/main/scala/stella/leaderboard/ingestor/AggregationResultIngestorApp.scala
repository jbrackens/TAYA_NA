package stella.leaderboard.ingestor

import scala.concurrent.ExecutionContext

object AggregationResultIngestorApp extends App {

  val module = new AggregationResultIngestorModule {
    // scalastyle:off
    import scala.concurrent.ExecutionContext.Implicits.global
    // scalastyle:on

    override implicit def executionContext: ExecutionContext = global
  }
  module.aggregationResultIngestor.start()
  waitInfinitely()

  private def waitInfinitely(): Unit = while (true) Thread.sleep(Long.MaxValue)
}
