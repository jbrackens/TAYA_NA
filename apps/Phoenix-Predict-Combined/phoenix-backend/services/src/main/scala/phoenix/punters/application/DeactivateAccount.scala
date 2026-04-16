package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.application.DeactivateAccountError.PunterNotFound

final class DeactivateAccount(puntersBoundedContext: PuntersBoundedContext)(implicit ec: ExecutionContext) {

  def deactivateAccount(punterId: PunterId): EitherT[Future, DeactivateAccountError, Unit] =
    puntersBoundedContext
      .unverifyPunter(punterId)
      .map(_ => ())
      .leftMap((_: PunterProfileDoesNotExist) => PunterNotFound)
}

sealed trait DeactivateAccountError
object DeactivateAccountError {
  case object PunterNotFound extends DeactivateAccountError
}
