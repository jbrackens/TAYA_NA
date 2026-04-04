package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.OptionT
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ProvenShape
import slick.lifted.Tag

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.projections.DomainMappers._
import phoenix.reports.domain.FixtureMarketRepository
import phoenix.reports.domain.model.markets.Fixture
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection
import phoenix.reports.infrastructure.SlickFixtureMarketRepository.FixtureTable
import phoenix.reports.infrastructure.SlickFixtureMarketRepository.MarketSelectionTable
import phoenix.reports.infrastructure.SlickFixtureMarketRepository.MarketTable

private[reports] final class SlickFixtureMarketRepository(dbConfig: DatabaseConfig[JdbcProfile])(implicit
    ec: ExecutionContext)
    extends FixtureMarketRepository {

  import dbConfig.db

  private val markets: TableQuery[MarketTable] = TableQuery[MarketTable]
  private val marketSelections: TableQuery[MarketSelectionTable] = TableQuery[MarketSelectionTable]
  private val fixtures: TableQuery[FixtureTable] = TableQuery[FixtureTable]

  def upsert(fixture: Fixture): Future[Unit] =
    db.run(fixtures.insertOrUpdate(fixture)).map(_ => ())

  def upsert(market: Market): Future[Unit] =
    db.run(markets.insertOrUpdate(market)).map(_ => ())

  def upsert(selections: Seq[MarketSelection]): Future[Unit] =
    db.run(marketSelections.insertOrUpdateAll(selections)).map(_ => ())

  def get(marketId: MarketId): OptionT[Future, FixtureMarket] = {
    val marketQuery = markets.filter(_.marketId === marketId).join(fixtures).on(_.fixtureId === _.fixtureId).take(1)

    OptionT(for {
      marketFixture <- db.run(marketQuery.result.headOption)
      selections <- db.run(marketSelections.filterIf(marketFixture.isDefined)(_.marketId === marketId).result)
    } yield marketFixture.map({ case (market, fixture) => FixtureMarket(fixture, market, selections) }))
  }
}

private object SlickFixtureMarketRepository {

  private final class MarketTable(tag: Tag) extends Table[Market](tag, "reporting_markets") {
    def marketId: Rep[MarketId] = column[MarketId]("market_id", O.PrimaryKey)
    def name: Rep[String] = column[String]("name")
    def fixtureId: Rep[FixtureId] = column[FixtureId]("fixture_id")

    override def * : ProvenShape[Market] =
      (marketId, name, fixtureId).mapTo[Market]
  }

  private final class FixtureTable(tag: Tag) extends Table[Fixture](tag, "reporting_fixtures") {
    def fixtureId: Rep[FixtureId] = column[FixtureId]("fixture_id", O.PrimaryKey)
    def name: Rep[String] = column[String]("name")
    def startTime: Rep[OffsetDateTime] = column[OffsetDateTime]("start_time")

    override def * : ProvenShape[Fixture] =
      (fixtureId, name, startTime).mapTo[Fixture]
  }

  private final class MarketSelectionTable(tag: Tag)
      extends Table[MarketSelection](tag, "reporting_market_selections") {
    def selectionId: Rep[SelectionId] = column[SelectionId]("selection_id")
    def selectionName: Rep[String] = column[String]("selection_name")
    def marketId: Rep[MarketId] = column[MarketId]("market_id")
    def pk = primaryKey("reporting_market_selections_pkey", (selectionId, marketId))

    override def * : ProvenShape[MarketSelection] =
      (selectionId, selectionName, marketId).mapTo[MarketSelection]
  }
}
