package phoenix.dbviews.infrastructure

import scala.concurrent.Future

import phoenix.dbviews.domain.model.PatronDetails
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.PunterPersonalDetails

trait View01PatronDetailsRepository {
  def upsert(patronDetails: PatronDetails): Future[Unit]
  def updateDetails(punterId: PunterId, update: PunterPersonalDetails => PunterPersonalDetails): Future[Unit]
  def get(punterId: PunterId): Future[Option[PatronDetails]]
}
