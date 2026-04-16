package phoenix.prediction.infrastructure

import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import io.circe._
import io.circe.generic.semiauto._
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.prediction.infrastructure.http._
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.domain.Funds.RealMoney

sealed trait PredictionLifecycleFailure

object PredictionLifecycleFailure {
  case object MarketNotFound extends PredictionLifecycleFailure
  case object OutcomeNotFound extends PredictionLifecycleFailure
  case object InvalidTransition extends PredictionLifecycleFailure
  case object Unsupported extends PredictionLifecycleFailure
}

final case class PredictionLifecycleRequest(reason: String)
final case class PredictionResolveMarketRequest(outcomeId: String, reason: String)
final case class PredictionOrderContextView(
    orderId: String,
    marketId: String,
    marketTitle: String,
    marketStatus: String,
    outcomeId: String,
    outcomeLabel: String,
    orderStatus: String,
    winningOutcomeId: Option[String],
    winningOutcomeLabel: Option[String],
    settledAt: Option[String],
    settlementReason: Option[String],
    settlementActor: Option[String],
    previousSettledAt: Option[String],
    previousSettledAmountUsd: Option[BigDecimal],
    previousSettlementStatus: Option[String])

final case class PredictionPunterFinancialSummary(
    openExposure: RealMoney,
    openOrders: Int,
    settledOrders: Int,
    cancelledOrders: Int)

object PredictionPunterFinancialSummary {
  val empty: PredictionPunterFinancialSummary =
    PredictionPunterFinancialSummary(
      openExposure = RealMoney(0),
      openOrders = 0,
      settledOrders = 0,
      cancelledOrders = 0)
}

trait PredictionHistoryLookup {
  def predictionContextForOrderId(orderId: String)(implicit ec: ExecutionContext): Future[Option[PredictionOrderContextView]] =
    predictionContextsForOrderIds(Set(orderId)).map(_.get(orderId))

  def predictionContextsForOrderIds(orderIds: Set[String])(implicit
      ec: ExecutionContext): Future[Map[String, PredictionOrderContextView]]

  def predictionFinancialSummaryForPunter(punterId: String)(implicit
      ec: ExecutionContext): Future[PredictionPunterFinancialSummary]
}

trait PredictionQueryService extends PredictionHistoryLookup {
  def categories: Seq[PredictionCategoryView]
  def overview()(implicit ec: ExecutionContext): Future[PredictionOverviewView]
  def listMarkets(
      categoryKey: Option[String] = None,
      status: Option[String] = None,
      featured: Option[Boolean] = None,
      live: Option[Boolean] = None)(implicit ec: ExecutionContext): Future[Seq[PredictionMarketView]]
  def marketDetail(marketIdOrSlug: String)(implicit ec: ExecutionContext): Future[Option[PredictionMarketDetailResponse]]
  def preview(request: PredictionTicketPreviewRequest)(implicit
      ec: ExecutionContext): Future[Either[String, PredictionTicketPreviewResponse]]
  def listOrdersForPunter(
      punterId: String,
      status: Option[String] = None,
      categoryKey: Option[String] = None)(implicit ec: ExecutionContext): Future[Seq[PredictionOrderView]]
  def listAllOrders(
      punterId: Option[String] = None,
      status: Option[String] = None,
      categoryKey: Option[String] = None,
      marketId: Option[String] = None)(implicit ec: ExecutionContext): Future[Seq[PredictionOrderView]]
  def findOrder(orderId: String)(implicit ec: ExecutionContext): Future[Option[PredictionOrderView]]
  def adminSummary()(implicit ec: ExecutionContext): Future[PredictionAdminSummaryResponse]
  def marketLifecycleHistory(marketId: String)(implicit
      ec: ExecutionContext): Future[Option[PredictionLifecycleHistoryResponse]]
}

trait PredictionOrderPersistenceService {
  def syncSeedData()(implicit ec: ExecutionContext): Future[Unit]
  def prepareOrder(
      punterId: String,
      request: PredictionPlaceOrderRequest)(implicit
      ec: ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.PreparedPredictionOrder]]
  def placePreparedOrder(
      prepared: PredictionOrderStore.PreparedPredictionOrder,
      reservationId: ReservationId)(implicit ec: ExecutionContext): Future[PredictionOrderView]
  def findOpenOwnedOrder(
      punterId: String,
      orderId: String)(implicit ec: ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.OpenPredictionOrder]]
  def cancelStoredOrder(orderId: String, reason: Option[String] = None)(implicit ec: ExecutionContext): Future[PredictionOrderView]
}

trait PredictionOrderSettlementPersistenceService {
  def listOpenOrdersForMarket(marketId: String)(implicit ec: ExecutionContext): Future[Seq[PredictionOrderStore.OpenPredictionOrder]]
  def listSettledOrdersForMarket(marketId: String)(implicit ec: ExecutionContext): Future[Seq[PredictionOrderStore.SettledPredictionOrder]]
  def settleStoredOrder(orderId: String, status: String, reason: Option[String] = None, performedBy: Option[String] = None)(implicit
      ec: ExecutionContext): Future[PredictionOrderView]
}

trait PredictionMarketLifecyclePersistenceService {
  def suspendMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]]
  def openMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]]
  def resolveMarket(
      marketId: String,
      outcomeId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]]
  def resettleMarket(
      marketId: String,
      outcomeId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]]
  def cancelMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]]
}

trait PredictionLifecycleAuditSupport {
  def lifecycleAuditIsTransactional: Boolean
}

trait PredictionProjectionService
    extends PredictionOrderPersistenceService
    with PredictionOrderSettlementPersistenceService
    with PredictionMarketLifecyclePersistenceService

trait PredictionReadModelService extends PredictionQueryService with PredictionProjectionService

object PredictionReadModelService {
  private[infrastructure] def summarizePunterOrders(orders: Seq[PredictionOrderView]): PredictionPunterFinancialSummary = {
    val openOrders = orders.filter(order => normalizeOrderStatus(order.status) == "open")
    val cancelledOrders = orders.count(order => normalizeOrderStatus(order.status) == "cancelled")
    val settledOrders = orders.count { order =>
      val normalizedStatus = normalizeOrderStatus(order.status)
      normalizedStatus != "open" && normalizedStatus != "cancelled"
    }

    PredictionPunterFinancialSummary(
      openExposure = RealMoney(openOrders.map(_.stakeUsd).foldLeft(BigDecimal(0))(_ + _)),
      openOrders = openOrders.size,
      settledOrders = settledOrders,
      cancelledOrders = cancelledOrders)
  }

  private def normalizeOrderStatus(status: String): String = status.trim.toLowerCase

  val noop: PredictionReadModelService = new PredictionReadModelService {
    override def syncSeedData()(implicit ec: ExecutionContext): Future[Unit] = Future.unit

    override val categories: Seq[PredictionCategoryView] = PredictionCatalog.categories

    override def overview()(implicit ec: ExecutionContext): Future[PredictionOverviewView] =
      Future.successful(PredictionCatalog.overview)

    override def listMarkets(
        categoryKey: Option[String],
        status: Option[String],
        featured: Option[Boolean],
        live: Option[Boolean])(implicit ec: ExecutionContext): Future[Seq[PredictionMarketView]] =
      Future.successful(PredictionCatalog.listMarkets(categoryKey, status, featured, live))

    override def marketDetail(marketIdOrSlug: String)(implicit
        ec: ExecutionContext): Future[Option[PredictionMarketDetailResponse]] =
      Future.successful(PredictionCatalog.marketDetail(marketIdOrSlug))

    override def preview(request: PredictionTicketPreviewRequest)(implicit
        ec: ExecutionContext): Future[Either[String, PredictionTicketPreviewResponse]] =
      Future.successful(PredictionCatalog.preview(request))

    override def listOrdersForPunter(
        punterId: String,
        status: Option[String],
        categoryKey: Option[String])(implicit ec: ExecutionContext): Future[Seq[PredictionOrderView]] =
      Future.successful(PredictionOrderStore.listForPunter(punterId, status, categoryKey))

    override def listAllOrders(
        punterId: Option[String],
        status: Option[String],
        categoryKey: Option[String],
        marketId: Option[String])(implicit ec: ExecutionContext): Future[Seq[PredictionOrderView]] =
      Future.successful(PredictionOrderStore.listAll(punterId, status, categoryKey, marketId))

    override def findOrder(orderId: String)(implicit ec: ExecutionContext): Future[Option[PredictionOrderView]] =
      Future.successful(PredictionOrderStore.findOrder(orderId))

    override def prepareOrder(
        punterId: String,
        request: PredictionPlaceOrderRequest)(implicit
        ec: ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.PreparedPredictionOrder]] =
      Future.successful(PredictionOrderStore.prepareOrder(punterId, request))

    override def placePreparedOrder(
        prepared: PredictionOrderStore.PreparedPredictionOrder,
        reservationId: ReservationId)(implicit ec: ExecutionContext): Future[PredictionOrderView] =
      Future.successful(PredictionOrderStore.placePreparedOrder(prepared, reservationId))

    override def findOpenOwnedOrder(
        punterId: String,
        orderId: String)(implicit
        ec: ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.OpenPredictionOrder]] =
      Future.successful(PredictionOrderStore.findOpenOwnedOrder(punterId, orderId))

    override def listOpenOrdersForMarket(marketId: String)(implicit
        ec: ExecutionContext): Future[Seq[PredictionOrderStore.OpenPredictionOrder]] =
      Future.successful(
        PredictionOrderStore
          .listAll(marketId = Some(marketId), status = Some("open"))
          .flatMap(order =>
            PredictionOrderStore.findOpenOwnedOrder(order.punterId, order.orderId).toOption))

    override def listSettledOrdersForMarket(marketId: String)(implicit
        ec: ExecutionContext): Future[Seq[PredictionOrderStore.SettledPredictionOrder]] =
      Future.successful(PredictionOrderStore.listSettledOrdersForMarket(marketId))

    override def cancelStoredOrder(orderId: String, reason: Option[String])(implicit
        ec: ExecutionContext): Future[PredictionOrderView] =
      Future.successful(PredictionOrderStore.cancelStoredOrder(orderId, reason))

    override def settleStoredOrder(orderId: String, status: String, reason: Option[String], performedBy: Option[String])(implicit
        ec: ExecutionContext): Future[PredictionOrderView] =
      Future.successful(PredictionOrderStore.settleStoredOrder(orderId, status, reason, performedBy))

    override def adminSummary()(implicit ec: ExecutionContext): Future[PredictionAdminSummaryResponse] =
      Future.successful(PredictionCatalog.adminSummary)

    override def marketLifecycleHistory(marketId: String)(implicit
        ec: ExecutionContext): Future[Option[PredictionLifecycleHistoryResponse]] =
      Future.successful(
        PredictionCatalog
          .marketDetail(marketId)
          .map(_ => PredictionLifecycleHistoryResponse(marketId = marketId, totalCount = 0, items = Seq.empty)))

    override def suspendMarket(marketId: String, performedBy: String, reason: String)(implicit
        ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
      Future.successful(Left(PredictionLifecycleFailure.Unsupported))

    override def openMarket(marketId: String, performedBy: String, reason: String)(implicit
        ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
      Future.successful(Left(PredictionLifecycleFailure.Unsupported))

    override def resolveMarket(
        marketId: String,
        outcomeId: String,
        performedBy: String,
        reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
      Future.successful(Left(PredictionLifecycleFailure.Unsupported))

    override def resettleMarket(
        marketId: String,
        outcomeId: String,
        performedBy: String,
        reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
      Future.successful(Left(PredictionLifecycleFailure.Unsupported))

    override def cancelMarket(marketId: String, performedBy: String, reason: String)(implicit
        ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
      Future.successful(Left(PredictionLifecycleFailure.Unsupported))

    override def predictionContextsForOrderIds(orderIds: Set[String])(implicit
        ec: ExecutionContext): Future[Map[String, PredictionOrderContextView]] =
      Future.successful {
        orderIds.flatMap { orderId =>
          PredictionOrderStore.findOrder(orderId).map { order =>
            orderId -> PredictionOrderContextView(
              orderId = order.orderId,
              marketId = order.marketId,
              marketTitle = order.marketTitle,
              marketStatus = "open",
              outcomeId = order.outcomeId,
              outcomeLabel = order.outcomeLabel,
              orderStatus = order.status,
              winningOutcomeId = None,
              winningOutcomeLabel = None,
              settledAt = Option.when(order.status != "open")(order.updatedAt),
              settlementReason = PredictionOrderStore.settlementReason(orderId),
              settlementActor = PredictionOrderStore.settlementActor(orderId),
              previousSettledAt = PredictionOrderStore.previousSettledAt(orderId),
              previousSettledAmountUsd = PredictionOrderStore.previousSettledAmountUsd(orderId),
              previousSettlementStatus = PredictionOrderStore.previousSettlementStatus(orderId))
          }
        }.toMap
      }

    override def predictionFinancialSummaryForPunter(punterId: String)(implicit
        ec: ExecutionContext): Future[PredictionPunterFinancialSummary] =
      Future.successful(summarizePunterOrders(PredictionOrderStore.listForPunter(punterId)))
  }

  val noopQuery: PredictionQueryService = noop
  val noopProjection: PredictionProjectionService = noop
}

object SlickPredictionReadModelService {
  final case class PredictionMarketMetadata(
      source: String,
      slug: String,
      title: String,
      shortTitle: String,
      categoryKey: String,
      categoryLabel: String,
      featured: Boolean,
      live: Boolean,
      volumeUsd: BigDecimal,
      liquidityUsd: BigDecimal,
      participants: Int,
      summary: String,
      insight: String,
      rules: Seq[String],
      tags: Seq[String],
      resolutionSource: String,
      heroMetricLabel: String,
      heroMetricValue: String,
      probabilityPercent: Int,
      priceChangePercent: BigDecimal,
      relatedMarketIds: Seq[String])

  final case class PredictionOutcomeMetadata(
      priceCents: Int,
      change1d: BigDecimal)

  final case class PredictionOrderMetadata(
      marketId: String,
      marketTitle: String,
      categoryKey: String,
      categoryLabel: String,
      outcomeId: String,
      outcomeLabel: String,
      priceCents: Int,
      stakeUsd: BigDecimal,
      shares: BigDecimal,
      maxPayoutUsd: BigDecimal,
      maxProfitUsd: BigDecimal,
      reservationId: String,
      settledAt: Option[String],
      settlementReason: Option[String],
      settlementActor: Option[String],
      previousSettledAt: Option[String],
      previousSettledAmountUsd: Option[BigDecimal],
      previousSettlementStatus: Option[String])

  final case class PredictionOverridePayload(
      action: String,
      marketStatusBefore: String,
      marketStatusAfter: String,
      outcomeId: Option[String],
      outcomeLabel: Option[String])

  final case class PredictionMarketRow(
      id: UUID,
      marketKey: String,
      marketType: String,
      templateId: Option[UUID],
      instrumentId: Option[UUID],
      status: String,
      opensAt: OffsetDateTime,
      closesAt: OffsetDateTime,
      resolvesAt: OffsetDateTime,
      settlementSourceKey: String,
      metadata: Json,
      createdAt: OffsetDateTime,
      updatedAt: OffsetDateTime)

  final case class PredictionOutcomeRow(
      id: UUID,
      marketId: UUID,
      outcomeKey: String,
      displayName: String,
      outcomeIndex: Int,
      metadata: Json,
      createdAt: OffsetDateTime)

  final case class PredictionOrderRow(
      id: UUID,
      marketId: UUID,
      outcomeId: Option[UUID],
      accountId: String,
      clientOrderId: String,
      side: String,
      orderType: String,
      quantity: BigDecimal,
      limitPrice: Option[BigDecimal],
      status: String,
      submittedAt: OffsetDateTime,
      metadata: Json,
      createdAt: OffsetDateTime,
      updatedAt: OffsetDateTime)

  final case class PredictionSettlementRow(
      id: UUID,
      marketId: UUID,
      settlementEventId: Option[UUID],
      winningOutcomeId: Option[UUID],
      status: String,
      settledAt: Option[OffsetDateTime],
      notes: Option[String],
      createdAt: OffsetDateTime,
      updatedAt: OffsetDateTime)

  final case class PredictionOpsOverrideRow(
      id: UUID,
      incidentId: Option[UUID],
      marketId: Option[UUID],
      overrideType: String,
      overridePayload: Json,
      performedBy: String,
      reason: String,
      performedAt: OffsetDateTime)

  final case class StoredOutcome(
      row: PredictionOutcomeRow,
      metadata: PredictionOutcomeMetadata)

  final case class StoredMarket(
      row: PredictionMarketRow,
      metadata: PredictionMarketMetadata,
      outcomes: Seq[StoredOutcome],
      settlement: Option[PredictionSettlementRow])

  final case class StoredOrder(
      row: PredictionOrderRow,
      metadata: PredictionOrderMetadata,
      market: Option[StoredMarket]) {
    def toView: PredictionOrderView = {
      val outcomeFromMarket = market.flatMap(_.outcomes.find(_.row.outcomeKey == metadata.outcomeId))
      val winningOutcome = for {
        storedMarket <- market
        settlement <- storedMarket.settlement
        winningId <- settlement.winningOutcomeId
        outcome <- storedMarket.outcomes.find(_.row.id == winningId)
      } yield outcome
      PredictionOrderView(
        orderId = row.clientOrderId,
        punterId = row.accountId,
        marketId = market.map(_.row.marketKey).getOrElse(metadata.marketId),
        marketTitle = market.map(_.metadata.shortTitle).getOrElse(metadata.marketTitle),
        categoryKey = market.map(_.metadata.categoryKey).getOrElse(metadata.categoryKey),
        categoryLabel = market.map(_.metadata.categoryLabel).getOrElse(metadata.categoryLabel),
        outcomeId = metadata.outcomeId,
        outcomeLabel = outcomeFromMarket.map(_.row.displayName).getOrElse(metadata.outcomeLabel),
        priceCents = metadata.priceCents,
        stakeUsd = metadata.stakeUsd,
        shares = metadata.shares,
        maxPayoutUsd = metadata.maxPayoutUsd,
        maxProfitUsd = metadata.maxProfitUsd,
        status = normalizeOrderStatus(row.status),
        createdAt = row.submittedAt.toString,
        updatedAt = row.updatedAt.toString,
        marketStatus = market.map(_.row.status),
        winningOutcomeLabel = winningOutcome.map(_.row.displayName),
        settledAt = metadata.settledAt.orElse(market.flatMap(_.settlement.flatMap(_.settledAt.map(_.toString)))),
        settlementReason = metadata.settlementReason.orElse(market.flatMap(_.settlement.flatMap(_.notes))),
        settlementActor = metadata.settlementActor,
        previousSettlementStatus = metadata.previousSettlementStatus)
    }

    def toOpenOrder: PredictionOrderStore.OpenPredictionOrder =
      PredictionOrderStore.OpenPredictionOrder(
        order = toView,
        reservationId = ReservationId(metadata.reservationId),
        walletBet = Bet(
          betId = BetId(row.clientOrderId),
          stake = RealMoney(MoneyAmount(metadata.stakeUsd)),
          odds = impliedOdds(metadata.priceCents)))

    def toSettledOrder: PredictionOrderStore.SettledPredictionOrder =
      PredictionOrderStore.SettledPredictionOrder(
        order = toView,
        walletBet = Bet(
          betId = BetId(row.clientOrderId),
          stake = RealMoney(MoneyAmount(metadata.stakeUsd)),
          odds = impliedOdds(metadata.priceCents)))

    def toPredictionContext: PredictionOrderContextView = {
      val winningOutcome = for {
        storedMarket <- market
        settlement <- storedMarket.settlement
        winningId <- settlement.winningOutcomeId
        outcome <- storedMarket.outcomes.find(_.row.id == winningId)
      } yield outcome

      PredictionOrderContextView(
        orderId = row.clientOrderId,
        marketId = market.map(_.row.marketKey).getOrElse(metadata.marketId),
        marketTitle = market.map(_.metadata.shortTitle).getOrElse(metadata.marketTitle),
        marketStatus = market.map(_.row.status).getOrElse("unknown"),
        outcomeId = metadata.outcomeId,
        outcomeLabel = market
          .flatMap(_.outcomes.find(_.row.outcomeKey == metadata.outcomeId))
          .map(_.row.displayName)
          .getOrElse(metadata.outcomeLabel),
        orderStatus = normalizeOrderStatus(row.status),
        winningOutcomeId = winningOutcome.map(_.row.outcomeKey),
        winningOutcomeLabel = winningOutcome.map(_.row.displayName),
        settledAt = metadata.settledAt.orElse(market.flatMap(_.settlement.flatMap(_.settledAt.map(_.toString)))),
        settlementReason = metadata.settlementReason.orElse(market.flatMap(_.settlement.flatMap(_.notes))),
        settlementActor = metadata.settlementActor,
        previousSettledAt = metadata.previousSettledAt,
        previousSettledAmountUsd = metadata.previousSettledAmountUsd,
        previousSettlementStatus = metadata.previousSettlementStatus)
    }
  }

  object Codecs {
    implicit val marketMetadataCodec: Codec[PredictionMarketMetadata] = deriveCodec
    implicit val outcomeMetadataCodec: Codec[PredictionOutcomeMetadata] = deriveCodec
    implicit val orderMetadataCodec: Codec[PredictionOrderMetadata] = deriveCodec
    implicit val overridePayloadCodec: Codec[PredictionOverridePayload] = deriveCodec
  }

  private def impliedOdds(priceCents: Int): Odds = Odds(BigDecimal(1) / (BigDecimal(priceCents) / 100))

  private def normalizeOrderStatus(status: String): String = status.trim.toLowerCase
}

class SlickPredictionQueryStore(dbConfig: DatabaseConfig[JdbcProfile]) {
  import SlickPredictionReadModelService._
  import dbConfig.db

  private object Tables {
    val markets = TableQuery[PredictionMarketsTable]
    val outcomes = TableQuery[PredictionOutcomesTable]
    val orders = TableQuery[PredictionOrdersTable]
    val settlements = TableQuery[PredictionSettlementsTable]
    val opsOverrides = TableQuery[PredictionOpsOverridesTable]
  }

  private val seedCategories = PredictionCatalog.categories

  val categories: Seq[PredictionCategoryView] = seedCategories

  def overview()(implicit _ec: ExecutionContext): Future[PredictionOverviewView] =
    listMarkets().map { markets =>
      PredictionOverviewView(
        featuredMarkets = markets.filter(_.featured),
        liveMarkets = markets.filter(_.live),
        trendingMarkets = markets.sortBy(_.volumeUsd).reverse.take(4),
        categories = categories)
    }

  def listMarkets(
      categoryKey: Option[String] = None,
      status: Option[String] = None,
      featured: Option[Boolean] = None,
      live: Option[Boolean] = None)(implicit ec: ExecutionContext): Future[Seq[PredictionMarketView]] =
    loadStoredMarkets().map { storedMarkets =>
      val normalizedCategory = normalize(categoryKey)
      val normalizedStatus = normalize(status)

      storedMarkets
        .map(toMarketView)
        .filter { market =>
          val categoryMatches = normalizedCategory.forall(category => category == "all" || market.categoryKey.toLowerCase == category)
          val statusMatches = normalizedStatus.forall(_ == market.status.toLowerCase)
          val featuredMatches = featured.forall(_ == market.featured)
          val liveMatches = live.forall(_ == market.live)
          categoryMatches && statusMatches && featuredMatches && liveMatches
        }
        .sortBy(_.volumeUsd)
        .reverse
    }

  def marketDetail(marketIdOrSlug: String)(implicit
      ec: ExecutionContext): Future[Option[PredictionMarketDetailResponse]] =
    loadStoredMarkets().map { storedMarkets =>
      findStoredMarket(storedMarkets, marketIdOrSlug).map { storedMarket =>
        PredictionMarketDetailResponse(
          market = toMarketView(storedMarket),
          relatedMarkets = storedMarkets
            .filter(candidate => storedMarket.metadata.relatedMarketIds.contains(candidate.row.marketKey))
            .map(toMarketView))
      }
    }

  def preview(request: PredictionTicketPreviewRequest)(implicit
      ec: ExecutionContext): Future[Either[String, PredictionTicketPreviewResponse]] =
    loadStoredMarkets().map { storedMarkets =>
      for {
        market <- findStoredMarket(storedMarkets, request.marketId).toRight("Prediction market not found")
        outcome <- market.outcomes.find(_.row.outcomeKey == request.outcomeId).toRight("Prediction outcome not found")
        _ <- Either.cond(request.stakeUsd > 0, (), "Stake must be greater than zero")
      } yield {
        val priceUsd = BigDecimal(outcome.metadata.priceCents) / 100
        val shares = roundCurrency(request.stakeUsd / priceUsd)
        val maxPayoutUsd = roundCurrency(shares)
        val maxProfitUsd = roundCurrency(maxPayoutUsd - request.stakeUsd)
        PredictionTicketPreviewResponse(
          marketId = market.row.marketKey,
          outcomeId = outcome.row.outcomeKey,
          priceCents = outcome.metadata.priceCents,
          stakeUsd = roundCurrency(request.stakeUsd),
          shares = shares,
          maxPayoutUsd = maxPayoutUsd,
          maxProfitUsd = maxProfitUsd)
      }
    }

  def listOrdersForPunter(
      punterId: String,
      status: Option[String] = None,
      categoryKey: Option[String] = None)(implicit ec: ExecutionContext): Future[Seq[PredictionOrderView]] =
    listAllOrders(Some(punterId), status, categoryKey, None)

  def listAllOrders(
      punterId: Option[String] = None,
      status: Option[String] = None,
      categoryKey: Option[String] = None,
      marketId: Option[String] = None)(implicit ec: ExecutionContext): Future[Seq[PredictionOrderView]] =
    loadStoredOrders().map { orders =>
      val normalizedPunter = normalize(punterId)
      val normalizedStatus = normalize(status)
      val normalizedCategory = normalize(categoryKey)
      val normalizedMarketId = normalize(marketId)

      orders
        .filter { order =>
          val view = order.toView
          normalizedPunter.forall(_ == view.punterId.toLowerCase) &&
          normalizedStatus.forall(statusMatches(view.status, _)) &&
          normalizedCategory.forall(_ == view.categoryKey.toLowerCase) &&
          normalizedMarketId.forall(_ == view.marketId.toLowerCase)
        }
        .sortBy(_.row.submittedAt)
        .reverse
        .map(_.toView)
    }

  def findOrder(orderId: String)(implicit ec: ExecutionContext): Future[Option[PredictionOrderView]] =
    loadStoredOrders().map(_.find(_.row.clientOrderId == orderId).map(_.toView))

  def adminSummary()(implicit _ec: ExecutionContext): Future[PredictionAdminSummaryResponse] = {
    for {
      markets <- listMarkets()
      orders <- listAllOrders()
    } yield {
      val categorySummaries = categories.map { category =>
        val categoryMarkets = markets.filter(_.categoryKey == category.key)
        PredictionAdminCategorySummary(
          key = category.key,
          label = category.label,
          marketCount = categoryMarkets.size,
          liveMarketCount = categoryMarkets.count(_.live),
          openMarketCount = categoryMarkets.count(_.status == "open"),
          resolvedMarketCount = categoryMarkets.count(_.status == "resolved"))
      }

      PredictionAdminSummaryResponse(
        totalMarkets = markets.size,
        liveMarkets = markets.count(_.live),
        featuredMarkets = markets.count(_.featured),
        resolvedMarkets = markets.count(_.status == "resolved"),
        totalVolumeUsd = markets.map(_.volumeUsd).sum,
        totalLiquidityUsd = markets.map(_.liquidityUsd).sum,
        totalOrders = orders.size,
        openOrders = orders.count(_.status == "open"),
        cancelledOrders = orders.count(_.status == "cancelled"),
        categories = categorySummaries,
        topMarkets = markets.sortBy(_.volumeUsd).reverse.take(5))
    }
  }

  def marketLifecycleHistory(marketId: String)(implicit
      ec: ExecutionContext): Future[Option[PredictionLifecycleHistoryResponse]] =
    loadStoredMarkets().flatMap { storedMarkets =>
      findStoredMarket(storedMarkets, marketId) match {
        case None => Future.successful(None)
        case Some(storedMarket) =>
          db.run(
            Tables.opsOverrides
              .filter(_.marketId === storedMarket.row.id.bind.?)
              .sortBy(_.performedAt.desc)
              .result)
            .map { rows =>
              val items = rows.flatMap { row =>
                decodeOverridePayload(row.overridePayload).map { payload =>
                  PredictionLifecycleEventView(
                    id = row.id.toString,
                    action = payload.action,
                    marketStatusBefore = normalizeMarketStatus(payload.marketStatusBefore),
                    marketStatusAfter = normalizeMarketStatus(payload.marketStatusAfter),
                    outcomeId = payload.outcomeId,
                    outcomeLabel = payload.outcomeLabel,
                    performedBy = row.performedBy,
                    reason = row.reason,
                    performedAt = row.performedAt.toString)
                }
              }

              Some(
                PredictionLifecycleHistoryResponse(
                  marketId = storedMarket.row.marketKey,
                  totalCount = items.size,
                  items = items))
            }
      }
    }

  def predictionContextsForOrderIds(orderIds: Set[String])(implicit
      ec: ExecutionContext): Future[Map[String, PredictionOrderContextView]] = {
    if (orderIds.isEmpty) {
      Future.successful(Map.empty)
    } else {
      loadStoredOrders(orderIds = Some(orderIds)).map(_.map(order => order.row.clientOrderId -> order.toPredictionContext).toMap)
    }
  }

  def predictionFinancialSummaryForPunter(punterId: String)(implicit
      _ec: ExecutionContext): Future[PredictionPunterFinancialSummary] =
    listOrdersForPunter(punterId).map(PredictionReadModelService.summarizePunterOrders(_))

  private def loadStoredMarkets()(implicit ec: ExecutionContext): Future[Seq[StoredMarket]] = {
    val dbio = for {
      marketRows <- Tables.markets.result
      outcomeRows <- Tables.outcomes.sortBy(_.outcomeIndex.asc).result
      settlementRows <- Tables.settlements.result
    } yield (marketRows, outcomeRows, settlementRows)

    db.run(dbio).map { case (marketRows, outcomeRows, settlementRows) =>
      val outcomesByMarket = outcomeRows.groupBy(_.marketId)
      val settlementsByMarket = settlementRows.groupBy(_.marketId).view.mapValues(_.headOption).toMap

      marketRows.flatMap { row =>
        decodeMarketMetadata(row.metadata).map { metadata =>
          StoredMarket(
            row = row,
            metadata = metadata,
            outcomes = outcomesByMarket.getOrElse(row.id, Seq.empty).flatMap { outcomeRow =>
              decodeOutcomeMetadata(outcomeRow.metadata).map(StoredOutcome(outcomeRow, _))
            },
            settlement = settlementsByMarket.get(row.id).flatten)
        }
      }
    }
  }

  private def loadStoredOrders(orderIds: Option[Set[String]] = None)(implicit ec: ExecutionContext): Future[Seq[StoredOrder]] = {
    val orderQuery = orderIds.filter(_.nonEmpty) match {
      case Some(ids) => Tables.orders.filter(_.clientOrderId.inSetBind(ids))
      case None      => Tables.orders
    }

    val dbio = for {
      orderRows <- orderQuery.result
      marketRows <- Tables.markets.result
      outcomeRows <- Tables.outcomes.sortBy(_.outcomeIndex.asc).result
      settlementRows <- Tables.settlements.result
    } yield (orderRows, marketRows, outcomeRows, settlementRows)

    db.run(dbio).map { case (orderRows, marketRows, outcomeRows, settlementRows) =>
      val markets = {
        val outcomesByMarket = outcomeRows.groupBy(_.marketId)
        val settlementsByMarket = settlementRows.groupBy(_.marketId).view.mapValues(_.headOption).toMap
        marketRows.flatMap { row =>
          decodeMarketMetadata(row.metadata).map { metadata =>
            row.id -> StoredMarket(
              row = row,
              metadata = metadata,
              outcomes = outcomesByMarket.getOrElse(row.id, Seq.empty).flatMap { outcomeRow =>
                decodeOutcomeMetadata(outcomeRow.metadata).map(StoredOutcome(outcomeRow, _))
              },
              settlement = settlementsByMarket.get(row.id).flatten)
          }
        }.toMap
      }

      orderRows.flatMap { row =>
        decodeOrderMetadata(row.metadata).map { metadata =>
          StoredOrder(
            row = row,
            metadata = metadata,
            market = markets.get(row.marketId))
        }
      }
    }
  }

  private def findStoredMarket(markets: Seq[StoredMarket], marketIdOrSlug: String): Option[StoredMarket] = {
    val target = marketIdOrSlug.trim
    if (target.isEmpty) None
    else markets.find(market => market.row.marketKey == target || market.metadata.slug == target)
  }

  private def toMarketView(storedMarket: StoredMarket): PredictionMarketView = {
    PredictionMarketView(
      marketId = storedMarket.row.marketKey,
      slug = storedMarket.metadata.slug,
      title = storedMarket.metadata.title,
      shortTitle = storedMarket.metadata.shortTitle,
      categoryKey = storedMarket.metadata.categoryKey,
      categoryLabel = storedMarket.metadata.categoryLabel,
      status = normalizeMarketStatus(storedMarket.row.status),
      featured = storedMarket.metadata.featured,
      live = storedMarket.metadata.live && normalizeMarketStatus(storedMarket.row.status) == "live",
      closesAt = storedMarket.row.closesAt.toString,
      resolvesAt = storedMarket.row.resolvesAt.toString,
      volumeUsd = storedMarket.metadata.volumeUsd,
      liquidityUsd = storedMarket.metadata.liquidityUsd,
      participants = storedMarket.metadata.participants,
      summary = storedMarket.metadata.summary,
      insight = storedMarket.metadata.insight,
      rules = storedMarket.metadata.rules,
      tags = storedMarket.metadata.tags,
      resolutionSource = storedMarket.metadata.resolutionSource,
      heroMetricLabel = storedMarket.metadata.heroMetricLabel,
      heroMetricValue = storedMarket.metadata.heroMetricValue,
      probabilityPercent = storedMarket.metadata.probabilityPercent,
      priceChangePercent = storedMarket.metadata.priceChangePercent,
      outcomes = storedMarket.outcomes.map(outcome =>
        PredictionOutcomeView(
          outcomeId = outcome.row.outcomeKey,
          label = outcome.row.displayName,
          priceCents = outcome.metadata.priceCents,
          change1d = outcome.metadata.change1d)),
      relatedMarketIds = storedMarket.metadata.relatedMarketIds)
  }

  private def roundCurrency(value: BigDecimal): BigDecimal =
    value.setScale(2, BigDecimal.RoundingMode.HALF_UP)

  private def normalize(value: Option[String]): Option[String] =
    value.map(_.trim.toLowerCase).filter(_.nonEmpty)

  private def statusMatches(orderStatus: String, normalizedFilter: String): Boolean = {
    val normalizedOrderStatus = orderStatus.trim.toLowerCase
    normalizedFilter match {
      case "settled" =>
        Set("won", "lost", "voided", "pushed", "resettled").contains(normalizedOrderStatus)
      case other =>
        normalizedOrderStatus == other
    }
  }

  private def normalizeMarketStatus(status: String): String = status.trim.toLowerCase

  private def decodeMarketMetadata(json: Json): Option[PredictionMarketMetadata] = {
    import Codecs.marketMetadataCodec
    json.as[PredictionMarketMetadata].toOption
  }

  private def decodeOutcomeMetadata(json: Json): Option[PredictionOutcomeMetadata] = {
    import Codecs.outcomeMetadataCodec
    json.as[PredictionOutcomeMetadata].toOption
  }

  private def decodeOrderMetadata(json: Json): Option[PredictionOrderMetadata] = {
    import Codecs.orderMetadataCodec
    json.as[PredictionOrderMetadata].toOption
  }

  private def decodeOverridePayload(json: Json): Option[PredictionOverridePayload] = {
    import Codecs.overridePayloadCodec
    json.as[PredictionOverridePayload].toOption
  }

}

final class SlickPredictionQueryPersistenceService(dbConfig: DatabaseConfig[JdbcProfile])
    extends PredictionQueryService {
  private val store = new SlickPredictionQueryStore(dbConfig)

  override def categories: Seq[PredictionCategoryView] = store.categories
  override def overview()(implicit ec: ExecutionContext): Future[PredictionOverviewView] = store.overview()
  override def listMarkets(
      categoryKey: Option[String],
      status: Option[String],
      featured: Option[Boolean],
      live: Option[Boolean])(implicit ec: ExecutionContext): Future[Seq[PredictionMarketView]] =
    store.listMarkets(categoryKey, status, featured, live)
  override def marketDetail(marketIdOrSlug: String)(implicit
      ec: ExecutionContext): Future[Option[PredictionMarketDetailResponse]] =
    store.marketDetail(marketIdOrSlug)
  override def preview(request: PredictionTicketPreviewRequest)(implicit
      ec: ExecutionContext): Future[Either[String, PredictionTicketPreviewResponse]] =
    store.preview(request)
  override def listOrdersForPunter(
      punterId: String,
      status: Option[String],
      categoryKey: Option[String])(implicit ec: ExecutionContext): Future[Seq[PredictionOrderView]] =
    store.listOrdersForPunter(punterId, status, categoryKey)
  override def listAllOrders(
      punterId: Option[String],
      status: Option[String],
      categoryKey: Option[String],
      marketId: Option[String])(implicit ec: ExecutionContext): Future[Seq[PredictionOrderView]] =
    store.listAllOrders(punterId, status, categoryKey, marketId)
  override def findOrder(orderId: String)(implicit ec: ExecutionContext): Future[Option[PredictionOrderView]] =
    store.findOrder(orderId)
  override def adminSummary()(implicit ec: ExecutionContext): Future[PredictionAdminSummaryResponse] =
    store.adminSummary()
  override def marketLifecycleHistory(marketId: String)(implicit
      ec: ExecutionContext): Future[Option[PredictionLifecycleHistoryResponse]] =
    store.marketLifecycleHistory(marketId)
  override def predictionContextsForOrderIds(orderIds: Set[String])(implicit
      ec: ExecutionContext): Future[Map[String, PredictionOrderContextView]] =
    store.predictionContextsForOrderIds(orderIds)
  override def predictionFinancialSummaryForPunter(punterId: String)(implicit
      ec: ExecutionContext): Future[PredictionPunterFinancialSummary] =
    store.predictionFinancialSummaryForPunter(punterId)
}

final class SlickPredictionProjectionPersistenceService(dbConfig: DatabaseConfig[JdbcProfile])
    extends PredictionProjectionService
    with PredictionLifecycleAuditSupport {
  private val store = new SlickPredictionProjectionStore(dbConfig)

  override val lifecycleAuditIsTransactional: Boolean = store.transactionalLifecycleAudit
  override def syncSeedData()(implicit ec: ExecutionContext): Future[Unit] = store.syncSeedData()
  override def prepareOrder(
      punterId: String,
      request: PredictionPlaceOrderRequest)(implicit
      ec: ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.PreparedPredictionOrder]] =
    store.prepareOrder(punterId, request)
  override def placePreparedOrder(
      prepared: PredictionOrderStore.PreparedPredictionOrder,
      reservationId: ReservationId)(implicit ec: ExecutionContext): Future[PredictionOrderView] =
    store.placePreparedOrder(prepared, reservationId)
  override def findOpenOwnedOrder(
      punterId: String,
      orderId: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.OpenPredictionOrder]] =
    store.findOpenOwnedOrder(punterId, orderId)
  override def cancelStoredOrder(orderId: String, reason: Option[String])(implicit
      ec: ExecutionContext): Future[PredictionOrderView] =
    store.cancelStoredOrder(orderId, reason)
  override def listOpenOrdersForMarket(marketId: String)(implicit
      ec: ExecutionContext): Future[Seq[PredictionOrderStore.OpenPredictionOrder]] =
    store.listOpenOrdersForMarket(marketId)
  override def listSettledOrdersForMarket(marketId: String)(implicit
      ec: ExecutionContext): Future[Seq[PredictionOrderStore.SettledPredictionOrder]] =
    store.listSettledOrdersForMarket(marketId)
  override def settleStoredOrder(orderId: String, status: String, reason: Option[String], performedBy: Option[String])(implicit
      ec: ExecutionContext): Future[PredictionOrderView] =
    store.settleStoredOrder(orderId, status, reason, performedBy)
  override def suspendMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    store.suspendMarket(marketId, performedBy, reason)
  override def openMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    store.openMarket(marketId, performedBy, reason)
  override def resolveMarket(
      marketId: String,
      outcomeId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    store.resolveMarket(marketId, outcomeId, performedBy, reason)
  override def resettleMarket(
      marketId: String,
      outcomeId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    store.resettleMarket(marketId, outcomeId, performedBy, reason)
  override def cancelMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    store.cancelMarket(marketId, performedBy, reason)
}

// Compatibility bridge while older call sites are migrated to the explicit query/projection split.
