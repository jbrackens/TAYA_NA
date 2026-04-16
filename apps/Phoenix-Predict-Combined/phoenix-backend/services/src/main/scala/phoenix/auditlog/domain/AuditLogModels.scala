package phoenix.auditlog.domain

import java.time.OffsetDateTime

import phoenix.punters.PunterEntity.PunterId

sealed trait AuditLogEntry {
  def createdAt: OffsetDateTime
}

final case class AccountCreationEntry(punterId: PunterId, createdAt: OffsetDateTime) extends AuditLogEntry

final case class AccountClosureEntry(punterId: PunterId, createdAt: OffsetDateTime) extends AuditLogEntry

final case class PredictionMarketLifecycleEntry(
    action: String,
    actorId: String,
    targetId: String,
    product: String,
    details: String,
    occurredAt: OffsetDateTime,
    dataBefore: Map[String, String],
    dataAfter: Map[String, String],
    createdAt: OffsetDateTime)
    extends AuditLogEntry

final case class AuditLogQuery(
    action: Option[String] = None,
    actorId: Option[String] = None,
    targetId: Option[String] = None,
    product: Option[String] = None,
    sortBy: String = "occurredAt",
    sortDir: String = "desc") {

  def matches(entry: AuditLogEntry): Boolean =
    action.forall(filter => normalized(actionOf(entry)).contains(normalized(filter))) &&
      actorId.forall(filter => normalized(actorIdOf(entry)).contains(normalized(filter))) &&
      targetId.forall(filter => normalized(targetIdOf(entry)).contains(normalized(filter))) &&
      product.forall(filter => normalized(productOf(entry)).contains(normalized(filter)))

  def sortTimestamp(entry: AuditLogEntry): OffsetDateTime =
    normalized(sortBy) match {
      case "occurredat" => occurredAtOf(entry)
      case _            => entry.createdAt
    }

  def descending: Boolean =
    normalized(sortDir) != "asc"

  private def actionOf(entry: AuditLogEntry): Option[String] =
    entry match {
      case _: AccountCreationEntry                 => Some("account.creation")
      case _: AccountClosureEntry                  => Some("account.closure")
      case lifecycle: PredictionMarketLifecycleEntry => Some(lifecycle.action)
    }

  private def actorIdOf(entry: AuditLogEntry): Option[String] =
    entry match {
      case lifecycle: PredictionMarketLifecycleEntry => Some(lifecycle.actorId)
      case _                                         => None
    }

  private def targetIdOf(entry: AuditLogEntry): Option[String] =
    entry match {
      case lifecycle: PredictionMarketLifecycleEntry => Some(lifecycle.targetId)
      case _                                         => None
    }

  private def productOf(entry: AuditLogEntry): Option[String] =
    entry match {
      case lifecycle: PredictionMarketLifecycleEntry => Some(lifecycle.product)
      case _                                         => None
    }

  private def occurredAtOf(entry: AuditLogEntry): OffsetDateTime =
    entry match {
      case lifecycle: PredictionMarketLifecycleEntry => lifecycle.occurredAt
      case _                                         => entry.createdAt
    }

  private def normalized(value: String): String =
    value.trim.toLowerCase

  private def normalized(value: Option[String]): Option[String] =
    value.map(normalized).filter(_.nonEmpty)
}

object AuditLogQuery {
  val empty: AuditLogQuery = AuditLogQuery()
}
