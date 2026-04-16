package phoenix.punters.idcomply.domain

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PuntersRepository

final class RegistrationDataCleaner(
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository)(implicit ec: ExecutionContext) {

  def cleanUp(punterId: PunterId): Future[Unit] =
    for {
      _ <- removeRegisteredUser(punterId)
      _ <- removePunter(punterId)
    } yield ()

  private def removeRegisteredUser(punterId: PunterId): Future[Unit] =
    authenticationRepository.removeUser(punterId)

  private def removePunter(punterId: PunterId): Future[Unit] =
    puntersRepository.delete(punterId)
}
