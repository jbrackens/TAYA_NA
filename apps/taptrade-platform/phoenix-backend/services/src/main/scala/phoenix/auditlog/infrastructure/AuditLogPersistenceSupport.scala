package phoenix.auditlog.infrastructure

import java.time.OffsetDateTime

import slick.lifted.ProvenShape

import phoenix.auditlog.domain.AuditLogEntry
import phoenix.auditlog.infrastructure.AuditLogDomainMappers._
import phoenix.core.persistence.ExtendedPostgresProfile.api._

private[auditlog] final case class AuditLogEntryRow(entry: AuditLogEntry, createdAt: OffsetDateTime, id: Option[Long] = None)

private[auditlog] final class AuditLogEntryTable(tag: Tag) extends Table[AuditLogEntryRow](tag, "audit_log_entries") {
  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def createdAt = column[OffsetDateTime]("created_at")
  def entry = column[AuditLogEntry]("entry")

  override def * : ProvenShape[AuditLogEntryRow] =
    (entry, createdAt, id.?).mapTo[AuditLogEntryRow]
}

object AuditLogPersistenceSupport {
  def tableQuery: TableQuery[AuditLogEntryTable] = TableQuery[AuditLogEntryTable]

  def insertEntry(entry: AuditLogEntry): DBIO[Unit] =
    DBIO.seq(tableQuery += AuditLogEntryRow(entry, entry.createdAt))
}
