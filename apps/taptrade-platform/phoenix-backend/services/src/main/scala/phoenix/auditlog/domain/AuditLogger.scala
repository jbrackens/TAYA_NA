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

  def recordPredictionMarketLifecycle(
      action: String,
      actorId: String,
      targetId: String,
      details: String,
      dataBefore: Map[String, String],
      dataAfter: Map[String, String]): Future[Unit] = {
    val now = clock.currentOffsetDateTime()
    insert(
      PredictionMarketLifecycleEntry(
        action = action,
        actorId = actorId,
        targetId = targetId,
        product = "prediction",
        details = details,
        occurredAt = now,
        dataBefore = dataBefore,
        dataAfter = dataAfter,
        createdAt = now))
  }

  def listAllEntries(
      pagination: Pagination,
      query: AuditLogQuery = AuditLogQuery.empty): Future[PaginatedResult[AuditLogEntry]] =
    repository.listAll(pagination, query)

  private def insert(entry: AuditLogEntry): Future[Unit] =
    repository.insert(entry)
}
