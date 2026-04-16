package phoenix.prediction.markets

import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.scheduler.AkkaScheduler
import phoenix.prediction.PredictionConfig
import phoenix.prediction.markets.application.LoggingPredictionMarketTemplatePublisher
import phoenix.prediction.markets.infrastructure.GenerateBtcMarketsJob

object PredictionMarketFactoryModule {
  private val log = LoggerFactory.getLogger(getClass)

  def init(predictionConfig: PredictionConfig, akkaJobScheduler: AkkaScheduler, clock: Clock): Unit = {
    if (!predictionConfig.marketFactory.enabled) {
      log.info("Prediction market factory is disabled by configuration")
      ()
    } else {
      val btcConfig = predictionConfig.marketFactory.btc
      val job = new GenerateBtcMarketsJob(
        config = btcConfig,
        publisher = new LoggingPredictionMarketTemplatePublisher,
        clock = clock)
      akkaJobScheduler.scheduleJob(job, btcConfig.periodicWorker)
      log.info("Prediction market factory initialized (BTC template scheduler)")
    }
  }
}
