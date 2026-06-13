package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.application.ResetPunterStateError.PunterNotFound

final class ResetPunterState(puntersBoundedContext: PuntersBoundedContext)(implicit ec: ExecutionContext) {

  def resetPunterState(punterId: PunterId): EitherT[Future, ResetPunterStateError, Unit] =
    puntersBoundedContext
      .resetPunterState(punterId)
      .map(_ => ())
      .leftMap((_: PunterProfileDoesNotExist) => PunterNotFound)
}

sealed trait ResetPunterStateError
object ResetPunterStateError {
  case object PunterNotFound extends ResetPunterStateError
}
