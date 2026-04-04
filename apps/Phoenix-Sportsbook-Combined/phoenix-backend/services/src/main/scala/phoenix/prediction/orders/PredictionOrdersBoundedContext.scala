package phoenix.prediction.orders

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.prediction.common.BotAccountId
import phoenix.prediction.common.PredictionMarketId
import phoenix.prediction.common.PredictionOrderId
import phoenix.prediction.common.PredictionOutcomeId

final case class PlaceOrderCommand(
    accountId: BotAccountId,
    marketId: PredictionMarketId,
    outcomeId: PredictionOutcomeId,
    clientOrderId: String,
    side: String,
    quantity: BigDecimal,
    limitPrice: Option[BigDecimal],
    idempotencyKey: String)

trait PredictionOrdersBoundedContext {
  def placeOrder(command: PlaceOrderCommand)(implicit ec: ExecutionContext): Future[PredictionOrderId]

  def cancelOrder(orderId: PredictionOrderId, accountId: BotAccountId)(implicit ec: ExecutionContext): Future[Unit]
}
