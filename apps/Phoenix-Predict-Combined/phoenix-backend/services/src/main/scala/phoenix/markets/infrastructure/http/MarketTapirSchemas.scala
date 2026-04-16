package phoenix.markets.infrastructure.http

import sttp.tapir.Schema
import sttp.tapir.generic.auto._

import phoenix.core.odds.Odds
import phoenix.markets.LifecycleCancellationReason
import phoenix.markets.LifecycleOperationalChangeReason
import phoenix.markets.MarketCategory
import phoenix.markets.MarketLifecycle
import phoenix.markets.MarketVisibility
import phoenix.markets.MarketSpecifier
import phoenix.markets.SelectionOdds
import phoenix.markets.domain.MarketType
import phoenix.markets.MarketsBoundedContext.Competitor
import phoenix.markets.MarketsBoundedContext.CompetitorWithScore
import phoenix.markets.MarketsBoundedContext.FixtureDetailData
import phoenix.markets.MarketsBoundedContext.FixtureLifecycleStatusChange
import phoenix.markets.MarketsBoundedContext.FixtureNavigationData
import phoenix.markets.MarketsBoundedContext.FixtureResult
import phoenix.markets.MarketsBoundedContext.FixtureScoreChange
import phoenix.markets.MarketsBoundedContext.FixtureStateUpdate
import phoenix.markets.MarketsBoundedContext.MarketCategoryVisibility
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.MarketStateUpdate
import phoenix.markets.MarketsBoundedContext.MatchStatusResult
import phoenix.markets.MarketsBoundedContext.Sport
import phoenix.markets.MarketsBoundedContext.SportView
import phoenix.markets.MarketsBoundedContext.Tournament
import phoenix.markets.MarketsBoundedContext.TournamentView
import phoenix.markets.MarketsBoundedContext.TradingFixtureDetails
import phoenix.markets.MarketsBoundedContext.TradingMarketData
import phoenix.markets.MarketsBoundedContext.TradingMarketNavigationData
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId

object MarketTapirSchemas {

  implicit val marketIdSchema: Schema[MarketId] = Schema.string

  implicit val sportIdSchema: Schema[SportId] = Schema.string

  implicit val tournamentIdSchema: Schema[TournamentId] = Schema.string

  implicit val fixtureIdSchema: Schema[FixtureId] = Schema.string

  implicit val competitorIdSchema: Schema[CompetitorId] = Schema.string

  implicit val marketTypeSchema: Schema[MarketType] = Schema.string

  implicit val marketCategorySchema: Schema[MarketCategory] = Schema.string

  implicit val marketVisibilitySchema: Schema[MarketVisibility] = Schema.string

  implicit val fixtureLifecycleStatusSchema: Schema[FixtureLifecycleStatus] = Schema.string

  implicit val lifecycleOperationalChangeReasonSchema: Schema[LifecycleOperationalChangeReason] = Schema.string

  implicit val lifecycleCancellationReasonSchema: Schema[LifecycleCancellationReason] = Schema.string

  implicit lazy val oddsSchema: Schema[Odds] = Schema.derived

  implicit lazy val marketSpecifierSchema: Schema[MarketSpecifier] = Schema.derived

  implicit lazy val selectionOddsSchema: Schema[SelectionOdds] = Schema.derived

  implicit lazy val marketLifecycleSchema: Schema[MarketLifecycle] = Schema.derived

  implicit lazy val competitorSchema: Schema[Competitor] = Schema.derived

  implicit lazy val competitorWithScoreSchema: Schema[CompetitorWithScore] = Schema.derived

  implicit lazy val fixtureScoreSchema: Schema[FixtureScore] = Schema.derived

  implicit lazy val sportSchema: Schema[Sport] = Schema.derived

  implicit lazy val tournamentSchema: Schema[Tournament] = Schema.derived

  implicit lazy val marketStateUpdateSchema: Schema[MarketStateUpdate] = Schema.derived

  implicit val marketStateUpdateMapSchema: Schema[Map[MarketType, Seq[MarketStateUpdate]]] =
    Schema.schemaForMap(_.entryName)

  implicit lazy val fixtureScoreChangeSchema: Schema[FixtureScoreChange] = Schema.derived

  implicit lazy val fixtureLifecycleStatusChangeSchema: Schema[FixtureLifecycleStatusChange] = Schema.derived

  implicit lazy val tradingMarketDataSchema: Schema[TradingMarketData] = Schema.derived

  implicit lazy val tradingFixtureDetailsSchema: Schema[TradingFixtureDetails] = Schema.derived

  implicit lazy val fixtureDetailDataSchema: Schema[FixtureDetailData] = Schema.derived

  implicit lazy val fixtureNavigationDataSchema: Schema[FixtureNavigationData] = Schema.derived

  implicit lazy val tradingMarketNavigationDataSchema: Schema[TradingMarketNavigationData] = Schema.derived

  implicit lazy val marketCategoryVisibilitySchema: Schema[MarketCategoryVisibility] = Schema.derived

  implicit lazy val fixtureStateUpdateSchema: Schema[FixtureStateUpdate] = Schema.derived

  implicit lazy val tournamentViewSchema: Schema[TournamentView] = Schema.derived

  implicit lazy val sportViewSchema: Schema[SportView] = Schema.derived

  implicit lazy val fixtureResultSchema: Schema[FixtureResult] = Schema.derived

  implicit lazy val matchStatusResultSchema: Schema[MatchStatusResult] = Schema.derived
}
