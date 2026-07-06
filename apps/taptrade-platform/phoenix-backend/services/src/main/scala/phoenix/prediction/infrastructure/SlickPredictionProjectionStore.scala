package phoenix.prediction.infrastructure

import java.nio.charset.StandardCharsets
import java.time.OffsetDateTime
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.syntax.either._
import io.circe._
import io.circe.syntax._
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.auditlog.domain.PredictionMarketLifecycleEntry
import phoenix.auditlog.infrastructure.AuditLogPersistenceSupport
import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.prediction.infrastructure.SlickPredictionReadModelService._
import phoenix.prediction.infrastructure.http._
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.domain.Funds.RealMoney

final class SlickPredictionProjectionStore(dbConfig: DatabaseConfig[JdbcProfile]) {
  import Codecs._
  import dbConfig.db

  private object Tables {
    val markets = TableQuery[PredictionMarketsTable]
    val outcomes = TableQuery[PredictionOutcomesTable]
    val orders = TableQuery[PredictionOrdersTable]
    val settlements = TableQuery[PredictionSettlementsTable]
    val opsOverrides = TableQuery[PredictionOpsOverridesTable]
  }

  private val queryService = new SlickPredictionQueryPersistenceService(dbConfig)
  private val eventStore = new PredictionProjectionEventStore
  private val seedMarkets = PredictionCatalog.markets

  val transactionalLifecycleAudit: Boolean = true

  def syncSeedData()(implicit ec: ExecutionContext): Future[Unit] = {
    val syncedAt = OffsetDateTime.now()
    val seedIds = seedMarkets.map(_.marketId)
    val seedMarketDbIds = seedMarkets.map(seed => deterministicUuid("prediction-market", seed.marketId))

    val dbio = for {
      existingMarkets <- Tables.markets.filter(_.marketKey.inSetBind(seedIds)).result
      existingOutcomes <- Tables.outcomes.filter(_.marketId.inSetBind(seedMarketDbIds)).result
      preparedRows = seedMarkets.map { seed =>
        val marketRow = seedMarketRow(seed, existingMarkets.find(_.marketKey == seed.marketId), syncedAt)
        val outcomeRows = seed.outcomes.zipWithIndex.map { case (outcome, outcomeIndex) =>
          seedOutcomeRow(
            seed,
            outcome,
            outcomeIndex,
            existingOutcomes.find(row =>
              row.marketId == deterministicUuid("prediction-market", seed.marketId) && row.outcomeKey == outcome.outcomeId),
            syncedAt)
        }
        (marketRow, outcomeRows)
      }
      _ <- DBIO.sequence(preparedRows.map { case (marketRow, _) =>
        Tables.markets.insertOrUpdate(marketRow)
      })
      _ <- DBIO.sequence(preparedRows.flatMap { case (_, outcomeRows) =>
        outcomeRows.map(Tables.outcomes.insertOrUpdate)
      })
      _ <- DBIO.sequence(preparedRows.map { case (marketRow, outcomeRows) =>
        eventStore.appendMarketSnapshotTx(marketRow, outcomeRows, syncedAt)
      })
    } yield ()

    db.run(dbio.transactionally)
  }

  def prepareOrder(
      punterId: String,
      request: PredictionPlaceOrderRequest)(implicit
      ec: ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.PreparedPredictionOrder]] =
    queryService.marketDetail(request.marketId).flatMap {
      case None => Future.successful(Left(PredictionOrderFailure.MarketNotFound))
      case Some(detail) =>
        queryService.preview(
          PredictionTicketPreviewRequest(
            marketId = request.marketId,
            outcomeId = request.outcomeId,
            stakeUsd = request.stakeUsd)).map { previewResult =>
          for {
            outcome <- detail.market.outcomes.find(_.outcomeId == request.outcomeId).toRight(PredictionOrderFailure.OutcomeNotFound)
            _ <- Either.cond(request.stakeUsd > 0, (), PredictionOrderFailure.InvalidStake)
            _ <- Either.cond(isMarketOpen(detail.market.status), (), PredictionOrderFailure.MarketNotOpen)
            previewResponse <- previewResult.leftMap {
              case "Prediction market not found"     => PredictionOrderFailure.MarketNotFound
              case "Prediction outcome not found"    => PredictionOrderFailure.OutcomeNotFound
              case "Stake must be greater than zero" => PredictionOrderFailure.InvalidStake
              case _                                  => PredictionOrderFailure.MarketNotOpen
            }
          } yield {
            val orderId = s"po-${UUID.randomUUID()}"
            PredictionOrderStore.PreparedPredictionOrder(
              orderId = orderId,
              punterId = punterId,
              marketId = detail.market.marketId,
              marketTitle = detail.market.shortTitle,
              categoryKey = detail.market.categoryKey,
              categoryLabel = detail.market.categoryLabel,
              outcomeId = outcome.outcomeId,
              outcomeLabel = outcome.label,
              priceCents = outcome.priceCents,
              stakeUsd = previewResponse.stakeUsd,
              shares = previewResponse.shares,
              maxPayoutUsd = previewResponse.maxPayoutUsd,
              maxProfitUsd = previewResponse.maxProfitUsd,
              walletBet = Bet(
                betId = BetId(orderId),
                stake = RealMoney(MoneyAmount(previewResponse.stakeUsd)),
                odds = impliedOdds(outcome.priceCents)))
          }
        }
    }

  def placePreparedOrder(
      prepared: PredictionOrderStore.PreparedPredictionOrder,
      reservationId: ReservationId)(implicit ec: ExecutionContext): Future[PredictionOrderView] = {
    val now = OffsetDateTime.now()
    val row = PredictionOrderRow(
      id = deterministicUuid("prediction-order", prepared.orderId),
      marketId = deterministicUuid("prediction-market", prepared.marketId),
      outcomeId = Some(deterministicUuid("prediction-outcome", s"${prepared.marketId}:${prepared.outcomeId}")),
      accountId = prepared.punterId,
      clientOrderId = prepared.orderId,
      side = "buy",
      orderType = "market",
      quantity = roundQuantity(prepared.shares),
      limitPrice = Some(BigDecimal(prepared.priceCents) / 100),
      status = "open",
      submittedAt = now,
      metadata = predictionOrderMetadata(prepared, reservationId).asJson,
      createdAt = now,
      updatedAt = now)

    val dbio = for {
      _ <- Tables.orders.insertOrUpdate(row)
      _ <- eventStore.appendOrderSnapshotTx(row, now)
    } yield ()

    db.run(dbio.transactionally).flatMap(_ => queryService.findOrder(prepared.orderId).map(_.get))
  }

  def findOpenOwnedOrder(
      punterId: String,
      orderId: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionOrderFailure, PredictionOrderStore.OpenPredictionOrder]] =
    loadStoredOrders(orderIds = Some(Set(orderId))).map {
      _.find(order => order.row.clientOrderId == orderId && order.row.accountId == punterId) match {
        case None => Left(PredictionOrderFailure.OrderNotFound)
        case Some(order) if normalizeOrderStatus(order.row.status) != "open" =>
          Left(PredictionOrderFailure.OrderNotCancellable)
        case Some(order) => Right(order.toOpenOrder)
      }
    }

  def listOpenOrdersForMarket(marketId: String)(implicit
      ec: ExecutionContext): Future[Seq[PredictionOrderStore.OpenPredictionOrder]] =
    loadStoredOrders().map(
      _.filter(order => order.market.exists(_.row.marketKey == marketId) && normalizeOrderStatus(order.row.status) == "open")
        .map(_.toOpenOrder))

  def listSettledOrdersForMarket(marketId: String)(implicit
      ec: ExecutionContext): Future[Seq[PredictionOrderStore.SettledPredictionOrder]] =
    loadStoredOrders().map(
      _.filter(order =>
          order.market.exists(_.row.marketKey == marketId) &&
            Set("won", "lost").contains(normalizeOrderStatus(order.row.status)))
        .map(_.toSettledOrder))

  def cancelStoredOrder(orderId: String, reason: Option[String])(implicit
      ec: ExecutionContext): Future[PredictionOrderView] =
    settleStoredOrder(orderId, "cancelled", reason, None)

  def settleStoredOrder(orderId: String, status: String, reason: Option[String], performedBy: Option[String])(implicit
      ec: ExecutionContext): Future[PredictionOrderView] = {
    val now = OffsetDateTime.now()
    updateStoredOrder(orderId, status, now, reason, performedBy)
  }

  def suspendMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    transitionMarket(marketId, performedBy, reason, action = "suspend", nextStatus = "suspended", live = false)

  def openMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    transitionMarket(marketId, performedBy, reason, action = "open", nextStatus = "open", live = false)

  def resolveMarket(
      marketId: String,
      outcomeId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    loadStoredMarket(marketId).flatMap {
      case None => Future.successful(Left(PredictionLifecycleFailure.MarketNotFound))
      case Some(storedMarket) if !storedMarket.outcomes.exists(_.row.outcomeKey == outcomeId) =>
        Future.successful(Left(PredictionLifecycleFailure.OutcomeNotFound))
      case Some(storedMarket) if !canSettle(storedMarket.row.status) =>
        Future.successful(Left(PredictionLifecycleFailure.InvalidTransition))
      case Some(storedMarket) =>
        val now = OffsetDateTime.now()
        val winningOutcomeId = deterministicUuid("prediction-outcome", s"${storedMarket.row.marketKey}:$outcomeId")
        val updatedMarket = updatedMarketRow(storedMarket, status = "resolved", live = false, now)
        val settlementRow =
          PredictionSettlementRow(
            id = deterministicUuid("prediction-settlement", storedMarket.row.marketKey),
            marketId = storedMarket.row.id,
            settlementEventId = None,
            winningOutcomeId = Some(winningOutcomeId),
            status = "resolved",
            settledAt = Some(now),
            notes = Some(reason),
            createdAt = storedMarket.settlement.map(_.createdAt).getOrElse(now),
            updatedAt = now)
        val overrideRow =
          PredictionOpsOverrideRow(
            id = UUID.randomUUID(),
            incidentId = None,
            marketId = Some(storedMarket.row.id),
            overrideType = "resolve",
            overridePayload = PredictionOverridePayload(
              action = "resolve",
              marketStatusBefore = storedMarket.row.status,
              marketStatusAfter = "resolved",
              outcomeId = Some(outcomeId),
              outcomeLabel = storedMarket.outcomes.find(_.row.outcomeKey == outcomeId).map(_.row.displayName)).asJson,
            performedBy = performedBy,
            reason = reason,
            performedAt = now)
        val dbio = for {
          _ <- updateMarketRow(updatedMarket)
          _ <- Tables.settlements.insertOrUpdate(settlementRow)
          _ <- Tables.opsOverrides += overrideRow
          _ <- eventStore.appendMarketSnapshotTx(updatedMarket, storedMarket.outcomes.map(_.row), now)
          _ <- eventStore.appendSettlementSnapshotTx(storedMarket.row.marketKey, settlementRow, now)
          _ <- eventStore.appendOverrideSnapshotTx(storedMarket.row.marketKey, overrideRow, now)
          _ <- AuditLogPersistenceSupport.insertEntry(
            lifecycleAuditEntry(
              action = "prediction.market.resolved",
              storedMarket = storedMarket,
              performedBy = performedBy,
              reason = reason,
              nextStatus = "resolved",
              nextLive = false,
              selectedOutcomeId = Some(outcomeId),
              occurredAt = now))
        } yield ()

        db.run(dbio.transactionally).flatMap(_ => queryService.marketDetail(marketId).map(_.toRight(PredictionLifecycleFailure.MarketNotFound)))
    }

  def resettleMarket(
      marketId: String,
      outcomeId: String,
      performedBy: String,
      reason: String)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    loadStoredMarket(marketId).flatMap {
      case None => Future.successful(Left(PredictionLifecycleFailure.MarketNotFound))
      case Some(storedMarket) if normalizeMarketStatus(storedMarket.row.status) != "resolved" =>
        Future.successful(Left(PredictionLifecycleFailure.InvalidTransition))
      case Some(storedMarket) if !storedMarket.outcomes.exists(_.row.outcomeKey == outcomeId) =>
        Future.successful(Left(PredictionLifecycleFailure.OutcomeNotFound))
      case Some(storedMarket) =>
        val now = OffsetDateTime.now()
        val winningOutcomeId = deterministicUuid("prediction-outcome", s"${storedMarket.row.marketKey}:$outcomeId")
        val updatedMarket = updatedMarketRow(storedMarket, status = "resolved", live = false, now)
        val settlementRow =
          PredictionSettlementRow(
            id = deterministicUuid("prediction-settlement", storedMarket.row.marketKey),
            marketId = storedMarket.row.id,
            settlementEventId = None,
            winningOutcomeId = Some(winningOutcomeId),
            status = "resolved",
            settledAt = Some(now),
            notes = Some(reason),
            createdAt = storedMarket.settlement.map(_.createdAt).getOrElse(now),
            updatedAt = now)
        val overrideRow =
          PredictionOpsOverrideRow(
            id = UUID.randomUUID(),
            incidentId = None,
            marketId = Some(storedMarket.row.id),
            overrideType = "resettle",
            overridePayload = PredictionOverridePayload(
              action = "resettle",
              marketStatusBefore = storedMarket.row.status,
              marketStatusAfter = "resolved",
              outcomeId = Some(outcomeId),
              outcomeLabel = storedMarket.outcomes.find(_.row.outcomeKey == outcomeId).map(_.row.displayName)).asJson,
            performedBy = performedBy,
            reason = reason,
            performedAt = now)
        val dbio = for {
          _ <- updateMarketRow(updatedMarket)
          _ <- Tables.settlements.insertOrUpdate(settlementRow)
          _ <- Tables.opsOverrides += overrideRow
          _ <- eventStore.appendMarketSnapshotTx(updatedMarket, storedMarket.outcomes.map(_.row), now)
          _ <- eventStore.appendSettlementSnapshotTx(storedMarket.row.marketKey, settlementRow, now)
          _ <- eventStore.appendOverrideSnapshotTx(storedMarket.row.marketKey, overrideRow, now)
          _ <- AuditLogPersistenceSupport.insertEntry(
            lifecycleAuditEntry(
              action = "prediction.market.resettled",
              storedMarket = storedMarket,
              performedBy = performedBy,
              reason = reason,
              nextStatus = "resolved",
              nextLive = false,
              selectedOutcomeId = Some(outcomeId),
              occurredAt = now))
        } yield ()

        db.run(dbio.transactionally).flatMap(_ => queryService.marketDetail(marketId).map(_.toRight(PredictionLifecycleFailure.MarketNotFound)))
    }

  def cancelMarket(marketId: String, performedBy: String, reason: String)(implicit
      ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    loadStoredMarket(marketId).flatMap {
      case None => Future.successful(Left(PredictionLifecycleFailure.MarketNotFound))
      case Some(storedMarket) if !canSettle(storedMarket.row.status) =>
        Future.successful(Left(PredictionLifecycleFailure.InvalidTransition))
      case Some(storedMarket) =>
        val now = OffsetDateTime.now()
        val updatedMarket = updatedMarketRow(storedMarket, status = "cancelled", live = false, now)
        val settlementRow =
          PredictionSettlementRow(
            id = deterministicUuid("prediction-settlement", storedMarket.row.marketKey),
            marketId = storedMarket.row.id,
            settlementEventId = None,
            winningOutcomeId = None,
            status = "cancelled",
            settledAt = Some(now),
            notes = Some(reason),
            createdAt = storedMarket.settlement.map(_.createdAt).getOrElse(now),
            updatedAt = now)
        val overrideRow =
          PredictionOpsOverrideRow(
            id = UUID.randomUUID(),
            incidentId = None,
            marketId = Some(storedMarket.row.id),
            overrideType = "cancel",
            overridePayload = PredictionOverridePayload(
              action = "cancel",
              marketStatusBefore = storedMarket.row.status,
              marketStatusAfter = "cancelled",
              outcomeId = None,
              outcomeLabel = None).asJson,
            performedBy = performedBy,
            reason = reason,
            performedAt = now)
        val dbio = for {
          _ <- updateMarketRow(updatedMarket)
          _ <- Tables.settlements.insertOrUpdate(settlementRow)
          _ <- Tables.opsOverrides += overrideRow
          _ <- eventStore.appendMarketSnapshotTx(updatedMarket, storedMarket.outcomes.map(_.row), now)
          _ <- eventStore.appendSettlementSnapshotTx(storedMarket.row.marketKey, settlementRow, now)
          _ <- eventStore.appendOverrideSnapshotTx(storedMarket.row.marketKey, overrideRow, now)
          _ <- AuditLogPersistenceSupport.insertEntry(
            lifecycleAuditEntry(
              action = "prediction.market.cancelled",
              storedMarket = storedMarket,
              performedBy = performedBy,
              reason = reason,
              nextStatus = "cancelled",
              nextLive = false,
              selectedOutcomeId = None,
              occurredAt = now))
        } yield ()

        db.run(dbio.transactionally).flatMap(_ => queryService.marketDetail(marketId).map(_.toRight(PredictionLifecycleFailure.MarketNotFound)))
    }

  private def transitionMarket(
      marketId: String,
      performedBy: String,
      reason: String,
      action: String,
      nextStatus: String,
      live: Boolean)(implicit ec: ExecutionContext): Future[Either[PredictionLifecycleFailure, PredictionMarketDetailResponse]] =
    loadStoredMarket(marketId).flatMap {
      case None => Future.successful(Left(PredictionLifecycleFailure.MarketNotFound))
      case Some(storedMarket) if !canTransition(storedMarket.row.status, nextStatus) =>
        Future.successful(Left(PredictionLifecycleFailure.InvalidTransition))
      case Some(storedMarket) =>
        val now = OffsetDateTime.now()
        val updatedMarket = updatedMarketRow(storedMarket, nextStatus, live, now)
        val overrideRow =
          PredictionOpsOverrideRow(
            id = UUID.randomUUID(),
            incidentId = None,
            marketId = Some(storedMarket.row.id),
            overrideType = action,
            overridePayload = PredictionOverridePayload(
              action = action,
              marketStatusBefore = storedMarket.row.status,
              marketStatusAfter = nextStatus,
              outcomeId = None,
              outcomeLabel = None).asJson,
            performedBy = performedBy,
            reason = reason,
            performedAt = now)
        val dbio = for {
          _ <- updateMarketRow(updatedMarket)
          _ <- Tables.opsOverrides += overrideRow
          _ <- eventStore.appendMarketSnapshotTx(updatedMarket, storedMarket.outcomes.map(_.row), now)
          _ <- eventStore.appendOverrideSnapshotTx(storedMarket.row.marketKey, overrideRow, now)
          _ <- AuditLogPersistenceSupport.insertEntry(
            lifecycleAuditEntry(
              action = lifecycleAuditAction(action),
              storedMarket = storedMarket,
              performedBy = performedBy,
              reason = reason,
              nextStatus = nextStatus,
              nextLive = live,
              selectedOutcomeId = None,
              occurredAt = now))
        } yield ()

        db.run(dbio.transactionally).flatMap(_ => queryService.marketDetail(marketId).map(_.toRight(PredictionLifecycleFailure.MarketNotFound)))
    }

  private def updateStoredOrder(
      orderId: String,
      status: String,
      settledAt: OffsetDateTime,
      reason: Option[String],
      performedBy: Option[String])(implicit
      ec: ExecutionContext): Future[PredictionOrderView] = {
    val targetId = orderId.trim
    val dbio = for {
      existing <- Tables.orders.filter(_.clientOrderId === targetId).result.headOption
      updated <- existing match {
        case None => DBIO.failed(new NoSuchElementException(s"Prediction order [$targetId] not found"))
        case Some(row) =>
          val metadata = decodeOrderMetadata(row.metadata).getOrElse(
            throw new IllegalStateException(s"Prediction order metadata [$targetId] is unreadable"))
          val priorSettledAmount =
            if (status.trim.equalsIgnoreCase("resettled") && isSettledStatus(row.status))
              metadata.previousSettledAmountUsd.orElse(Some(settlementAmount(row.status, metadata)))
            else
              metadata.previousSettledAmountUsd
          val priorSettledAt =
            if (status.trim.equalsIgnoreCase("resettled") && isSettledStatus(row.status))
              metadata.previousSettledAt.orElse(metadata.settledAt).orElse(Some(row.updatedAt.toString))
            else
              metadata.previousSettledAt
          val priorSettlementStatus =
            if (status.trim.equalsIgnoreCase("resettled") && isSettledStatus(row.status))
              metadata.previousSettlementStatus.orElse(Some(normalizeOrderStatus(row.status)))
            else
              metadata.previousSettlementStatus
          val updatedRow = row.copy(
            status = status,
            metadata = metadata.copy(
              settledAt = Some(settledAt.toString),
              settlementReason = reason.orElse(metadata.settlementReason),
              settlementActor = performedBy.orElse(metadata.settlementActor),
              previousSettledAt = priorSettledAt,
              previousSettledAmountUsd = priorSettledAmount,
              previousSettlementStatus = priorSettlementStatus).asJson,
            updatedAt = settledAt)
          for {
            _ <- Tables.orders.insertOrUpdate(updatedRow)
            _ <- eventStore.appendOrderSnapshotTx(updatedRow, settledAt)
          } yield updatedRow
      }
    } yield updated

    db.run(dbio.transactionally).flatMap(_ => queryService.findOrder(targetId).map(_.get))
  }

  private def loadStoredMarket(marketId: String)(implicit ec: ExecutionContext): Future[Option[StoredMarket]] =
    loadStoredMarkets().map(markets => findStoredMarket(markets, marketId))

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

  private def seedMarketRow(
      market: PredictionMarketView,
      existing: Option[PredictionMarketRow],
      syncedAt: OffsetDateTime): PredictionMarketRow = {
    val existingMetadata = existing.flatMap(row => decodeMarketMetadata(row.metadata))
    val preservedStatus = normalizeMarketStatus(existing.map(_.status).getOrElse(market.status))
    val preservedLive = if (canRemainLive(preservedStatus)) existingMetadata.map(_.live).getOrElse(market.live) else false

    PredictionMarketRow(
      id = deterministicUuid("prediction-market", market.marketId),
      marketKey = market.marketId,
      marketType = "binary",
      templateId = existing.flatMap(_.templateId),
      instrumentId = existing.flatMap(_.instrumentId),
      status = preservedStatus,
      opensAt = existing.map(_.opensAt).getOrElse(OffsetDateTime.parse(market.closesAt).minusDays(30)),
      closesAt = OffsetDateTime.parse(market.closesAt),
      resolvesAt = OffsetDateTime.parse(market.resolvesAt),
      settlementSourceKey = existing.map(_.settlementSourceKey).getOrElse(market.marketId),
      metadata = PredictionMarketMetadata(
        source = "phoenix-seed-catalog",
        slug = market.slug,
        title = market.title,
        shortTitle = market.shortTitle,
        categoryKey = market.categoryKey,
        categoryLabel = market.categoryLabel,
        featured = market.featured,
        live = preservedLive,
        volumeUsd = market.volumeUsd,
        liquidityUsd = market.liquidityUsd,
        participants = market.participants,
        summary = market.summary,
        insight = market.insight,
        rules = market.rules,
        tags = market.tags,
        resolutionSource = market.resolutionSource,
        heroMetricLabel = market.heroMetricLabel,
        heroMetricValue = market.heroMetricValue,
        probabilityPercent = market.probabilityPercent,
        priceChangePercent = market.priceChangePercent,
        relatedMarketIds = market.relatedMarketIds).asJson,
      createdAt = existing.map(_.createdAt).getOrElse(syncedAt),
      updatedAt = syncedAt)
  }

  private def seedOutcomeRow(
      market: PredictionMarketView,
      outcome: PredictionOutcomeView,
      outcomeIndex: Int,
      existing: Option[PredictionOutcomeRow],
      syncedAt: OffsetDateTime): PredictionOutcomeRow =
    PredictionOutcomeRow(
      id = deterministicUuid("prediction-outcome", s"${market.marketId}:${outcome.outcomeId}"),
      marketId = deterministicUuid("prediction-market", market.marketId),
      outcomeKey = outcome.outcomeId,
      displayName = outcome.label,
      outcomeIndex = outcomeIndex,
      metadata = PredictionOutcomeMetadata(outcome.priceCents, outcome.change1d).asJson,
      createdAt = existing.map(_.createdAt).getOrElse(syncedAt))

  private def predictionOrderMetadata(
      prepared: PredictionOrderStore.PreparedPredictionOrder,
      reservationId: ReservationId): PredictionOrderMetadata =
    PredictionOrderMetadata(
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
      reservationId = reservationId.unwrap,
      settledAt = None,
      settlementReason = None,
      settlementActor = None,
      previousSettledAt = None,
      previousSettledAmountUsd = None,
      previousSettlementStatus = None)

  private def lifecycleAuditAction(action: String): String =
    action.trim.toLowerCase match {
      case "suspend" => "prediction.market.suspended"
      case "open"    => "prediction.market.reopened"
      case other      => s"prediction.market.${other}d"
    }

  private def lifecycleAuditEntry(
      action: String,
      storedMarket: StoredMarket,
      performedBy: String,
      reason: String,
      nextStatus: String,
      nextLive: Boolean,
      selectedOutcomeId: Option[String],
      occurredAt: OffsetDateTime): PredictionMarketLifecycleEntry =
    PredictionMarketLifecycleEntry(
      action = action,
      actorId = performedBy,
      targetId = storedMarket.row.marketKey,
      product = "prediction",
      details = reason,
      occurredAt = occurredAt,
      dataBefore = lifecycleAuditSnapshot(
        storedMarket = storedMarket,
        status = normalizeMarketStatus(storedMarket.row.status),
        live = storedMarket.metadata.live && normalizeMarketStatus(storedMarket.row.status) == "live",
        selectedOutcomeId = selectedOutcomeId),
      dataAfter = lifecycleAuditSnapshot(
        storedMarket = storedMarket,
        status = normalizeMarketStatus(nextStatus),
        live = nextLive,
        selectedOutcomeId = selectedOutcomeId),
      createdAt = occurredAt)

  private def lifecycleAuditSnapshot(
      storedMarket: StoredMarket,
      status: String,
      live: Boolean,
      selectedOutcomeId: Option[String]): Map[String, String] = {
    val selectedOutcomeFields =
      selectedOutcomeId
        .flatMap(outcomeId =>
          storedMarket.outcomes.find(_.row.outcomeKey == outcomeId).map { outcome =>
            Map(
              "outcomeId" -> outcome.row.outcomeKey,
              "outcomeLabel" -> outcome.row.displayName)
          })
        .getOrElse(Map.empty[String, String])

    Map(
      "marketId" -> storedMarket.row.marketKey,
      "marketTitle" -> storedMarket.metadata.shortTitle,
      "status" -> status,
      "live" -> live.toString,
      "featured" -> storedMarket.metadata.featured.toString) ++ selectedOutcomeFields
  }

  private def updatedMarketRow(
      storedMarket: StoredMarket,
      status: String,
      live: Boolean,
      now: OffsetDateTime): PredictionMarketRow = {
    val updatedMetadata = storedMarket.metadata.copy(live = live && canRemainLive(status))
    storedMarket.row.copy(status = status, metadata = updatedMetadata.asJson, updatedAt = now)
  }

  private def updateMarketRow(row: PredictionMarketRow): DBIO[Int] =
    Tables.markets.insertOrUpdate(row)

  private def roundQuantity(value: BigDecimal): BigDecimal =
    value.setScale(8, BigDecimal.RoundingMode.HALF_UP)

  private def impliedOdds(priceCents: Int): Odds = Odds(BigDecimal(1) / (BigDecimal(priceCents) / 100))

  private def isSettledStatus(status: String): Boolean =
    Set("won", "lost", "voided", "pushed", "cancelled", "resettled").contains(normalizeOrderStatus(status))

  private def settlementAmount(status: String, metadata: PredictionOrderMetadata): BigDecimal =
    normalizeOrderStatus(status) match {
      case "won"       => metadata.maxPayoutUsd
      case "voided"    => metadata.stakeUsd
      case "pushed"    => metadata.stakeUsd
      case "cancelled" => metadata.stakeUsd
      case "resettled" => metadata.maxPayoutUsd
      case _            => BigDecimal(0)
    }

  private def normalizeMarketStatus(status: String): String = status.trim.toLowerCase

  private def normalizeOrderStatus(status: String): String = status.trim.toLowerCase

  private def isMarketOpen(status: String): Boolean = {
    val normalizedStatus = normalizeMarketStatus(status)
    normalizedStatus == "open" || normalizedStatus == "live"
  }

  private def canRemainLive(status: String): Boolean = {
    val normalizedStatus = normalizeMarketStatus(status)
    normalizedStatus == "open" || normalizedStatus == "live"
  }

  private def canTransition(currentStatus: String, nextStatus: String): Boolean = {
    val current = normalizeMarketStatus(currentStatus)
    val next = normalizeMarketStatus(nextStatus)
    (current, next) match {
      case (status, requested) if status == requested => true
      case ("open" | "live", "suspended")         => true
      case ("suspended", "open")                   => true
      case _                                          => false
    }
  }

  private def canSettle(status: String): Boolean = {
    val normalized = normalizeMarketStatus(status)
    normalized == "open" || normalized == "live" || normalized == "suspended"
  }

  private def deterministicUuid(namespace: String, key: String): UUID =
    UUID.nameUUIDFromBytes(s"$namespace::$key".getBytes(StandardCharsets.UTF_8))

  private def decodeMarketMetadata(json: Json): Option[PredictionMarketMetadata] =
    json.as[PredictionMarketMetadata].toOption

  private def decodeOutcomeMetadata(json: Json): Option[PredictionOutcomeMetadata] =
    json.as[PredictionOutcomeMetadata].toOption

  private def decodeOrderMetadata(json: Json): Option[PredictionOrderMetadata] =
    json.as[PredictionOrderMetadata].toOption

}
