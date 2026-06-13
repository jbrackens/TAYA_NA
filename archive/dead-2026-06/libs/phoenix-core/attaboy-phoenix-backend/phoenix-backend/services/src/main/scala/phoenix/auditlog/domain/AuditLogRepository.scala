package phoenix.auditlog.domain

import scala.concurrent.Future

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination

trait AuditLogRepository {

  def insert(entry: AuditLogEntry): Future[Unit]

  def listAll(pagination: Pagination): Future[PaginatedResult[AuditLogEntry]]
}
