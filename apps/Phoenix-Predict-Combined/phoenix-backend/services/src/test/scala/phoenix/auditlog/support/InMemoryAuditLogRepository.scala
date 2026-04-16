package phoenix.auditlog.support

import scala.concurrent.Future

import phoenix.auditlog.domain.AuditLogEntry
import phoenix.auditlog.domain.AuditLogQuery
import phoenix.auditlog.domain.AuditLogRepository
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination

final class InMemoryAuditLogRepository(var entries: List[AuditLogEntry] = List.empty) extends AuditLogRepository {

  override def insert(entry: AuditLogEntry): Future[Unit] = {
    entries = entries :+ entry
    Future.unit
  }

  override def listAll(pagination: Pagination, query: AuditLogQuery): Future[PaginatedResult[AuditLogEntry]] = {
    val ordered =
      (if (query.descending) entries.sortBy(query.sortTimestamp).reverse else entries.sortBy(query.sortTimestamp))
        .filter(query.matches)
    val firstIndex = (pagination.currentPage - 1) * pagination.itemsPerPage
    val lastIndex = firstIndex + pagination.itemsPerPage
    Future.successful(
      PaginatedResult(ordered.slice(firstIndex, lastIndex), ordered.size, pagination))
  }
}
