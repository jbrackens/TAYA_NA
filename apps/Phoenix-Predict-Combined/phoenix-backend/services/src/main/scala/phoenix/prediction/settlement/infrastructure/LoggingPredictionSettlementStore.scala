package phoenix.prediction.settlement.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.slf4j.LoggerFactory

import phoenix.prediction.settlement.application.PredictionSettlementStore
import phoenix.prediction.settlement.application.SettlementResolution
import phoenix.prediction.settlement.application.SettlementSnapshot

final class LoggingPredictionSettlementStore extends PredictionSettlementStore {
  private val log = LoggerFactory.getLogger(getClass)

  override def persistSnapshot(snapshot: SettlementSnapshot)(implicit ec: ExecutionContext): Future[Unit] =
    Future.successful(
      log.info(
        s"[prediction-settlement] snapshot market=${snapshot.marketId.value} source=${snapshot.sourceKey} hash=${snapshot.payloadHash}"))

  override def persistResolution(resolution: SettlementResolution)(implicit ec: ExecutionContext): Future[Unit] =
    Future.successful(
      log.info(
        s"[prediction-settlement] resolution market=${resolution.marketId.value} winner=${resolution.winningOutcomeKey} hash=${resolution.payloadHash}"))
}
