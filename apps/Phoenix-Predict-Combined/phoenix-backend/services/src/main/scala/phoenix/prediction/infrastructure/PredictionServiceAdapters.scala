package phoenix.prediction.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.prediction.infrastructure.http._
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

final class ComposedPredictionReadModelService(
    query: PredictionQueryService,
    projection: PredictionProjectionService,
    transactionalAudit: Boolean = false)
    extends PredictionReadModelService
    with PredictionLifecycleAuditSupport {

  override val lifecycleAuditIsTransactional: Boolean = transactionalAudit

  override def categories: Seq[PredictionCategoryView] = query.categories

  override def overview()(implicit ec: ExecutionContext): Future[PredictionOverviewView] =
    query.overview()

  override def listMarkets(
      categoryKey: Option[String],
      status: Option[String],
      featured: Option[Boolean],
      live: Option[Boolean])(implicit ec: ExecutionContext): Future[Seq[PredictionMarketView]] =
    query.listMarkets(categoryKey, status, featured, live)

  override def marketDetail(marketIdOrSlug: String)(implicit
      ec: ExecutionContext): Future[Option[PredictionMarketDetailResponse]] =
    query.marketDetail(marketIdOrSlug)

  override def preview(request: PredictionTicketPreviewRequest)(implicit
      ec: ExecutionContext): Future[Either[String, PredictionTicketPreviewResponse]] =
    query.preview(request)

  override def listOrdersForPunter(
      punterId: String,
      status: Option[String],
      categoryKey: Option[String])(implicit ec: ExecutionContext): Future[Seq[PredictionOrderView]] =
    query.listOrdersForPunter(punterId, status, categoryKey)

  override def listAllOrders(
      punterId: Option[String],
      status: Option[String],
      categoryKey: Option[String],
      marketId: Option[String])(implicit ec: ExecutionContext): Future[Seq[PredictionOrderView]] =
    query.listAllOrders(punterId, status, categoryKey, marketId)

  override def findOrder(orderId: String)(implicit ec: ExecutionContext): Future[Option[PredictionOrderView]] =
    query.findOrder(orderId)

  override def adminSummary()(implicit ec: ExecutionContext): Future[PredictionAdminSummaryResponse] =
    query.adminSummary()

  override def marketLifecycleHistory(marketId: String)(implicit
      ec: ExecutionContext): Future[Option[PredictionLifecycleHistoryResponse]] =
    query.marketLifecycleHistory(marketId)

  override def predictionContextsForOrderIds(orderIds: Set[String])(implicit
      ec: ExecutionContext): Future[Map[String, PredictionOrderContextView]] =
    query.predictionContextsForOrderIds(orderIds)

  override def predictionFinancialSummaryForPunter(punterId: String)(implicit
      ec: ExecutionContext): Future[PredictionPunterFinancialSummary] =
    query.predictionFinancialSummaryForPunter(punterId)

  override def syncSeedData()(implicit ec: ExecutionContext): Future[Unit] =
    projection.syncSeedData()

  override def prepareOrder(
      punterId: String,
      request: PredictionPlaceOrderRequest)(implicit
      ec: ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.PreparedPredictionOrder]] =
    projection.prepareOrder(punterId, request)

  override def placePreparedOrder(
      prepared: PredictionOrderStore.PreparedPredictionOrder,
      reservationId: ReservationId)(implicit ec: ExecutionContext): Future[PredictionOrderView] =
    projection.placePreparedOrder(prepared, reservationId)

  override def findOpenOwnedOrder(
      punterId: String,
      orderId: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.OpenPredictionOrder]] =
    projection.findOpenOwnedOrder(punterId, orderId)

  override def cancelStoredOrder(orderId: String, reason: Option[String])(implicit
      ec: ExecutionContext): Future[PredictionOrderView] =
    projection.cancelStoredOrder(orderId, reason)

  override def listOpenOrdersForMarket(marketId: String)(implicit
      ec: ExecutionContext): Future[Seq[PredictionOrderStore.OpenPredictionOrder]] =
    projection.listOpenOrdersForMarket(marketId)

  override def listSettledOrdersForMarket(marketId: String)(implicit
      ec: ExecutionContext): Future[Seq[PredictionOrderStore.SettledPredictionOrder]] =
    projection.listSettledOrdersForMarket(marketId)

  override def settleStoredOrder(orderId: String, status: String, reason: Option[String], performedBy: Option[String])(implicit
      ec: ExecutionContext): Future[PredictionOrderView] =
    projection.settleStoredOrder(orderId, status, reason, performedBy)

  override def suspendMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    projection.suspendMarket(marketId, performedBy, reason)

  override def openMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    projection.openMarket(marketId, performedBy, reason)

  override def resolveMarket(
      marketId: String,
      outcomeId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    projection.resolveMarket(marketId, outcomeId, performedBy, reason)

  override def resettleMarket(
      marketId: String,
      outcomeId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    projection.resettleMarket(marketId, outcomeId, performedBy, reason)

  override def cancelMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    projection.cancelMarket(marketId, performedBy, reason)
}
