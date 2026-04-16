package phoenix.reports.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.application.PuntersFinder.PunterDoesNotExist
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.PuntersRepository

private[reports] final class PuntersFinder(repository: PuntersRepository)(implicit ec: ExecutionContext) {

  def find(punterId: PunterId): Future[PunterProfile] = {
    repository.find(punterId).getOrElseF(Future.failed(PunterDoesNotExist(punterId)))
  }
}

object PuntersFinder {
  final case class PunterDoesNotExist(id: PunterId) extends RuntimeException(s"Punter [id = $id] does not exist")
}
