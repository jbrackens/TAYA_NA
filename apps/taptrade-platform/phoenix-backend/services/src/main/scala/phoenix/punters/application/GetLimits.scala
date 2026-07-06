package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.LimitChange
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.domain.PuntersRepository

final class GetLimits(puntersRepository: PuntersRepository, limitsHistoryRepository: PunterLimitsHistoryRepository)(
    implicit ec: ExecutionContext) {

  def getLimits(
      punterId: PunterId,
      pagination: Pagination): EitherT[Future, GetLimitsError, PaginatedResult[LimitChange]] =
    for {
      _ <- puntersRepository.findByPunterId(punterId).toRight(GetLimitsError.PunterNotFound)
      limitChanges <- EitherT.liftF(limitsHistoryRepository.findLimits(pagination, punterId))
    } yield limitChanges

}

sealed trait GetLimitsError
object GetLimitsError {
  case object PunterNotFound extends GetLimitsError
}
