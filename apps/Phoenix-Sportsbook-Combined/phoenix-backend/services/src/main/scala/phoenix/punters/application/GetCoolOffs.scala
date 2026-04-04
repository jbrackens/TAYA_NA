package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity
import phoenix.punters.domain.PunterCoolOffEntry
import phoenix.punters.domain.PunterCoolOffsHistoryRepository
import phoenix.punters.domain.PuntersRepository

final class GetCoolOffs(
    puntersRepository: PuntersRepository,
    coolOffsHistoryRepository: PunterCoolOffsHistoryRepository)(implicit ec: ExecutionContext) {
  def getCoolOffs(
      punterId: PunterEntity.PunterId,
      pagination: Pagination): EitherT[Future, GetCoolOffsError, PaginatedResult[PunterCoolOffEntry]] =
    for {
      _ <- puntersRepository.findByPunterId(punterId).toRight(GetCoolOffsError.PunterNotFound)
      coolOffs <- EitherT.liftF(coolOffsHistoryRepository.findCoolOffs(pagination, punterId))
    } yield coolOffs
}
sealed trait GetCoolOffsError
object GetCoolOffsError {
  case object PunterNotFound extends GetCoolOffsError
}
