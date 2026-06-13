package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.OptionT
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.TableQuery

import phoenix.bets.BetEntity.BetId
import phoenix.core.persistence.DBUtils
import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.projections.DomainMappers._
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.Bet
import phoenix.reports.domain.BetsRepository
import phoenix.reports.domain.model.bets.NormalizedStake
import phoenix.reports.infrastructure.ReportsDomainMappers.normalizedStakeMapper

private[reports] final class SlickBetsRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
    extends BetsRepository {
  import dbConfig.db

  private val allRows: TableQuery[BetsTable] = TableQuery[BetsTable]

  override def upsert(bet: Bet): Future[Unit] =
    db.run(allRows.insertOrUpdate(bet)).map(_ => ())

  override def find(betId: BetId): OptionT[Future, Bet] =
    OptionT(db.run(allRows.filter(_.betId === betId).result.headOption))

  override def setSettled(betId: BetId, settledAt: OffsetDateTime): Future[Unit] =
    db.run(
      allRows
        .filter(_.betId === betId)
        .map(r => (r.closedAt, r.initialSettlementData))
        .update((Some(settledAt), Some(settledAt))))
      .map(_ => ())

  override def setClosedAt(betId: BetId, closedAt: OffsetDateTime): Future[Unit] =
    db.run(allRows.filter(_.betId === betId).map(_.closedAt).update(Some(closedAt))).map(_ => ())

  override def findOpenBetsAsOf(reference: OffsetDateTime): Source[Bet, NotUsed] = {
    val query = allRows
      .filter(bet => bet.placedAt <= reference && (bet.closedAt.isEmpty || bet.closedAt > reference))
      .sortBy(_.placedAt)
    DBUtils.streamingSource(db, query.result)
  }
}

private class BetsTable(tag: Tag) extends Table[Bet](tag, "reporting_bets") {
  val betId = column[BetId]("bet_id", O.PrimaryKey)
  val punterId = column[PunterId]("punter_id")
  val marketId = column[MarketId]("market_id")
  val selectionId = column[SelectionId]("selection_id")
  val stake = column[NormalizedStake]("stake")
  val placedAt = column[OffsetDateTime]("placed_at")
  val closedAt = column[Option[OffsetDateTime]]("closed_at")
  val initialSettlementData = column[Option[OffsetDateTime]]("initial_settlement_data")

  override def * : ProvenShape[Bet] =
    (betId, punterId, marketId, selectionId, stake, placedAt, closedAt, initialSettlementData).mapTo[Bet]
}
