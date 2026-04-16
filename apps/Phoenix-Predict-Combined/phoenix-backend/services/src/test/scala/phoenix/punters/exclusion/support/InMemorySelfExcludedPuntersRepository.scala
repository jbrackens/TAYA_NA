package phoenix.punters.exclusion.support

import java.time.OffsetDateTime

import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.exclusion.domain.SelfExcludedPunter
import phoenix.punters.exclusion.domain.SelfExcludedPuntersRepository

final class InMemorySelfExcludedPuntersRepository extends SelfExcludedPuntersRepository {
  private var selfExcludedPunters = List.empty[SelfExcludedPunter]

  override def upsert(excludedPunter: SelfExcludedPunter): Future[Unit] =
    Future.successful {
      selfExcludedPunters = selfExcludedPunters.filter(_.punterId != excludedPunter.punterId) :+ excludedPunter
    }

  override def delete(punterId: PunterId): Future[Unit] =
    Future.successful {
      selfExcludedPunters = selfExcludedPunters.filter(_.punterId != punterId)
    }

  override def search(punterId: PunterId): Future[Option[SelfExcludedPunter]] =
    Future.successful {
      selfExcludedPunters.find(_.punterId == punterId)
    }

  override def searchExcludedAfter(lowerBoundInclusive: OffsetDateTime): Future[List[SelfExcludedPunter]] =
    Future.successful {
      selfExcludedPunters
        .filter(selfExcludedPunter => selfExcludedPunter.excludedAt >= lowerBoundInclusive)
        .sortBy(_.excludedAt)
    }
}
