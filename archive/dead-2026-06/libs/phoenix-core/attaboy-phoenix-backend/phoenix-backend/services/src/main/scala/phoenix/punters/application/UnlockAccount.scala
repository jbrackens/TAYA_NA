package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.application.UnlockAccountError.PunterNotFound

final class UnlockAccount(puntersBoundedContext: PuntersBoundedContext)(implicit ec: ExecutionContext) {

  def unlockAccount(punterId: PunterId): EitherT[Future, UnlockAccountError, Unit] =
    resetLoginContext(punterId).map(_ => ())

  private def resetLoginContext(punterId: PunterId): EitherT[Future, UnlockAccountError, Unit] =
    puntersBoundedContext.resetLoginContext(punterId).leftMap((_: PunterProfileDoesNotExist) => PunterNotFound)
}

sealed trait UnlockAccountError
object UnlockAccountError {
  case object PunterNotFound extends UnlockAccountError
}
