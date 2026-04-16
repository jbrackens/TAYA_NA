package phoenix.auditlog.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.auditlog.domain.AuditLogEntry
import phoenix.auditlog.domain.AuditLogQuery
import phoenix.auditlog.domain.AuditLogRepository
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.persistence.ExtendedPostgresProfile.api._

final class SlickAuditLogRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends AuditLogRepository {

  import dbConfig.db

  private val auditLogEntryRows = AuditLogPersistenceSupport.tableQuery

  override def insert(entry: AuditLogEntry): Future[Unit] =
    db.run(AuditLogPersistenceSupport.insertEntry(entry))

  override def listAll(pagination: Pagination, query: AuditLogQuery): Future[PaginatedResult[AuditLogEntry]] =
    db.run(auditLogEntryRows.result).map { rows =>
      val filtered = rows.map(_.entry).filter(query.matches)
      val sorted =
        filtered.sortBy(query.sortTimestamp)

      val ordered =
        if (query.descending) sorted.reverse else sorted

      PaginatedResult(
        ordered.slice(pagination.offset, pagination.offset + pagination.itemsPerPage).toList,
        ordered.size,
        pagination)
    }
}
