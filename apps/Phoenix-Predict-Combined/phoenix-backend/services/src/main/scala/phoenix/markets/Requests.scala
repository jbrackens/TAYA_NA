package phoenix.markets

import java.time.OffsetDateTime

import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.domain.MarketType
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.markets.sports.SportProtocol.Commands.MatchScore

final case class UpdateSportRequest(
    correlationId: String,
    receivedAtUtc: OffsetDateTime,
    sportId: SportId,
    sportName: String,
    sportAbbreviation: String,
    displayToPunters: Option[Boolean])

final case class UpdateFixtureRequest(
    correlationId: String,
    receivedAtUtc: OffsetDateTime,
    sportId: SportId,
    sportName: String,
    sportAbbreviation: String,
    tournamentId: TournamentId,
    tournamentName: String,
    tournamentStartTime: OffsetDateTime,
    fixtureId: FixtureId,
    fixtureName: String,
    startTime: OffsetDateTime,
    competitors: Set[sports.Competitor],
    currentScore: Option[sports.FixtureScore],
    fixtureStatus: FixtureLifecycleStatus)

final case class UpdateMarketRequest(
    correlationId: String,
    receivedAtUtc: OffsetDateTime,
    fixtureId: FixtureId,
    marketId: MarketId,
    marketName: String,
    marketCategory: Option[MarketCategory],
    marketType: MarketType,
    marketLifecycle: MarketLifecycle,
    marketSpecifiers: Seq[MarketSpecifier],
    selectionOdds: Seq[SelectionOdds])

final case class CommonUpdateMarketRequest(
    correlationId: String,
    receivedAtUtc: OffsetDateTime,
    fixtureId: FixtureId,
    marketId: MarketId,
    marketName: String,
    marketType: MarketType,
    marketCategory: Option[MarketCategory],
    marketLifecycle: MarketLifecycle,
    marketSpecifiers: MarketSpecifiers,
    selectionOdds: Seq[SelectionOdds])

final case class UpdateMatchStatusRequest(
    correlationId: String,
    receivedAtUtc: OffsetDateTime,
    sportId: SportId,
    score: Option[MatchScore],
    fixtureId: FixtureId,
    matchPhase: FixtureLifecycleStatus)
