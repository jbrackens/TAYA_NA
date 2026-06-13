package phoenix.bets.support

import java.time.OffsetDateTime

import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.domain.PunterStake
import phoenix.bets.domain.PunterStakeRepository
import phoenix.punters.PunterEntity.PunterId

final class TestPunterStakeRepository(var punterStakes: List[PunterStake] = List.empty) extends PunterStakeRepository {
  override def insert(bet: PunterStake): Future[Unit] =
    Future.successful {
      punterStakes = punterStakes :+ bet
    }

  override def find(betId: BetId): Future[Option[PunterStake]] =
    Future.successful {
      punterStakes.find(_.betId == betId)
    }

  override def update(betId: BetId, newBetStatus: BetStatus, newOutcome: Option[BetOutcome]): Future[Unit] =
    Future.successful {
      punterStakes.find(_.betId == betId) match {
        case Some(found) =>
          punterStakes =
            punterStakes.filter(_.betId != betId) :+ found.copy(betStatus = newBetStatus, outcome = newOutcome)
        case None => ()
      }
    }

  override def findMoreRecentThan(punterId: PunterId, recencyThreshold: OffsetDateTime): Future[List[PunterStake]] =
    Future.successful {
      punterStakes.filter(betView => betView.punterId == punterId && betView.placedAt > recencyThreshold)
    }
}
