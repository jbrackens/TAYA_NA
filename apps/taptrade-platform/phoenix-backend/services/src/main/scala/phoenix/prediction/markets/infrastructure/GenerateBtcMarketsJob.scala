package phoenix.prediction.markets.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.scheduler.ScheduledJob
import phoenix.prediction.BtcMarketFactoryConfig
import phoenix.prediction.markets.application.PredictionMarketTemplatePublisher
import phoenix.prediction.markets.templates.BtcPriceBandTemplate
import phoenix.prediction.markets.templates.BtcTemplateContext

final class GenerateBtcMarketsJob(
    config: BtcMarketFactoryConfig,
    publisher: PredictionMarketTemplatePublisher,
    clock: Clock)
    extends ScheduledJob[Unit] {

  private val log = LoggerFactory.getLogger(getClass)
  private val template = new BtcPriceBandTemplate(config)

  override def execute()(implicit ec: ExecutionContext): Future[Unit] = {
    val generatedAt = clock.currentOffsetDateTime()
    val context = BtcTemplateContext(referencePrice = config.defaultReferencePrice, generatedAt = generatedAt)
    val markets = template.generate(context)

    for {
      _ <- Future.sequence(markets.map { generated =>
        publisher.publish(generated.spec, generated.settlementSpec)
      })
      _ <- Future.successful(
        log.info(
          s"[prediction-template] generated ${markets.size} BTC markets at $generatedAt using referencePrice=${config.defaultReferencePrice}"))
    } yield ()
  }
}
