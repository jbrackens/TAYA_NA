package phoenix.punters.application
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.instances.future._
import cats.syntax.bifunctor._

import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.PuntersRepository

class UnsuspendPunterUseCase(punters: PuntersBoundedContext, puntersRepository: PuntersRepository)(implicit
    ec: ExecutionContext) {

  import UnsuspendPunterError._

  def unsuspend(punterId: PunterId, adminId: AdminId): EitherT[Future, UnsuspendPunterError, Unit] = {
    for {
      punter <- puntersRepository.findByPunterId(punterId).toRight(PunterNotFound)
      _ <-
        if (punter.ssn.isLeft) EitherT.leftT(PunterWithoutSSN: UnsuspendPunterError)
        else
          punters
            .unsuspend(punterId, adminId)
            .leftMap {
              case _: PuntersBoundedContext.PunterProfileDoesNotExist => PunterNotFound
              case _: PuntersBoundedContext.PunterNotSuspendedError   => PunterNotSuspended
            }
            .leftWiden[UnsuspendPunterError]
    } yield ()
  }
}

sealed trait UnsuspendPunterError
object UnsuspendPunterError {
  case object PunterNotFound extends UnsuspendPunterError
  case object PunterWithoutSSN extends UnsuspendPunterError
  case object PunterNotSuspended extends UnsuspendPunterError
}
