package phoenix.bets.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.domain.MarketBet
import phoenix.bets.domain.MarketBetsRepository
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.projections.DomainMappers._

final class SlickMarketBetsRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends MarketBetsRepository {
  import dbConfig.db

  private val betsQuery: TableQuery[BetsTable] = TableQuery[BetsTable]

  override def save(bet: MarketBet): Future[Unit] =
    db.run(betsQuery.insertOrUpdate(bet).map(_ => ()))

  override def openBetsForMarket(marketId: MarketId): Future[Set[MarketBet]] =
    betsWithStatusForMarket(marketId, BetStatus.Open)

  override def settledBetsForMarket(marketId: MarketId): Future[Set[MarketBet]] =
    betsWithStatusForMarket(marketId, BetStatus.Settled)

  private def betsWithStatusForMarket(marketId: MarketId, status: BetStatus): Future[Set[MarketBet]] = {
    val selectedBets =
      betsQuery.filter(m => m.marketId === marketId && m.betStatus.inSetBind(Seq(status)))
    db.run(selectedBets.result.map(_.toSet))
  }
}

private class BetsTable(tag: Tag) extends Table[MarketBet](tag, "bets") {
  def betId = column[BetId]("bet_id", O.PrimaryKey)
  def marketId = column[MarketId]("market_id")
  def betStatus = column[BetStatus]("bet_status")

  def * = (betId, marketId, betStatus).mapTo[MarketBet]
}
