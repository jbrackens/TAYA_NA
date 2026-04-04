package phoenix.auditlog.support

import scala.concurrent.Future

import phoenix.auditlog.domain.AuditLogEntry
import phoenix.auditlog.domain.AuditLogRepository
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination

final class InMemoryAuditLogRepository(var entries: List[AuditLogEntry] = List.empty) extends AuditLogRepository {

  override def insert(entry: AuditLogEntry): Future[Unit] = {
    entries = entries :+ entry
    Future.unit
  }

  override def listAll(pagination: Pagination): Future[PaginatedResult[AuditLogEntry]] = {
    val firstIndex = (pagination.currentPage - 1) * pagination.itemsPerPage
    val lastIndex = firstIndex + pagination.itemsPerPage
    Future.successful(
      PaginatedResult(entries.sortBy(_.createdAt).reverse.slice(firstIndex, lastIndex), entries.size, pagination))
  }
}
