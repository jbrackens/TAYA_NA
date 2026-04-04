package phoenix.bets.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.TableQuery

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.Stake
import phoenix.bets.domain.PunterStake
import phoenix.bets.domain.PunterStakeRepository
import phoenix.core.odds.Odds
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity.PunterId

final class SlickPunterStakesRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends PunterStakeRepository {
  import dbConfig.db

  private val allRows: TableQuery[PunterStakesTable] = TableQuery[PunterStakesTable]

  override def insert(bet: PunterStake): Future[Unit] =
    db.run(allRows.insertOrUpdate(bet).map(_ => ()))

  override def find(betId: BetId): Future[Option[PunterStake]] =
    db.run(allRows.filter(_.betId === betId).take(1).result.headOption)

  override def update(betId: BetId, newBetStatus: BetStatus, newOutcome: Option[BetOutcome]): Future[Unit] =
    db.run(allRows.filter(_.betId === betId).map(bet => (bet.status, bet.outcome)).update((newBetStatus, newOutcome)))
      .map(_ => ())

  override def findMoreRecentThan(punterId: PunterId, recencyThreshold: OffsetDateTime): Future[List[PunterStake]] =
    db.run(allRows.filter(bet => bet.punterId === punterId && bet.placedAt > recencyThreshold).result).map(_.toList)
}

private class PunterStakesTable(tag: Tag) extends Table[PunterStake](tag, "punter_stakes") {
  val betId = column[BetId]("bet_id", O.PrimaryKey)
  val punterId = column[PunterId]("punter_id")
  val stake = column[Stake]("stake")
  val odds = column[Odds]("odds")
  val placedAt = column[OffsetDateTime]("placed_at")
  val status = column[BetStatus]("status")
  val outcome = column[Option[BetOutcome]]("outcome")

  override def * : ProvenShape[PunterStake] =
    (betId, punterId, stake, odds, placedAt, status, outcome).mapTo[PunterStake]
}
