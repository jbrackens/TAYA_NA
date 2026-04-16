package phoenix.punters.domain

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity

trait PunterCoolOffsHistoryRepository {
  def findCoolOffs(pagination: Pagination, punterId: PunterEntity.PunterId)(implicit
      ec: ExecutionContext): Future[PaginatedResult[PunterCoolOffEntry]]

  def insert(entry: PunterCoolOffEntry)(implicit ec: ExecutionContext): Future[Unit]
}

final case class PunterCoolOffEntry(
    punterId: PunterEntity.PunterId,
    coolOffStart: OffsetDateTime,
    coolOffEnd: OffsetDateTime,
    coolOffCause: CoolOffCause)
