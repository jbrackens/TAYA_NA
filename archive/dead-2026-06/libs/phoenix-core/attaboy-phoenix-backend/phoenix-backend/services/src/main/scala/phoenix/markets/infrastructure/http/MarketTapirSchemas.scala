package phoenix.markets.infrastructure.http
import sttp.tapir.Schema

import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId

object MarketTapirSchemas {

  implicit val marketIdSchema: Schema[MarketId] = Schema.string

  implicit val sportIdSchema: Schema[SportId] = Schema.string

  implicit val tournamentIdSchema: Schema[TournamentId] = Schema.string

  implicit val fixtureIdSchema: Schema[FixtureId] = Schema.string
}
