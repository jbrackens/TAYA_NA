package phoenix.prediction.markets.application

import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.slf4j.LoggerFactory

import phoenix.prediction.common.MarketSpec
import phoenix.prediction.common.PredictionMarketId
import phoenix.prediction.common.SettlementSpec

trait PredictionMarketTemplatePublisher {
  def publish(spec: MarketSpec, settlementSpec: SettlementSpec)(implicit ec: ExecutionContext): Future[PredictionMarketId]
}

final class LoggingPredictionMarketTemplatePublisher extends PredictionMarketTemplatePublisher {
  private val log = LoggerFactory.getLogger(getClass)

  override def publish(spec: MarketSpec, settlementSpec: SettlementSpec)(implicit
      ec: ExecutionContext): Future[PredictionMarketId] = {
    log.info(
      s"[prediction-template] publishing marketKey=${spec.marketKey}, marketType=${spec.marketType}, settlementSource=${settlementSpec.sourceKey}")
    Future.successful(PredictionMarketId(UUID.randomUUID()))
  }
}
