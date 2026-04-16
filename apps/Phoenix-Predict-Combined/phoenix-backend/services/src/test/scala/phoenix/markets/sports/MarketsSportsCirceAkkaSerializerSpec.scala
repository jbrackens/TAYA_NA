package phoenix.markets.sports

import cats.derived.auto.eq._
import org.scalacheck.Arbitrary
import org.scalacheck.ScalacheckShapeless._

import phoenix.core.serialization.PhoenixCirceAkkaSerializerSpec
import phoenix.markets.sports._

class MarketsSportsCirceAkkaSerializerSpec extends PhoenixCirceAkkaSerializerSpec {
  private implicit lazy val sportIdArbitrary: Arbitrary[SportEntity.SportId] = namespacedIdArbitrary(
    SportEntity.SportId.apply)
  private implicit lazy val competitorIdArbitrary: Arbitrary[SportEntity.CompetitorId] = namespacedIdArbitrary(
    SportEntity.CompetitorId.apply)
  private implicit lazy val fixtureIdArbitrary: Arbitrary[SportEntity.FixtureId] = namespacedIdArbitrary(
    SportEntity.FixtureId.apply)
  private implicit lazy val tournamentIdArbitrary: Arbitrary[SportEntity.TournamentId] = namespacedIdArbitrary(
    SportEntity.TournamentId.apply)

  roundTripFor[SportProtocol.Commands.SportCommand]
  roundTripFor[SportProtocol.Responses.SportResponse]
  goldenTestsFor[SportProtocol.Events.SportEvent]
  goldenTestsFor[SportState]
}
