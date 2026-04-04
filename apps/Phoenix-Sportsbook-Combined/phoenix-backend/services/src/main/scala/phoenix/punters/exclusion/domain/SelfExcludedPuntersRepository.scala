package phoenix.punters.exclusion.domain

import java.time.OffsetDateTime

import scala.concurrent.Future

import phoenix.punters.PunterEntity.PunterId

trait SelfExcludedPuntersRepository {
  def upsert(excludedPunter: SelfExcludedPunter): Future[Unit]
  def delete(punterId: PunterId): Future[Unit]
  def search(punterId: PunterId): Future[Option[SelfExcludedPunter]]
  def searchExcludedAfter(lowerBoundInclusive: OffsetDateTime): Future[List[SelfExcludedPunter]]
}
