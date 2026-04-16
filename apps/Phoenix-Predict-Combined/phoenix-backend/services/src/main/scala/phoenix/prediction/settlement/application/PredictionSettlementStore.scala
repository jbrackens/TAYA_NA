package phoenix.prediction.settlement.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

trait PredictionSettlementStore {
  def persistSnapshot(snapshot: SettlementSnapshot)(implicit ec: ExecutionContext): Future[Unit]

  def persistResolution(resolution: SettlementResolution)(implicit ec: ExecutionContext): Future[Unit]
}
