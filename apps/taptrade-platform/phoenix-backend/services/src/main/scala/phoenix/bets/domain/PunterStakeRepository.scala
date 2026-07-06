package phoenix.bets.domain

import java.time.OffsetDateTime

import scala.concurrent.Future

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.Stake
import phoenix.core.PotentialReturn
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.punters.PunterEntity.PunterId

trait PunterStakeRepository {
  def insert(bet: PunterStake): Future[Unit]

  def find(betId: BetId): Future[Option[PunterStake]]

  def update(betId: BetId, newBetStatus: BetStatus, newOutcome: Option[BetOutcome]): Future[Unit]

  def findMoreRecentThan(punterId: PunterId, recencyThreshold: OffsetDateTime): Future[List[PunterStake]]
}

final case class PunterStake(
    betId: BetId,
    punterId: PunterId,
    stake: Stake,
    odds: Odds,
    placedAt: OffsetDateTime,
    betStatus: BetStatus,
    outcome: Option[BetOutcome]) {

  def potentialReturn(): MoneyAmount = PotentialReturn(stake, odds)

  def unsafeGetOutcome(): BetOutcome =
    outcome.getOrElse(
      throw new RuntimeException(
        s"Outcome undefined - was bet status (${betStatus.entryName}) expected to have an outcome?"))
}
