package phoenix.prediction.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.prediction.infrastructure.PredictionOrderPersistenceService
import phoenix.prediction.infrastructure.http.PredictionOrderFailure
import phoenix.prediction.infrastructure.http.PredictionOrderView
import phoenix.prediction.infrastructure.http.PredictionPlaceOrderRequest
import phoenix.punters.PunterEntity.PunterId
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.BetFinalizationError
import phoenix.wallets.WalletsBoundedContextProtocol.BetPlacementOutcome
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationError
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

sealed trait PredictionPlayerOrdersFailure

object PredictionPlayerOrdersFailure {
  final case class Order(error: PredictionOrderFailure) extends PredictionPlayerOrdersFailure
  final case class Reservation(error: ReservationError) extends PredictionPlayerOrdersFailure
  final case class Finalization(error: BetFinalizationError) extends PredictionPlayerOrdersFailure
  final case class Persistence(throwable: Throwable) extends PredictionPlayerOrdersFailure
}

trait PredictionPlayerOrdersService {
  def placeOrder(
      punterId: PunterId,
      request: PredictionPlaceOrderRequest)(implicit
      ec: ExecutionContext): Future[Either[PredictionPlayerOrdersFailure, PredictionOrderView]]

  def cancelOrder(
      punterId: PunterId,
      orderId: String)(implicit ec: ExecutionContext): Future[Either[PredictionPlayerOrdersFailure, PredictionOrderView]]
}

final class ReadModelBackedPredictionPlayerOrdersService(
    predictionOrderPersistence: PredictionOrderPersistenceService,
    wallets: WalletsBoundedContext)
    extends PredictionPlayerOrdersService {

  import PredictionPlayerOrdersFailure._

    override def placeOrder(
      punterId: PunterId,
      request: PredictionPlaceOrderRequest)(implicit
      ec: ExecutionContext): Future[Either[PredictionPlayerOrdersFailure, PredictionOrderView]] =
    predictionOrderPersistence.prepareOrder(punterId.value, request).flatMap {
      case Left(error) =>
        Future.successful(Left(Order(error)))
      case Right(preparedOrder) =>
        wallets
          .reserveForPrediction(WalletId.deriveFrom(punterId), preparedOrder.walletBet)
          .value
          .flatMap {
            case Left(error) =>
              Future.successful(Left(Reservation(error)))
            case Right(reservation) =>
              predictionOrderPersistence
                .placePreparedOrder(preparedOrder, reservation.reservationId)
                .map(order => Right(order))
                .recoverWith { case throwable =>
                  wallets
                    .finalizePrediction(
                      WalletId.deriveFrom(punterId),
                      reservation.reservationId,
                      BetPlacementOutcome.Cancelled)
                    .value
                    .map {
                      case Left(finalizationError) => Left(Finalization(finalizationError))
                      case Right(_)                => Left(Persistence(throwable))
                    }
                }
          }
    }

  override def cancelOrder(
      punterId: PunterId,
      orderId: String)(implicit ec: ExecutionContext): Future[Either[PredictionPlayerOrdersFailure, PredictionOrderView]] =
    predictionOrderPersistence.findOpenOwnedOrder(punterId.value, orderId).flatMap {
      case Left(error) =>
        Future.successful(Left(Order(error)))
      case Right(existingOrder) =>
        wallets
          .finalizePrediction(
            WalletId.deriveFrom(punterId),
            existingOrder.reservationId,
            BetPlacementOutcome.Cancelled)
          .value
          .flatMap {
            case Left(error) =>
              Future.successful(Left(Finalization(error)))
            case Right(_) =>
              predictionOrderPersistence
                .cancelStoredOrder(existingOrder.order.orderId)
                .map(order => Right(order))
    }
}
}
