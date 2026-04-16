package phoenix.boundedcontexts.market

import java.time.OffsetDateTime

import phoenix.markets.sports.Competitor
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId

case class FixtureDetails(
    sportId: SportId,
    sportName: String,
    sportAbbreviation: String,
    tournamentId: TournamentId,
    tournamentName: String,
    tournamentStartTime: OffsetDateTime,
    fixtureId: FixtureId,
    fixtureName: String,
    startTime: OffsetDateTime,
    competitors: Set[Competitor],
    currentScore: FixtureScore,
    fixtureStatus: FixtureLifecycleStatus)
