package phoenix.markets

import java.time.OffsetDateTime

import cats.data.NonEmptyList
import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.projections.DomainMappers._

class MarketsTable(tag: Tag) extends Table[MarketsRepository.Market](tag, "markets") {
  def marketId: Rep[MarketId] = column[MarketId]("market_id", O.PrimaryKey)
  def name: Rep[String] = column[String]("name")
  def fixtureId: Rep[FixtureId] = column[FixtureId]("fixture_id")
  def marketType: Rep[MarketType] = column[MarketType]("market_type")
  def category: Rep[Option[MarketCategory]] = column[Option[MarketCategory]]("category")
  def selectionOdds: Rep[Seq[SelectionOdds]] = column[Seq[SelectionOdds]]("selection_odds")
  def specifiers: Rep[Seq[MarketSpecifier]] = column[Seq[MarketSpecifier]]("specifiers")
  // TODO (PHXD-1169): decouple column definitions from Cats
  def statusHistory: Rep[NonEmptyList[MarketsRepository.MarketLifecycleChange]] =
    column[NonEmptyList[MarketsRepository.MarketLifecycleChange]]("status_history")
  def createdAt: Rep[OffsetDateTime] = column[OffsetDateTime]("created_at")
  def updatedAt: Rep[OffsetDateTime] = column[OffsetDateTime]("updated_at")

  def * : ProvenShape[MarketsRepository.Market] =
    (marketId, name, fixtureId, marketType, category, selectionOdds, specifiers, statusHistory, createdAt, updatedAt)
      .mapTo[MarketsRepository.Market]
}

object MarketsTable {
  val marketsQuery: TableQuery[MarketsTable] = TableQuery[MarketsTable]
}
