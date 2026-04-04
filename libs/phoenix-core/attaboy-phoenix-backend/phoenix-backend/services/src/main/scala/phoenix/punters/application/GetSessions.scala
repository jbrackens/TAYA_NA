package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.domain.Session

final class GetSessions(punters: PuntersBoundedContext)(implicit ec: ExecutionContext) {
  def getSessions(
      punterId: PunterId,
      pagination: Pagination): EitherT[Future, PunterProfileDoesNotExist, PaginatedResult[Session]] = {
    punters.getPunterProfile(punterId).map { punterProfile =>
      val sessionsFromEnded = punterProfile.endedSessions.map(ended =>
        Session(ended.sessionId, punterId, startTime = ended.startedAt, endTime = Some(ended.endedAt)))
      val maybeSessionFromCurrent = punterProfile.maybeCurrentSession.map(current =>
        Session(current.sessionId, punterId, startTime = current.startedAt, endTime = None))

      val allSessionsFromNewestToOldest =
        (sessionsFromEnded ++ maybeSessionFromCurrent).sortBy(_.startTime).reverse

      val paginatedRecords =
        allSessionsFromNewestToOldest.drop(pagination.offset).take(pagination.itemsPerPage)

      PaginatedResult(paginatedRecords, allSessionsFromNewestToOldest.length, pagination)
    }
  }
}
