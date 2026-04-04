package phoenix.auditlog.domain

import scala.concurrent.Future

import phoenix.core.Clock
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.PunterId

final class AuditLogger(repository: AuditLogRepository, clock: Clock) {

  def recordAccountCreation(punterId: PunterId): Future[Unit] =
    insert(AccountCreationEntry(punterId, clock.currentOffsetDateTime()))

  def recordAccountClosure(punterId: PunterId): Future[Unit] =
    insert(AccountClosureEntry(punterId, clock.currentOffsetDateTime()))

  def listAllEntries(pagination: Pagination): Future[PaginatedResult[AuditLogEntry]] =
    repository.listAll(pagination)

  private def insert(entry: AuditLogEntry): Future[Unit] =
    repository.insert(entry)
}
