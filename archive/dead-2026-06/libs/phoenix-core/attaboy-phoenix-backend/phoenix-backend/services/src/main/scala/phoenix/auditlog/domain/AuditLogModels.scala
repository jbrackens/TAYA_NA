package phoenix.auditlog.domain

import java.time.OffsetDateTime

import phoenix.punters.PunterEntity.PunterId

sealed trait AuditLogEntry {
  def createdAt: OffsetDateTime
}

final case class AccountCreationEntry(punterId: PunterId, createdAt: OffsetDateTime) extends AuditLogEntry

final case class AccountClosureEntry(punterId: PunterId, createdAt: OffsetDateTime) extends AuditLogEntry
