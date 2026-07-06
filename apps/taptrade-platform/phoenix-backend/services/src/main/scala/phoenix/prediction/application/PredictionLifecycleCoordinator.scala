package phoenix.prediction.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.prediction.infrastructure.PredictionLifecycleFailure
import phoenix.prediction.infrastructure.PredictionMarketLifecyclePersistenceService
import phoenix.prediction.infrastructure.PredictionOrderSettlementPersistenceService
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.http.PredictionMarketDetailResponse
import phoenix.prediction.infrastructure.http.PredictionOrderStore
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.BetFinalizationError
import phoenix.wallets.WalletsBoundedContextProtocol.BetPlacementOutcome
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

sealed trait PredictionLifecycleCoordinatorFailure

object PredictionLifecycleCoordinatorFailure {
  final case class Lifecycle(error: PredictionLifecycleFailure) extends PredictionLifecycleCoordinatorFailure
  final case class Wallet(error: BetFinalizationError) extends PredictionLifecycleCoordinatorFailure
  case object WalletsUnavailable extends PredictionLifecycleCoordinatorFailure
}

final class PredictionLifecycleCoordinator(
    predictionQueries: PredictionQueryService,
    predictionOrderSettlementPersistence: PredictionOrderSettlementPersistenceService,
    predictionMarketLifecyclePersistence: PredictionMarketLifecyclePersistenceService,
    wallets: Option[WalletsBoundedContext]) {

  import PredictionLifecycleCoordinatorFailure._

  def suspendMarket(
      marketId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, PredictionMarketDetailResponse]] =
    predictionMarketLifecyclePersistence
      .suspendMarket(marketId, performedBy, reason)
      .map(_.left.map(Lifecycle))

  def reopenMarket(
      marketId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, PredictionMarketDetailResponse]] =
    predictionMarketLifecyclePersistence
      .openMarket(marketId, performedBy, reason)
      .map(_.left.map(Lifecycle))

  def cancelMarket(
      marketId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, PredictionMarketDetailResponse]] =
    validateMarketForSettlement(marketId, None).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right(_) =>
        finalizeOpenOrders(
          marketId = marketId,
          resolveOutcome = _ => BetPlacementOutcome.Cancelled,
          persistStatus = _ => "cancelled",
          reason = Some(reason),
          performedBy = Some(performedBy)).flatMap {
          case Left(error) => Future.successful(Left(error))
          case Right(_) =>
            predictionMarketLifecyclePersistence
              .cancelMarket(marketId, performedBy, reason)
              .map(_.left.map(Lifecycle))
        }
    }

  def resolveMarket(
      marketId: String,
      outcomeId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, PredictionMarketDetailResponse]] =
    validateMarketForSettlement(marketId, Some(outcomeId)).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right(_) =>
        finalizeOpenOrders(
          marketId = marketId,
          resolveOutcome = order =>
            if (order.order.outcomeId == outcomeId) BetPlacementOutcome.Won else BetPlacementOutcome.Lost,
          persistStatus = order => if (order.order.outcomeId == outcomeId) "won" else "lost",
          reason = Some(reason),
          performedBy = Some(performedBy)).flatMap {
          case Left(error) => Future.successful(Left(error))
          case Right(_) =>
            predictionMarketLifecyclePersistence
              .resolveMarket(marketId, outcomeId, performedBy, reason)
              .map(_.left.map(Lifecycle))
        }
    }

  def resettleMarket(
      marketId: String,
      outcomeId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, PredictionMarketDetailResponse]] =
    validateMarketForResettlement(marketId, outcomeId).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right(_) =>
        refinalizeSettledOrders(
          marketId = marketId,
          winningOutcomeId = outcomeId,
          reason = Some(reason),
          performedBy = Some(performedBy)).flatMap {
          case Left(error) => Future.successful(Left(error))
          case Right(_) =>
            predictionMarketLifecyclePersistence
              .resettleMarket(marketId, outcomeId, performedBy, reason)
              .map(_.left.map(Lifecycle))
        }
    }

  private def validateMarketForSettlement(
      marketId: String,
      outcomeId: Option[String])(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, PredictionMarketDetailResponse]] =
    predictionQueries.marketDetail(marketId).map {
      case None => Left(Lifecycle(PredictionLifecycleFailure.MarketNotFound))
      case Some(detail) if !canSettle(detail.market.status) =>
        Left(Lifecycle(PredictionLifecycleFailure.InvalidTransition))
      case Some(detail) if outcomeId.exists(id => !detail.market.outcomes.exists(_.outcomeId == id)) =>
        Left(Lifecycle(PredictionLifecycleFailure.OutcomeNotFound))
      case Some(detail) => Right(detail)
    }

  private def validateMarketForResettlement(
      marketId: String,
      outcomeId: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, PredictionMarketDetailResponse]] =
    predictionQueries.marketDetail(marketId).map {
      case None => Left(Lifecycle(PredictionLifecycleFailure.MarketNotFound))
      case Some(detail) if detail.market.status.trim.toLowerCase != "resolved" =>
        Left(Lifecycle(PredictionLifecycleFailure.InvalidTransition))
      case Some(detail) if !detail.market.outcomes.exists(_.outcomeId == outcomeId) =>
        Left(Lifecycle(PredictionLifecycleFailure.OutcomeNotFound))
      case Some(detail) => Right(detail)
    }

  private def finalizeOpenOrders(
      marketId: String,
      resolveOutcome: PredictionOrderStore.OpenPredictionOrder => BetPlacementOutcome,
      persistStatus: PredictionOrderStore.OpenPredictionOrder => String,
      reason: Option[String],
      performedBy: Option[String])(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, Unit]] =
    wallets match {
      case None => Future.successful(Left(WalletsUnavailable))
      case Some(walletsBoundedContext) =>
        predictionOrderSettlementPersistence.listOpenOrdersForMarket(marketId).flatMap { orders =>
          orders.foldLeft(Future.successful(Right(()): Either[PredictionLifecycleCoordinatorFailure, Unit])) {
            case (accF, order) =>
              accF.flatMap {
                case left @ Left(_) => Future.successful(left)
                case Right(_) =>
                  walletsBoundedContext
                    .finalizePrediction(
                      WalletId(order.order.punterId),
                      order.reservationId,
                      resolveOutcome(order))
                    .value
                    .flatMap {
                      case Left(error) => Future.successful(Left(Wallet(error)))
                      case Right(_) =>
                        predictionOrderSettlementPersistence
                          .settleStoredOrder(order.order.orderId, persistStatus(order), reason, performedBy)
                          .map(_ => Right(()))
                    }
              }
          }
        }
    }

  private def refinalizeSettledOrders(
      marketId: String,
      winningOutcomeId: String,
      reason: Option[String],
      performedBy: Option[String])(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleCoordinatorFailure, Unit]] =
    wallets match {
      case None => Future.successful(Left(WalletsUnavailable))
      case Some(walletsBoundedContext) =>
        predictionOrderSettlementPersistence.listSettledOrdersForMarket(marketId).flatMap { orders =>
          orders.foldLeft(Future.successful(Right(()): Either[PredictionLifecycleCoordinatorFailure, Unit])) {
            case (accF, order) =>
              accF.flatMap {
                case left @ Left(_) => Future.successful(left)
                case Right(_) =>
                  walletsBoundedContext
                    .refinalizePrediction(
                      WalletId(order.order.punterId),
                      order.walletBet,
                      if (order.order.outcomeId == winningOutcomeId) BetPlacementOutcome.Won else BetPlacementOutcome.Lost)
                    .value
                    .flatMap {
                      case Left(error) => Future.successful(Left(Wallet(error)))
                      case Right(_) =>
                        predictionOrderSettlementPersistence
                          .settleStoredOrder(order.order.orderId, "resettled", reason, performedBy)
                          .map(_ => Right(()))
                    }
              }
          }
        }
    }

  private def canSettle(status: String): Boolean = {
    val normalized = status.trim.toLowerCase
    normalized == "open" || normalized == "live" || normalized == "suspended"
  }
}
