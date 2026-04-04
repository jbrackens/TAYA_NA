package phoenix.markets.tournaments

import java.time.OffsetDateTime

import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.projections.DomainMappers._

class TournamentsTable(tag: Tag) extends Table[MarketsBoundedContext.Tournament](tag, "tournaments") {
  def tournamentId: Rep[TournamentId] = column[TournamentId]("tournament_id", O.PrimaryKey)
  def sportId: Rep[SportId] = column[SportId]("sport_id")
  def name: Rep[String] = column[String]("name")
  def startTime: Rep[OffsetDateTime] = column[OffsetDateTime]("start_time")

  override def * : ProvenShape[MarketsBoundedContext.Tournament] =
    (tournamentId, sportId, name, startTime).mapTo[MarketsBoundedContext.Tournament]
}

object TournamentsTable {
  val tournamentsQuery: TableQuery[TournamentsTable] = TableQuery[TournamentsTable]
}
