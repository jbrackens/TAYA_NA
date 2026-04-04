package phoenix.markets

import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.sports.SportEntity.SportId
import phoenix.projections.DomainMappers._

class DisplayableMarketsTable(tag: Tag)
    extends Table[MarketsBoundedContext.DisplayableMarket](tag, "displayable_markets") {
  def sportId: Rep[SportId] = column[SportId]("sport_id")
  def marketCategory: Rep[MarketCategory] = column[MarketCategory]("market_category")
  def visibility: Rep[MarketVisibility] = column[MarketVisibility]("visibility")

  def * : ProvenShape[MarketsBoundedContext.DisplayableMarket] =
    (sportId, marketCategory, visibility).mapTo[MarketsBoundedContext.DisplayableMarket]

  def pk = primaryKey("displayable_markets_pk", (sportId, marketCategory))
}

object DisplayableMarketsTable {
  val displayableMarketsQuery: TableQuery[DisplayableMarketsTable] = TableQuery[DisplayableMarketsTable]
}
