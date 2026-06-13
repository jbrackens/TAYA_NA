package phoenix.auditlog.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.auditlog.domain.AuditLogEntry
import phoenix.auditlog.domain.AuditLogRepository
import phoenix.auditlog.infrastructure.AuditLogDomainMappers._
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile.api._

final class SlickAuditLogRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends AuditLogRepository {

  import dbConfig.db

  private val auditLogEntryRows: TableQuery[AuditLogEntryTable] = TableQuery[AuditLogEntryTable]

  override def insert(entry: AuditLogEntry): Future[Unit] =
    db.run(auditLogEntryRows += AuditLogEntryRow(entry, entry.createdAt)).map(_ => ())

  override def listAll(pagination: Pagination): Future[PaginatedResult[AuditLogEntry]] = {
    val databaseQuery = for {
      records <-
        auditLogEntryRows.sortBy(_.createdAt.desc).drop(pagination.offset).take(pagination.itemsPerPage).result.map {
          row =>
            row.map(_.entry).toList
        }
      totalCount <- auditLogEntryRows.length.result
    } yield PaginatedResult(records, totalCount, pagination)

    db.run(databaseQuery)
  }
}

private final case class AuditLogEntryRow(entry: AuditLogEntry, createdAt: OffsetDateTime, id: Option[Long] = None)

private final class AuditLogEntryTable(tag: Tag) extends Table[AuditLogEntryRow](tag, "audit_log_entries") {
  def id = column[Long]("id", O.PrimaryKey, O.AutoInc)
  def createdAt = column[OffsetDateTime]("created_at")
  def entry = column[AuditLogEntry]("entry")

  def * = (entry, createdAt, id.?).mapTo[AuditLogEntryRow]
}
