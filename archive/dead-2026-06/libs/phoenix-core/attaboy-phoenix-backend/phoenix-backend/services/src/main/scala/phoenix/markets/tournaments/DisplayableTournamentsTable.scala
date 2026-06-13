package phoenix.markets.tournaments

import slick.lifted.ProvenShape

import phoenix.core.persistence.ExtendedPostgresProfile.api._
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.projections.DomainMappers._
import phoenix.projections.DomainMappers.phoenixPersistenceIdTypeMapper

class DisplayableTournamentsTable(tag: Tag)
    extends Table[MarketsBoundedContext.DisplayableTournament](tag, "displayable_tournaments") {

  def tournamentId: Rep[TournamentId] = column[TournamentId]("tournament_id", O.PrimaryKey)

  override def * : ProvenShape[MarketsBoundedContext.DisplayableTournament] =
    tournamentId.mapTo[MarketsBoundedContext.DisplayableTournament]
}

object DisplayableTournamentsTable {
  val displayableTournamentsQuery: TableQuery[DisplayableTournamentsTable] = TableQuery[DisplayableTournamentsTable]
}
