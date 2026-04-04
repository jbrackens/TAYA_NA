package phoenix.backoffice

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.TableQuery
import slick.sql.SqlAction

import phoenix.core.currency.MoneyAmount
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.projections.DomainMappers._

trait MarketExposureRepository extends MarketExposureReadRepository with MarketExposureWriteRepository

trait MarketExposureReadRepository {
  def findExposure(marketId: MarketId, selectionId: SelectionId): Future[Option[MarketExposure]]
}

trait MarketExposureWriteRepository {
  def updateExposure(
      marketId: MarketId,
      selectionId: SelectionId,
      totalStakedDelta: MoneyAmount,
      potentialLossDelta: MoneyAmount): Future[Unit]
}

private[backoffice] final class SlickMarketExposureRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit
    ec: ExecutionContext)
    extends MarketExposureRepository {
  import dbConfig.db

  private val marketExposureQuery = TableQuery[MarketExposureTable]

  override def updateExposure(
      marketId: MarketId,
      selectionId: SelectionId,
      totalStakedDelta: MoneyAmount,
      potentialLossDelta: MoneyAmount): Future[Unit] = {
    val query: SqlAction[Int, NoStream, Effect] = sqlu"""
      INSERT INTO market_exposures (market_id, selection_id, total_staked, potential_loss)
      VALUES ($marketId, $selectionId, $totalStakedDelta, $potentialLossDelta)
        ON CONFLICT (market_id, selection_id) DO UPDATE
              SET total_staked = market_exposures.total_staked + $totalStakedDelta,
                  potential_loss = market_exposures.potential_loss + $potentialLossDelta;
    """
    db.run(query).map(_ => ())
  }

  override def findExposure(marketId: MarketId, selectionId: SelectionId): Future[Option[MarketExposure]] =
    db.run(
      marketExposureQuery
        .filter(exposure => exposure.marketId === marketId && exposure.selectionId === selectionId)
        .result
        .headOption)
}

private class MarketExposureTable(tag: Tag) extends Table[MarketExposure](tag, "market_exposures") {
  def marketId = column[MarketId]("market_id")
  def selectionId = column[SelectionId]("selection_id")
  def totalStaked = column[MoneyAmount]("total_staked")
  def potentialLoss = column[MoneyAmount]("potential_loss")

  def * = (marketId, selectionId, totalStaked, potentialLoss).mapTo[MarketExposure]
}
