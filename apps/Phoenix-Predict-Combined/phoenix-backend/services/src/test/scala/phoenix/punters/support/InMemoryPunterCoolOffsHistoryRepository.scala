package phoenix.punters.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity
import phoenix.punters.domain.PunterCoolOffEntry
import phoenix.punters.domain.PunterCoolOffsHistoryRepository

final class InMemoryPunterCoolOffsHistoryRepository(var coolOffs: List[PunterCoolOffEntry] = List.empty)
    extends PunterCoolOffsHistoryRepository {

  override def findCoolOffs(pagination: Pagination, punterId: PunterEntity.PunterId)(implicit
      ec: ExecutionContext): Future[PaginatedResult[PunterCoolOffEntry]] =
    Future.successful {
      PaginatedResult(
        coolOffs.sortBy(_.coolOffStart).reverse.drop(pagination.offset).take(pagination.itemsPerPage),
        coolOffs.size,
        pagination)
    }

  override def insert(entry: PunterCoolOffEntry)(implicit ec: ExecutionContext): Future[Unit] =
    Future.successful { coolOffs = coolOffs :+ entry }
}
