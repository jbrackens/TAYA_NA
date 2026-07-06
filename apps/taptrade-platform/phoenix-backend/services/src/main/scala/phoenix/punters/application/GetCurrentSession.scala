package phoenix.punters.application

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.bifunctor._

import phoenix.core.Clock
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.PunterProfile

final class GetCurrentSession(punters: PuntersBoundedContext, clock: Clock)(implicit ec: ExecutionContext) {
  def getCurrentSession(punterId: PunterId): EitherT[Future, GetCurrentSessionError, GetCurrentSessionOutput] =
    for {
      punterProfile <- findPunterProfile(punterId)
      startedSession <-
        EitherT
          .fromOption[Future](punterProfile.maybeCurrentSession, GetCurrentSessionError.PunterHasNoActiveSession)
          .leftWiden[GetCurrentSessionError]
    } yield GetCurrentSessionOutput(
      currentTime = clock.currentOffsetDateTime(),
      sessionStartTime = startedSession.startedAt)

  private def findPunterProfile(
      punterId: PunterId): EitherT[Future, GetCurrentSessionError.PunterProfileDoesNotExist.type, PunterProfile] = {
    punters
      .getPunterProfile(punterId)
      .leftMap((_: PuntersBoundedContext.PunterProfileDoesNotExist) => GetCurrentSessionError.PunterProfileDoesNotExist)
  }
}

final case class GetCurrentSessionOutput(currentTime: OffsetDateTime, sessionStartTime: OffsetDateTime)

sealed trait GetCurrentSessionError
object GetCurrentSessionError {
  case object PunterProfileDoesNotExist extends GetCurrentSessionError
  case object PunterHasNoActiveSession extends GetCurrentSessionError
}
