package phoenix.markets.sports

import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext.Sport
import phoenix.markets.sports.SportEntity.SportId
import phoenix.projections.DomainMappers._

class SportsTable(tag: Tag) extends Table[Sport](tag, "sports") {
  def sportId: Rep[SportId] = column[SportId]("sport_id", O.PrimaryKey)
  def name: Rep[String] = column[String]("name")
  def abbreviation: Rep[String] = column[String]("abbreviation")
  def displayToPunters: Rep[Boolean] = column[Boolean]("display_to_punters")

  override def * : ProvenShape[Sport] = (sportId, name, abbreviation, displayToPunters).mapTo[Sport]
}

object SportsTable {
  val sportsQuery: TableQuery[SportsTable] = TableQuery[SportsTable]

  val displayedSports = sportsQuery.filter(_.displayToPunters)
}
