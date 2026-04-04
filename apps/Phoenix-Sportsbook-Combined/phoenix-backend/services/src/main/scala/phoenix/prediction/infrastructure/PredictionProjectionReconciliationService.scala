package phoenix.prediction.infrastructure

import java.nio.charset.StandardCharsets
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import io.circe.Codec
import io.circe.Json
import io.circe.JsonObject
import io.circe.generic.semiauto._
import io.circe.syntax._
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.core.JsonFormats._
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.prediction.infrastructure.SlickPredictionReadModelService._

final case class PredictionProjectionEventPayload(
    market: Option[PredictionMarketRow] = None,
    outcomes: Seq[PredictionOutcomeRow] = Seq.empty,
    order: Option[PredictionOrderRow] = None,
    settlement: Option[PredictionSettlementRow] = None,
    overrideRow: Option[PredictionOpsOverrideRow] = None)

final case class PredictionProjectionReplayState(
    markets: Map[UUID, PredictionMarketRow],
    outcomes: Map[UUID, PredictionOutcomeRow],
    orders: Map[UUID, PredictionOrderRow],
    settlements: Map[UUID, PredictionSettlementRow],
    overrides: Map[UUID, PredictionOpsOverrideRow])

object PredictionProjectionReplayState {
  val empty: PredictionProjectionReplayState =
    PredictionProjectionReplayState(Map.empty, Map.empty, Map.empty, Map.empty, Map.empty)
}

final case class PredictionProjectionStateDiff(table: String, key: String, detail: String)

final case class PredictionProjectionReconciliationReport(
    totalEvents: Long,
    replayedCounts: Map[String, Int],
    liveCounts: Map[String, Int],
    matches: Boolean,
    diffs: Seq[PredictionProjectionStateDiff])

object PredictionProjectionReconciliationService {
  final val StreamName = "prediction_projection"
  final val DefaultCheckpointKey = "latest"

  private final val MarketAggregateType = "prediction_market"
  private final val OrderAggregateType = "prediction_order"

  final val MarketSnapshotEventType = "prediction.projection.market.snapshot"
  final val OrderSnapshotEventType = "prediction.projection.order.snapshot"
  final val SettlementSnapshotEventType = "prediction.projection.settlement.snapshot"
  final val OverrideSnapshotEventType = "prediction.projection.override.snapshot"

  object Codecs {
    implicit val marketRowCodec: Codec[PredictionMarketRow] = deriveCodec
    implicit val outcomeRowCodec: Codec[PredictionOutcomeRow] = deriveCodec
    implicit val orderRowCodec: Codec[PredictionOrderRow] = deriveCodec
    implicit val settlementRowCodec: Codec[PredictionSettlementRow] = deriveCodec
    implicit val overrideRowCodec: Codec[PredictionOpsOverrideRow] = deriveCodec
    implicit val payloadCodec: Codec[PredictionProjectionEventPayload] = deriveCodec
  }

  def replayStateFromEvents(events: Seq[PredictionAuditEventLogRow]): PredictionProjectionReplayState = {
    import Codecs._

    ordered(events).foldLeft(PredictionProjectionReplayState.empty) { (state, event) =>
      event.eventPayload.as[PredictionProjectionEventPayload].fold(
        _ => state,
        payload =>
          event.eventType match {
            case MarketSnapshotEventType =>
              payload.market.fold(state) { market =>
                state.copy(
                  markets = state.markets.updated(market.id, normalize(market)),
                  outcomes = state.outcomes ++ payload.outcomes.map(outcome => outcome.id -> normalize(outcome)))
              }
            case OrderSnapshotEventType =>
              payload.order.fold(state)(order => state.copy(orders = state.orders.updated(order.id, normalize(order))))
            case SettlementSnapshotEventType =>
              payload.settlement.fold(state)(settlement =>
                state.copy(settlements = state.settlements.updated(settlement.id, normalize(settlement))))
            case OverrideSnapshotEventType =>
              payload.overrideRow.fold(state)(row => state.copy(overrides = state.overrides.updated(row.id, normalize(row))))
            case _ => state
          })
    }
  }

  def counts(state: PredictionProjectionReplayState): Map[String, Int] =
    Map(
      "markets" -> state.markets.size,
      "outcomes" -> state.outcomes.size,
      "orders" -> state.orders.size,
      "settlements" -> state.settlements.size,
      "overrides" -> state.overrides.size)

  def compare(
      expected: PredictionProjectionReplayState,
      actual: PredictionProjectionReplayState): Seq[PredictionProjectionStateDiff] = {
    compareTable[PredictionMarketRow]("markets", expected.markets, actual.markets, row => row.marketKey) ++
      compareTable[PredictionOutcomeRow]("outcomes", expected.outcomes, actual.outcomes, row => s"${row.marketId}:${row.outcomeKey}") ++
      compareTable[PredictionOrderRow]("orders", expected.orders, actual.orders, row => row.clientOrderId) ++
      compareTable[PredictionSettlementRow]("settlements", expected.settlements, actual.settlements, row => row.marketId.toString) ++
      compareTable[PredictionOpsOverrideRow]("overrides", expected.overrides, actual.overrides, row => row.id.toString)
  }

  private def ordered(events: Seq[PredictionAuditEventLogRow]): Seq[PredictionAuditEventLogRow] =
    events.sortBy(event =>
      (
        event.emittedAt.toInstant.toEpochMilli,
        event.createdAt.toInstant.toEpochMilli,
        event.aggregateType,
        event.aggregateId,
        event.sequenceNo
      ))

  private def normalize(row: PredictionMarketRow): PredictionMarketRow =
    row.copy(
      opensAt = utc(row.opensAt),
      closesAt = utc(row.closesAt),
      resolvesAt = utc(row.resolvesAt),
      metadata = canonicalJson(row.metadata),
      createdAt = utc(row.createdAt),
      updatedAt = utc(row.updatedAt))

  private def normalize(row: PredictionOutcomeRow): PredictionOutcomeRow =
    row.copy(createdAt = utc(row.createdAt), metadata = canonicalJson(row.metadata))

  private def normalize(row: PredictionOrderRow): PredictionOrderRow =
    row.copy(
      submittedAt = utc(row.submittedAt),
      metadata = canonicalJson(row.metadata),
      createdAt = utc(row.createdAt),
      updatedAt = utc(row.updatedAt))

  private def normalize(row: PredictionSettlementRow): PredictionSettlementRow =
    row.copy(
      settledAt = row.settledAt.map(utc),
      createdAt = utc(row.createdAt),
      updatedAt = utc(row.updatedAt))

  private def normalize(row: PredictionOpsOverrideRow): PredictionOpsOverrideRow =
    row.copy(performedAt = utc(row.performedAt), overridePayload = canonicalJson(row.overridePayload))

  private def utc(value: OffsetDateTime): OffsetDateTime =
    value.withOffsetSameInstant(ZoneOffset.UTC)

  private def canonicalJson(json: Json): Json =
    json.arrayOrObject(
      json,
      values => Json.fromValues(values.map(canonicalJson)),
      fields =>
        Json.fromJsonObject(JsonObject.fromIterable(fields.toIterable.toSeq.sortBy(_._1).map {
          case (key, value) => key -> canonicalJson(value)
        })))

  private def compareTable[A](
      table: String,
      expected: Map[UUID, A],
      actual: Map[UUID, A],
      keyOf: A => String): Seq[PredictionProjectionStateDiff] = {
    val ids = expected.keySet ++ actual.keySet
    ids.toSeq.sorted.map { id =>
      (expected.get(id), actual.get(id)) match {
        case (Some(left), Some(right)) if left != right =>
          Some(PredictionProjectionStateDiff(table, keyOf(left), "state mismatch"))
        case (Some(left), None) =>
          Some(PredictionProjectionStateDiff(table, keyOf(left), "missing from live projection"))
        case (None, Some(right)) =>
          Some(PredictionProjectionStateDiff(table, keyOf(right), "missing from replay state"))
        case _ => None
      }
    }.flatten
  }

  private[infrastructure] def checkpointId(checkpointKey: String): UUID =
    UUID.nameUUIDFromBytes(s"$StreamName::$checkpointKey".getBytes(StandardCharsets.UTF_8))

  private[infrastructure] def marketAggregateId(marketKey: String): String = marketKey
  private[infrastructure] def orderAggregateId(orderId: String): String = orderId
  private[infrastructure] def marketAggregateType: String = MarketAggregateType
  private[infrastructure] def orderAggregateType: String = OrderAggregateType
}

final class PredictionProjectionEventStore {
  import PredictionProjectionReconciliationService._
  import PredictionProjectionReconciliationService.Codecs._

  private implicit val dbioExecutionContext: ExecutionContext = ExecutionContext.parasitic

  private object Tables {
    val auditEventLog = TableQuery[PredictionAuditEventLogTable]
  }

  def appendMarketSnapshotTx(
      market: PredictionMarketRow,
      outcomes: Seq[PredictionOutcomeRow],
      emittedAt: OffsetDateTime): DBIO[Unit] =
    appendEventTx(
      aggregateType = marketAggregateType,
      aggregateId = marketAggregateId(market.marketKey),
      eventType = MarketSnapshotEventType,
      payload = PredictionProjectionEventPayload(market = Some(market), outcomes = outcomes),
      emittedAt = emittedAt)

  def appendOrderSnapshotTx(order: PredictionOrderRow, emittedAt: OffsetDateTime): DBIO[Unit] =
    appendEventTx(
      aggregateType = orderAggregateType,
      aggregateId = orderAggregateId(order.clientOrderId),
      eventType = OrderSnapshotEventType,
      payload = PredictionProjectionEventPayload(order = Some(order)),
      emittedAt = emittedAt)

  def appendSettlementSnapshotTx(
      marketKey: String,
      settlement: PredictionSettlementRow,
      emittedAt: OffsetDateTime): DBIO[Unit] =
    appendEventTx(
      aggregateType = marketAggregateType,
      aggregateId = marketAggregateId(marketKey),
      eventType = SettlementSnapshotEventType,
      payload = PredictionProjectionEventPayload(settlement = Some(settlement)),
      emittedAt = emittedAt)

  def appendOverrideSnapshotTx(
      marketKey: String,
      overrideRow: PredictionOpsOverrideRow,
      emittedAt: OffsetDateTime): DBIO[Unit] =
    appendEventTx(
      aggregateType = marketAggregateType,
      aggregateId = marketAggregateId(marketKey),
      eventType = OverrideSnapshotEventType,
      payload = PredictionProjectionEventPayload(overrideRow = Some(overrideRow)),
      emittedAt = emittedAt)

  private def appendEventTx(
      aggregateType: String,
      aggregateId: String,
      eventType: String,
      payload: PredictionProjectionEventPayload,
      emittedAt: OffsetDateTime): DBIO[Unit] =
    for {
      currentMax <- Tables.auditEventLog
        .filter(row => row.aggregateType === aggregateType && row.aggregateId === aggregateId)
        .map(_.sequenceNo)
        .max
        .result
      _ <- Tables.auditEventLog += PredictionAuditEventLogRow(
        id = UUID.randomUUID(),
        aggregateType = aggregateType,
        aggregateId = aggregateId,
        eventType = eventType,
        sequenceNo = currentMax.getOrElse(0L) + 1L,
        schemaVersion = 1,
        eventPayload = payload.asJson,
        emittedAt = emittedAt,
        createdAt = emittedAt)
    } yield ()
}

final class PredictionProjectionReconciliationService(dbConfig: DatabaseConfig[JdbcProfile]) {
  import PredictionProjectionReconciliationService._

  private object Tables {
    val markets = TableQuery[PredictionMarketsTable]
    val outcomes = TableQuery[PredictionOutcomesTable]
    val orders = TableQuery[PredictionOrdersTable]
    val settlements = TableQuery[PredictionSettlementsTable]
    val opsOverrides = TableQuery[PredictionOpsOverridesTable]
    val auditEventLog = TableQuery[PredictionAuditEventLogTable]
    val replayCheckpoints = TableQuery[PredictionReplayCheckpointsTable]
  }

  private val db = dbConfig.db

  def verify()(implicit ec: ExecutionContext): Future[PredictionProjectionReconciliationReport] =
    for {
      events <- loadEvents()
      live <- loadLiveState()
    } yield {
      val replayed = replayStateFromEvents(events)
      val diffs = compare(replayed, live)
      PredictionProjectionReconciliationReport(
        totalEvents = events.size.toLong,
        replayedCounts = counts(replayed),
        liveCounts = counts(live),
        matches = diffs.isEmpty,
        diffs = diffs.take(50))
    }

  def rebuild(checkpointKey: String = DefaultCheckpointKey)(implicit
      ec: ExecutionContext): Future[PredictionProjectionReconciliationReport] =
    loadEvents().flatMap { events =>
      val replayed = replayStateFromEvents(events)
      val now = OffsetDateTime.now()
      val checkpoint = PredictionReplayCheckpointRow(
        id = checkpointId(checkpointKey),
        streamName = StreamName,
        checkpointKey = checkpointKey,
        lastSequenceNo = events.size.toLong,
        metadata = Json.obj(
          "replayedAt" -> Json.fromString(now.toString),
          "eventCount" -> Json.fromLong(events.size.toLong)),
        updatedAt = now)

      val dbio = for {
        _ <- sqlu"delete from prediction_positions"
        _ <- sqlu"delete from prediction_trades"
        _ <- Tables.opsOverrides.delete
        _ <- Tables.settlements.delete
        _ <- Tables.orders.delete
        _ <- Tables.outcomes.delete
        _ <- Tables.markets.delete
        _ <- DBIO.sequence(replayed.markets.values.toSeq.sortBy(_.marketKey).map(Tables.markets.insertOrUpdate))
        _ <- DBIO.sequence(replayed.outcomes.values.toSeq.sortBy(row => (row.marketId.toString, row.outcomeIndex)).map(Tables.outcomes.insertOrUpdate))
        _ <- DBIO.sequence(replayed.orders.values.toSeq.sortBy(_.clientOrderId).map(Tables.orders.insertOrUpdate))
        _ <- DBIO.sequence(replayed.settlements.values.toSeq.sortBy(_.marketId.toString).map(Tables.settlements.insertOrUpdate))
        _ <- DBIO.sequence(replayed.overrides.values.toSeq.sortBy(row => (row.marketId.map(_.toString).getOrElse(""), row.performedAt.toString)).map(Tables.opsOverrides.insertOrUpdate))
        _ <- Tables.replayCheckpoints.insertOrUpdate(checkpoint)
      } yield ()

      db.run(dbio.transactionally).flatMap(_ =>
        loadLiveState().map { live =>
          val diffs = compare(replayed, live)
          PredictionProjectionReconciliationReport(
            totalEvents = events.size.toLong,
            replayedCounts = counts(replayed),
            liveCounts = counts(live),
            matches = diffs.isEmpty,
            diffs = diffs.take(50))
        })
    }

  private def loadEvents(): Future[Seq[PredictionAuditEventLogRow]] =
    db.run(
      Tables.auditEventLog
        .filter(_.eventType like "prediction.projection.%")
        .result)

  private def loadLiveState()(implicit ec: ExecutionContext): Future[PredictionProjectionReplayState] = {
    val dbio = for {
      markets <- Tables.markets.result
      outcomes <- Tables.outcomes.result
      orders <- Tables.orders.result
      settlements <- Tables.settlements.result
      overrides <- Tables.opsOverrides.result
    } yield PredictionProjectionReplayState(
      markets = markets.map(row => row.id -> normalize(row)).toMap,
      outcomes = outcomes.map(row => row.id -> normalize(row)).toMap,
      orders = orders.map(row => row.id -> normalize(row)).toMap,
      settlements = settlements.map(row => row.id -> normalize(row)).toMap,
      overrides = overrides.map(row => row.id -> normalize(row)).toMap)

    db.run(dbio)
  }
}
