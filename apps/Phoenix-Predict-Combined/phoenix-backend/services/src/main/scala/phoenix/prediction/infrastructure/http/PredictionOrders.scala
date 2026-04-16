package phoenix.prediction.infrastructure.http

import java.time.OffsetDateTime
import java.util.UUID
import java.util.concurrent.atomic.AtomicReference

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.domain.Funds.RealMoney

final case class PredictionPlaceOrderRequest(
    marketId: String,
    outcomeId: String,
    stakeUsd: BigDecimal)

final case class PredictionOrderView(
    orderId: String,
    punterId: String,
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
    status: String,
    createdAt: String,
    updatedAt: String,
    marketStatus: Option[String] = None,
    winningOutcomeLabel: Option[String] = None,
    settledAt: Option[String] = None,
    settlementReason: Option[String] = None,
    settlementActor: Option[String] = None,
    previousSettlementStatus: Option[String] = None)

final case class PredictionOrdersResponse(
    totalCount: Int,
    orders: Seq[PredictionOrderView])

final case class PredictionPlaceOrderResponse(order: PredictionOrderView)

final case class PredictionCancelOrderResponse(order: PredictionOrderView)

final case class PredictionOrderSummary(
    totalOrders: Int,
    openOrders: Int,
    cancelledOrders: Int)

sealed trait PredictionOrderFailure

object PredictionOrderFailure {
  case object MarketNotFound extends PredictionOrderFailure
  case object OutcomeNotFound extends PredictionOrderFailure
  case object InvalidStake extends PredictionOrderFailure
  case object MarketNotOpen extends PredictionOrderFailure
  case object OrderNotFound extends PredictionOrderFailure
  case object OrderNotCancellable extends PredictionOrderFailure
}

object PredictionOrderStore {
  import PredictionOrderFailure._

  private final case class StoredPredictionOrder(
      order: PredictionOrderView,
      reservationId: ReservationId,
      walletBet: Bet,
      settlementReason: Option[String] = None,
      settlementActor: Option[String] = None,
      previousSettledAt: Option[String] = None,
      previousSettledAmountUsd: Option[BigDecimal] = None,
      previousSettlementStatus: Option[String] = None)

  final case class PreparedPredictionOrder(
      orderId: String,
      punterId: String,
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
      walletBet: Bet)

  private val ordersRef = new AtomicReference(Vector.empty[StoredPredictionOrder])

  def prepareOrder(
      punterId: String,
      request: PredictionPlaceOrderRequest): Either[PredictionOrderFailure, PreparedPredictionOrder] = {
    for {
      market <- PredictionCatalog.findMarket(request.marketId).toRight(MarketNotFound)
      outcome <- market.outcomes.find(_.outcomeId == request.outcomeId).toRight(OutcomeNotFound)
      _ <- Either.cond(request.stakeUsd > 0, (), InvalidStake)
      _ <- Either.cond(isMarketOpen(market.status), (), MarketNotOpen)
      preview <- PredictionCatalog.preview(
        PredictionTicketPreviewRequest(
          marketId = market.marketId,
          outcomeId = outcome.outcomeId,
          stakeUsd = request.stakeUsd)).left.map {
          case "Prediction market not found"  => MarketNotFound
          case "Prediction outcome not found" => OutcomeNotFound
          case "Stake must be greater than zero" =>
            InvalidStake
          case _ => MarketNotOpen
        }
    } yield {
      val orderId = s"po-${UUID.randomUUID()}"
      PreparedPredictionOrder(
        orderId = orderId,
        punterId = punterId,
        marketId = market.marketId,
        marketTitle = market.shortTitle,
        categoryKey = market.categoryKey,
        categoryLabel = market.categoryLabel,
        outcomeId = outcome.outcomeId,
        outcomeLabel = outcome.label,
        priceCents = outcome.priceCents,
        stakeUsd = preview.stakeUsd,
        shares = preview.shares,
        maxPayoutUsd = preview.maxPayoutUsd,
        maxProfitUsd = preview.maxProfitUsd,
        walletBet = Bet(
          betId = BetId(orderId),
          stake = RealMoney(MoneyAmount(preview.stakeUsd)),
          odds = impliedOdds(outcome.priceCents)))
    }
  }

  def placePreparedOrder(
      prepared: PreparedPredictionOrder,
      reservationId: ReservationId): PredictionOrderView = {
    val now = OffsetDateTime.now().toString
    val order = PredictionOrderView(
      orderId = prepared.orderId,
      punterId = prepared.punterId,
      marketId = prepared.marketId,
      marketTitle = prepared.marketTitle,
      categoryKey = prepared.categoryKey,
      categoryLabel = prepared.categoryLabel,
      outcomeId = prepared.outcomeId,
      outcomeLabel = prepared.outcomeLabel,
      priceCents = prepared.priceCents,
      stakeUsd = prepared.stakeUsd,
      shares = prepared.shares,
      maxPayoutUsd = prepared.maxPayoutUsd,
      maxProfitUsd = prepared.maxProfitUsd,
      status = "open",
      createdAt = now,
      updatedAt = now,
      marketStatus = PredictionCatalog.findMarket(prepared.marketId).map(_.status))
    mutateOrders(_ :+ StoredPredictionOrder(order, reservationId, prepared.walletBet))
    order
  }

  final case class OpenPredictionOrder(
      order: PredictionOrderView,
      reservationId: ReservationId,
      walletBet: Bet)

  final case class SettledPredictionOrder(
      order: PredictionOrderView,
      walletBet: Bet)

  def findOpenOwnedOrder(punterId: String, orderId: String): Either[PredictionOrderFailure, OpenPredictionOrder] =
    findOwnedStoredOrder(punterId, orderId).flatMap { order =>
      Either.cond(
        order.order.status == "open",
        OpenPredictionOrder(order.order, order.reservationId, order.walletBet),
        OrderNotCancellable)
    }

  def cancelStoredOrder(
      orderId: String,
      reason: Option[String] = None,
      performedBy: Option[String] = None): PredictionOrderView =
    settleStoredOrder(orderId, "cancelled", reason, performedBy)

  def settleStoredOrder(
      orderId: String,
      status: String,
      reason: Option[String] = None,
      performedBy: Option[String] = None): PredictionOrderView = {
    val settledAt = OffsetDateTime.now().toString
    mutateOrders(_.map { current =>
      if (current.order.orderId == orderId) {
        val priorSnapshot =
          if (status.trim.equalsIgnoreCase("resettled") && isSettledStatus(current.order.status))
            (
              current.previousSettledAt.orElse(Some(current.order.updatedAt)),
              current.previousSettledAmountUsd.orElse(Some(currentSettlementAmount(current))),
              current.previousSettlementStatus.orElse(Some(current.order.status)))
          else
            (current.previousSettledAt, current.previousSettledAmountUsd, current.previousSettlementStatus)

        current.copy(
          order = current.order.copy(
            status = status,
            updatedAt = settledAt,
            settlementReason = reason.orElse(current.order.settlementReason),
            settlementActor = performedBy.orElse(current.order.settlementActor),
            settledAt = Some(settledAt),
            previousSettlementStatus = priorSnapshot._3,
            marketStatus = PredictionCatalog.findMarket(current.order.marketId).map(_.status).orElse(current.order.marketStatus)),
          settlementReason = reason.orElse(current.settlementReason),
          settlementActor = performedBy.orElse(current.settlementActor),
          previousSettledAt = priorSnapshot._1,
          previousSettledAmountUsd = priorSnapshot._2,
          previousSettlementStatus = priorSnapshot._3)
      } else {
        current
      }
    })
    findOrder(orderId).get
  }

  def listForPunter(
      punterId: String,
      status: Option[String] = None,
      categoryKey: Option[String] = None): Seq[PredictionOrderView] =
    filterOrders(ordersRef.get(), Some(punterId), status, categoryKey, None)

  def listSettledOrdersForMarket(marketId: String): Seq[SettledPredictionOrder] =
    ordersRef.get().collect {
      case stored
          if stored.order.marketId == marketId &&
            Set("won", "lost").contains(stored.order.status.trim.toLowerCase) =>
        SettledPredictionOrder(stored.order, stored.walletBet)
    }

  def listAll(
      punterId: Option[String] = None,
      status: Option[String] = None,
      categoryKey: Option[String] = None,
      marketId: Option[String] = None): Seq[PredictionOrderView] =
    filterOrders(ordersRef.get(), punterId, status, categoryKey, marketId)

  def findOrder(orderId: String): Option[PredictionOrderView] =
    ordersRef.get().find(_.order.orderId == orderId).map(_.order)

  def settlementReason(orderId: String): Option[String] =
    ordersRef.get().find(_.order.orderId == orderId).flatMap(_.settlementReason)

  def settlementActor(orderId: String): Option[String] =
    ordersRef.get().find(_.order.orderId == orderId).flatMap(_.settlementActor)

  def previousSettledAt(orderId: String): Option[String] =
    ordersRef.get().find(_.order.orderId == orderId).flatMap(_.previousSettledAt)

  def previousSettledAmountUsd(orderId: String): Option[BigDecimal] =
    ordersRef.get().find(_.order.orderId == orderId).flatMap(_.previousSettledAmountUsd)

  def previousSettlementStatus(orderId: String): Option[String] =
    ordersRef.get().find(_.order.orderId == orderId).flatMap(_.previousSettlementStatus)

  def summary: PredictionOrderSummary = {
    val orders = ordersRef.get().map(_.order)
    PredictionOrderSummary(
      totalOrders = orders.size,
      openOrders = orders.count(_.status == "open"),
      cancelledOrders = orders.count(_.status == "cancelled"))
  }

  private def filterOrders(
      orders: Vector[StoredPredictionOrder],
      punterId: Option[String],
      status: Option[String],
      categoryKey: Option[String],
      marketId: Option[String]): Seq[PredictionOrderView] = {
    val normalizedStatus = normalize(status)
    val normalizedCategory = normalize(categoryKey)
    val normalizedMarketId = normalize(marketId)
    val normalizedPunterId = normalize(punterId)

    orders
      .map(_.order)
      .filter { order =>
        normalizedPunterId.forall(_ == order.punterId.toLowerCase) &&
        normalizedStatus.forall(statusMatches(order.status, _)) &&
        normalizedCategory.forall(_ == order.categoryKey.toLowerCase) &&
        normalizedMarketId.forall(_ == order.marketId.toLowerCase)
      }
      .sortBy(_.createdAt)(Ordering.String.reverse)
  }

  private def statusMatches(orderStatus: String, normalizedFilter: String): Boolean = {
    val normalizedOrderStatus = orderStatus.trim.toLowerCase
    normalizedFilter match {
      case "settled" =>
        Set("won", "lost", "voided", "pushed", "resettled").contains(normalizedOrderStatus)
      case other =>
        normalizedOrderStatus == other
    }
  }

  private def findOwnedStoredOrder(
      punterId: String,
      orderId: String): Either[PredictionOrderFailure, StoredPredictionOrder] =
    ordersRef.get().find(order => order.order.orderId == orderId && order.order.punterId == punterId).toRight(OrderNotFound)

  private def mutateOrders(update: Vector[StoredPredictionOrder] => Vector[StoredPredictionOrder]): Unit = {
    var updated = false
    while (!updated) {
      val current = ordersRef.get()
      updated = ordersRef.compareAndSet(current, update(current))
    }
  }

  private def impliedOdds(priceCents: Int): Odds = {
    val normalizedPrice = BigDecimal(priceCents) / 100
    Odds(BigDecimal(1) / normalizedPrice)
  }

  private def isMarketOpen(status: String): Boolean = {
    val normalizedStatus = status.trim.toLowerCase
    normalizedStatus == "open" || normalizedStatus == "live"
  }

  private def isSettledStatus(status: String): Boolean =
    Set("won", "lost", "voided", "pushed", "cancelled", "resettled").contains(status.trim.toLowerCase)

  private def currentSettlementAmount(order: StoredPredictionOrder): BigDecimal =
    order.order.status.trim.toLowerCase match {
      case "won"       => order.order.maxPayoutUsd
      case "voided"    => order.order.stakeUsd
      case "pushed"    => order.order.stakeUsd
      case "cancelled" => order.order.stakeUsd
      case "resettled" => order.order.maxPayoutUsd
      case _           => BigDecimal(0)
    }

  private def normalize(value: Option[String]): Option[String] =
    value.map(_.trim.toLowerCase).filter(_.nonEmpty)
}
