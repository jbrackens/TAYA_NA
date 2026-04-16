package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterSummary
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PunterSearch
import phoenix.punters.domain.PuntersRepository

final class GetPunterSummaries(puntersRepository: PuntersRepository)(implicit ec: ExecutionContext) {

  def getPunterSummaries(pagination: Pagination, punterSearch: PunterSearch): Future[PaginatedResult[PunterSummary]] =
    puntersRepository.findPuntersByFilters(punterSearch, pagination).map(_.map(toPunterSummary))

  private def toPunterSummary(punter: Punter): PunterSummary = {
    PunterSummary(
      id = punter.punterId,
      username = punter.details.userName,
      firstName = punter.details.name.firstName,
      lastName = punter.details.name.lastName,
      email = punter.details.email,
      dateOfBirth = punter.details.dateOfBirth,
      isTestAccount = punter.details.isTestAccount)
  }
}
