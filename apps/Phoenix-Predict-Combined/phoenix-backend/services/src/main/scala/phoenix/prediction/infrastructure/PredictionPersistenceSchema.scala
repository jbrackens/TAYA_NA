package phoenix.prediction.infrastructure

import java.time.OffsetDateTime
import java.util.UUID

import io.circe.Json
import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.prediction.infrastructure.SlickPredictionReadModelService._

final case class PredictionAuditEventLogRow(
    id: UUID,
    aggregateType: String,
    aggregateId: String,
    eventType: String,
    sequenceNo: Long,
    schemaVersion: Int,
    eventPayload: Json,
    emittedAt: OffsetDateTime,
    createdAt: OffsetDateTime)

final case class PredictionReplayCheckpointRow(
    id: UUID,
    streamName: String,
    checkpointKey: String,
    lastSequenceNo: Long,
    metadata: Json,
    updatedAt: OffsetDateTime)

private[infrastructure] final class PredictionMarketsTable(tag: Tag)
    extends Table[PredictionMarketRow](tag, "prediction_markets") {
  def id = column[UUID]("id", O.PrimaryKey)
  def marketKey = column[String]("market_key")
  def marketType = column[String]("market_type")
  def templateId = column[Option[UUID]]("template_id")
  def instrumentId = column[Option[UUID]]("instrument_id")
  def status = column[String]("status")
  def opensAt = column[OffsetDateTime]("opens_at")
  def closesAt = column[OffsetDateTime]("closes_at")
  def resolvesAt = column[OffsetDateTime]("resolves_at")
  def settlementSourceKey = column[String]("settlement_source_key")
  def metadata = column[Json]("metadata")
  def createdAt = column[OffsetDateTime]("created_at")
  def updatedAt = column[OffsetDateTime]("updated_at")

  override def * : ProvenShape[PredictionMarketRow] =
    (id, marketKey, marketType, templateId, instrumentId, status, opensAt, closesAt, resolvesAt, settlementSourceKey, metadata, createdAt, updatedAt)
      .mapTo[PredictionMarketRow]
}

private[infrastructure] final class PredictionOutcomesTable(tag: Tag)
    extends Table[PredictionOutcomeRow](tag, "prediction_outcomes") {
  def id = column[UUID]("id", O.PrimaryKey)
  def marketId = column[UUID]("market_id")
  def outcomeKey = column[String]("outcome_key")
  def displayName = column[String]("display_name")
  def outcomeIndex = column[Int]("outcome_index")
  def metadata = column[Json]("metadata")
  def createdAt = column[OffsetDateTime]("created_at")

  override def * : ProvenShape[PredictionOutcomeRow] =
    (id, marketId, outcomeKey, displayName, outcomeIndex, metadata, createdAt).mapTo[PredictionOutcomeRow]
}

private[infrastructure] final class PredictionOrdersTable(tag: Tag)
    extends Table[PredictionOrderRow](tag, "prediction_orders") {
  def id = column[UUID]("id", O.PrimaryKey)
  def marketId = column[UUID]("market_id")
  def outcomeId = column[Option[UUID]]("outcome_id")
  def accountId = column[String]("account_id")
  def clientOrderId = column[String]("client_order_id")
  def side = column[String]("side")
  def orderType = column[String]("order_type")
  def quantity = column[BigDecimal]("quantity")
  def limitPrice = column[Option[BigDecimal]]("limit_price")
  def status = column[String]("status")
  def submittedAt = column[OffsetDateTime]("submitted_at")
  def metadata = column[Json]("metadata")
  def createdAt = column[OffsetDateTime]("created_at")
  def updatedAt = column[OffsetDateTime]("updated_at")

  override def * : ProvenShape[PredictionOrderRow] =
    (id, marketId, outcomeId, accountId, clientOrderId, side, orderType, quantity, limitPrice, status, submittedAt, metadata, createdAt, updatedAt)
      .mapTo[PredictionOrderRow]
}

private[infrastructure] final class PredictionSettlementsTable(tag: Tag)
    extends Table[PredictionSettlementRow](tag, "prediction_settlements") {
  def id = column[UUID]("id", O.PrimaryKey)
  def marketId = column[UUID]("market_id")
  def settlementEventId = column[Option[UUID]]("settlement_event_id")
  def winningOutcomeId = column[Option[UUID]]("winning_outcome_id")
  def status = column[String]("status")
  def settledAt = column[Option[OffsetDateTime]]("settled_at")
  def notes = column[Option[String]]("notes")
  def createdAt = column[OffsetDateTime]("created_at")
  def updatedAt = column[OffsetDateTime]("updated_at")

  override def * : ProvenShape[PredictionSettlementRow] =
    (id, marketId, settlementEventId, winningOutcomeId, status, settledAt, notes, createdAt, updatedAt)
      .mapTo[PredictionSettlementRow]
}

private[infrastructure] final class PredictionOpsOverridesTable(tag: Tag)
    extends Table[PredictionOpsOverrideRow](tag, "ops_overrides") {
  def id = column[UUID]("id", O.PrimaryKey)
  def incidentId = column[Option[UUID]]("incident_id")
  def marketId = column[Option[UUID]]("market_id")
  def overrideType = column[String]("override_type")
  def overridePayload = column[Json]("override_payload")
  def performedBy = column[String]("performed_by")
  def reason = column[String]("reason")
  def performedAt = column[OffsetDateTime]("performed_at")

  override def * : ProvenShape[PredictionOpsOverrideRow] =
    (id, incidentId, marketId, overrideType, overridePayload, performedBy, reason, performedAt)
      .mapTo[PredictionOpsOverrideRow]
}

private[infrastructure] final class PredictionAuditEventLogTable(tag: Tag)
    extends Table[PredictionAuditEventLogRow](tag, "audit_event_log") {
  def id = column[UUID]("id", O.PrimaryKey)
  def aggregateType = column[String]("aggregate_type")
  def aggregateId = column[String]("aggregate_id")
  def eventType = column[String]("event_type")
  def sequenceNo = column[Long]("sequence_no")
  def schemaVersion = column[Int]("schema_version")
  def eventPayload = column[Json]("event_payload")
  def emittedAt = column[OffsetDateTime]("emitted_at")
  def createdAt = column[OffsetDateTime]("created_at")

  override def * : ProvenShape[PredictionAuditEventLogRow] =
    (id, aggregateType, aggregateId, eventType, sequenceNo, schemaVersion, eventPayload, emittedAt, createdAt)
      .mapTo[PredictionAuditEventLogRow]
}

private[infrastructure] final class PredictionReplayCheckpointsTable(tag: Tag)
    extends Table[PredictionReplayCheckpointRow](tag, "replay_checkpoints") {
  def id = column[UUID]("id", O.PrimaryKey)
  def streamName = column[String]("stream_name")
  def checkpointKey = column[String]("checkpoint_key")
  def lastSequenceNo = column[Long]("last_sequence_no")
  def metadata = column[Json]("metadata")
  def updatedAt = column[OffsetDateTime]("updated_at")

  override def * : ProvenShape[PredictionReplayCheckpointRow] =
    (id, streamName, checkpointKey, lastSequenceNo, metadata, updatedAt).mapTo[PredictionReplayCheckpointRow]
}
