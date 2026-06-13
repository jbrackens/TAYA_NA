package phoenix.punters.support

import scala.concurrent.Future

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.LimitChange
import phoenix.punters.domain.PunterLimitsHistoryRepository

final class InMemoryPunterLimitsHistoryRepository(var limitChanges: List[LimitChange] = List.empty)
    extends PunterLimitsHistoryRepository {

  override def insert(limitChange: LimitChange): Future[Unit] =
    Future.successful { limitChanges = limitChanges :+ limitChange }

  override def findLimits(pagination: Pagination, punterId: PunterId): Future[PaginatedResult[LimitChange]] = {
    val firstIndex = (pagination.currentPage - 1) * pagination.itemsPerPage
    val lastIndex = firstIndex + pagination.itemsPerPage

    Future.successful {
      PaginatedResult(
        limitChanges.sortBy(_.requestedAt).reverse.slice(firstIndex, lastIndex),
        limitChanges.size,
        pagination)
    }
  }

}
