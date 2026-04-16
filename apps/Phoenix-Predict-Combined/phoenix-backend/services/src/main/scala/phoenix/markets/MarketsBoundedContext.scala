package phoenix.markets

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.domain.DataProvider
import phoenix.core.domain.EntityType
import phoenix.core.domain.NamespacedPhoenixId
import phoenix.core.ordering.Direction
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.websocket.PhoenixStateUpdate
import phoenix.markets.MarketDataConverters.marketSpecifiersToMap
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketsBoundedContext.MarketAggregate._
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.MarketsRepository.MarketLifecycleChange
import phoenix.markets.domain.MarketType
import phoenix.markets.fixtures.FixtureQuery
import phoenix.markets.fixtures.FixtureStatus
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.FixtureScore
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.sharding.PhoenixAkkaId

trait MarketsBoundedContext {
  def createOrUpdateSport(request: UpdateSportRequest)(implicit ec: ExecutionContext): Future[SportId]

  def createOrUpdateFixture(request: UpdateFixtureRequest)(implicit ec: ExecutionContext): Future[FixtureResult]

  def createOrUpdateMarket(request: UpdateMarketRequest)(implicit ec: ExecutionContext): Future[MarketId]

  def createOrUpdateMarket(request: CommonUpdateMarketRequest)(implicit ec: ExecutionContext): Future[MarketId]

  def lastUpdateTimestamp()(implicit ec: ExecutionContext): Future[OffsetDateTime]

  def updateMatchStatus(request: UpdateMatchStatusRequest)(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, MatchStatusResult]

  def updateFixtureInfo(sportId: SportId, fixtureId: FixtureId, request: FixtureInfoUpdateRequest)(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, Unit]

  def getFixtures(query: FixtureQuery, startTimeOrderingDirection: Option[Direction], pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[FixtureNavigationData]]

  def getFixtureDetails(fixtureId: FixtureId, marketVisibilities: Set[MarketVisibility])(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, FixtureDetailData]

  def getFixtureIds(fixtureStatus: Set[FixtureStatus])(implicit ec: ExecutionContext): Future[Seq[FixtureId]]

  def updateSelectionOdds(marketId: MarketId, selectionOdds: Seq[SelectionOdds])(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, Unit]

  def listAllSports()(implicit ec: ExecutionContext): Future[Seq[SportView]]

  def getMarketState(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, InitializedMarket]

  def getDgeAllowedMarketState(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, InitializedMarket]

  def getMarket(marketId: MarketId)(implicit ec: ExecutionContext): EitherT[Future, MarketNotFound, MarketAggregate]

  def listTradingFixtures(query: FixtureQuery, startTimeOrderingDirection: Option[Direction], pagination: Pagination)(
      implicit ec: ExecutionContext): Future[PaginatedResult[TradingFixtureDetails]]

  def getTradingFixture(fixtureId: FixtureId)(implicit
      ec: ExecutionContext): EitherT[Future, FixtureNotFound, TradingFixtureDetails]

  def getTradingMarkets(pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[TradingMarketNavigationData]]

  def getTradingMarket(marketId: MarketId)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, TradingMarketNavigationData]

  def updateMarketInfo(marketId: MarketId, request: MarketInfoUpdateRequest)(implicit
      ec: ExecutionContext): EitherT[Future, MarketNotFound, Unit]

  def changeVisibility(sportId: SportId, marketCategory: MarketCategory, marketVisibility: MarketVisibility)(implicit
      ec: ExecutionContext): EitherT[Future, Nothing, Unit]

  def getMarketCategories(sportId: SportId, pagination: Pagination)(implicit
      ec: ExecutionContext): Future[PaginatedResult[MarketCategoryVisibility]]

  def settleMarket(marketId: MarketId, winningSelectionId: SelectionId, reason: LifecycleOperationalChangeReason)(
      implicit ec: ExecutionContext): EitherT[Future, MarketSettlingError, Unit]

  def resettleMarket(marketId: MarketId, newWinningSelectionId: SelectionId, reason: LifecycleOperationalChangeReason)(
      implicit ec: ExecutionContext): EitherT[Future, MarketResettlingError, Unit]

  def cancelMarket(marketId: MarketId, reason: LifecycleCancellationReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketCancellingError, Unit]

  def freezeMarket(marketId: MarketId, reason: LifecycleOperationalChangeReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketFreezingError, Unit]

  def unfreezeMarket(marketId: MarketId, reason: LifecycleOperationalChangeReason)(implicit
      ec: ExecutionContext): EitherT[Future, MarketUnfreezingError, Unit]

  def makeTournamentDisplayable(tournamentId: TournamentId)(implicit ec: ExecutionContext): Future[Unit]

  def makeTournamentNotDisplayable(tournamentId: TournamentId)(implicit ec: ExecutionContext): Future[Unit]
}

object MarketsBoundedContext {
  type SelectionId = String

  final case class MarketId(provider: DataProvider, id: String) extends PhoenixAkkaId with NamespacedPhoenixId {
    override val entityType: EntityType = EntityType.Market
  }
  object MarketId {
    def unsafeParse(namespaced: String) = NamespacedPhoenixId.unsafeParse(MarketId.apply)(namespaced)
    def parse(namespaced: String) = NamespacedPhoenixId.parse(MarketId.apply)(namespaced)
  }

  sealed trait MarketSettlingError
  sealed trait MarketResettlingError
  sealed trait MarketCancellingError
  sealed trait MarketFreezingError
  sealed trait MarketUnfreezingError
  sealed trait FixtureStreamingError

  final case class MarketNotFound(id: MarketId)
      extends MarketSettlingError
      with MarketResettlingError
      with MarketCancellingError
      with MarketFreezingError
      with MarketUnfreezingError

  final case class FixtureNotFound(id: FixtureId) extends FixtureStreamingError
  final case class SelectionNotFound(marketId: MarketId, selectionId: SelectionId)
      extends MarketSettlingError
      with MarketResettlingError
  final case class CannotSettleMarket(marketId: MarketId, selectionId: SelectionId) extends MarketSettlingError
  final case class CannotResettleMarket(marketId: MarketId, selectionId: SelectionId) extends MarketResettlingError
  final case class DuplicateSettleMarketEvent(marketId: MarketId, selectionId: SelectionId) extends MarketSettlingError
  final case class CannotCancelMarket(marketId: MarketId) extends MarketCancellingError
  final case class DuplicateCancelMarketEvent(marketId: MarketId) extends MarketCancellingError
  final case class CannotFreezeMarket(marketId: MarketId) extends MarketFreezingError
  final case class DuplicateFreezeMarketEvent(marketId: MarketId) extends MarketFreezingError
  final case class CannotUnfreezeMarket(marketId: MarketId) extends MarketUnfreezingError

  final case class UnexpectedMarketErrorException(underlying: Throwable)
      extends RuntimeException(s"Unexpected error [${underlying.getMessage}]")

  // Sport read-side models
  final case class TournamentView(id: TournamentId, name: String, numberOfFixtures: Int)
  final case class SportView(
      id: SportId,
      name: String,
      abbreviation: String,
      displayToPunters: Boolean,
      tournaments: Seq[TournamentView])

  // Fixture read-side models
  final case class Sport(sportId: SportId, name: String, abbreviation: String, displayToPunters: Boolean)

  final case class Tournament(tournamentId: TournamentId, sportId: SportId, name: String, startTime: OffsetDateTime)

  final case class DisplayableTournament(tournamentId: TournamentId)

  final case class Fixture(
      fixtureId: FixtureId,
      name: String,
      tournamentId: TournamentId,
      startTime: OffsetDateTime,
      competitors: Seq[Competitor],
      scoreHistory: Seq[FixtureScoreChange],
      lifecycleStatus: FixtureLifecycleStatus,
      statusHistory: Seq[FixtureLifecycleStatusChange],
      finishTime: Option[OffsetDateTime],
      createdAt: OffsetDateTime) {

    def latestScore: FixtureScore =
      scoreHistory.sortBy(_.updatedAt).lastOption.map(_.score).getOrElse(FixtureScore.NilScore)

    def isLive: Boolean = lifecycleStatus == FixtureLifecycleStatus.InPlay
  }

  final case class Competitor(competitorId: CompetitorId, name: String, qualifier: String)
  final case class CompetitorWithScore(competitorId: CompetitorId, name: String, qualifier: String, score: Int)

  final case class MarketStateUpdate(
      marketId: MarketId,
      marketName: String,
      marketType: MarketType,
      marketCategory: MarketCategory,
      marketStatus: MarketLifecycle,
      specifiers: Map[String, String],
      selectionOdds: Seq[SelectionOdds])
      extends PhoenixStateUpdate
  object MarketStateUpdate {
    def fromInitializedMarket(market: InitializedMarket): MarketStateUpdate =
      MarketStateUpdate(
        marketId = market.id,
        marketName = market.info.name,
        marketType = market.info.marketType,
        marketCategory = MarketCategory(market.info.marketType.entryName),
        marketStatus = market.lifecycle,
        specifiers = marketSpecifiersToMap(market.info.specifiers),
        selectionOdds = market.marketSelections.selections.values.toSeq)
  }

  final case class MarketAggregate(
      id: MarketId,
      name: String,
      sport: SportSummary,
      tournament: TournamentSummary,
      fixture: FixtureSummary,
      currentLifecycle: MarketLifecycle,
      selections: Seq[SelectionOdds]) {

    def isBettable: Boolean = selections.nonEmpty && currentLifecycle.isInstanceOf[Bettable]

    def currentSelectionOdds(id: SelectionId): Option[SelectionOdds] =
      selections.find(_.selectionId == id)

    def marketSummary: MarketSummary =
      MarketSummary(id, name)

    def selectionSummary(id: SelectionId): Option[SelectionSummary] =
      selections.find(_.selectionId == id).map(s => SelectionSummary(s.selectionId, s.selectionName))
  }

  object MarketAggregate {
    final case class SportSummary(id: SportId, name: String)
    final case class TournamentSummary(id: TournamentId, name: String)
    final case class FixtureSummary(
        id: FixtureId,
        name: String,
        startTime: OffsetDateTime,
        status: FixtureLifecycleStatus)
    final case class MarketSummary(id: MarketId, name: String)
    final case class SelectionSummary(id: SelectionId, name: String)
    final case class CompetitorSummary(id: CompetitorId, name: String)
  }

  final case class DisplayableMarket(sportId: SportId, marketCategory: MarketCategory, visibility: MarketVisibility)

  final case class TradingFixtureDetails(
      fixtureId: FixtureId,
      fixtureName: String,
      startTime: OffsetDateTime,
      isLive: Boolean,
      sport: Sport,
      score: FixtureScore,
      status: FixtureLifecycleStatus,
      scoreHistory: Seq[FixtureScoreChange],
      statusHistory: Seq[FixtureLifecycleStatusChange],
      marketsTotalCount: Int,
      markets: List[TradingMarketData],
      competitors: Seq[Competitor])

  final case class TradingMarketData(
      marketId: MarketId,
      marketName: String,
      marketType: MarketType,
      marketCategory: String,
      selectionOdds: Seq[SelectionOdds],
      currentLifecycle: MarketLifecycle,
      lifecycleChanges: Seq[MarketLifecycleChange])

  final case class FixtureScoreChange(score: FixtureScore, updatedAt: OffsetDateTime)

  final case class FixtureLifecycleStatusChange(status: FixtureLifecycleStatus, updatedAt: OffsetDateTime)

  final case class FixtureStateUpdate(
      id: FixtureId,
      name: String,
      startTime: OffsetDateTime,
      status: FixtureLifecycleStatus,
      score: FixtureScore)
      extends PhoenixStateUpdate

  final case class FixtureDetailData(
      fixtureId: FixtureId,
      fixtureName: String,
      startTime: OffsetDateTime,
      isLive: Boolean,
      sport: Sport,
      tournament: Tournament,
      status: FixtureLifecycleStatus,
      score: FixtureScore,
      markets: Map[MarketType, Seq[MarketStateUpdate]],
      marketsList: Set[MarketStateUpdate],
      /* In case a filter has been applied on the markets, `marketsTotalCount` refers to the original (unfiltered) number of markets */
      marketsTotalCount: Int,
      competitors: Map[String, CompetitorWithScore])

  final case class FixtureNavigationData(
      fixtureId: FixtureId,
      fixtureName: String,
      startTime: OffsetDateTime,
      isLive: Boolean,
      sport: Sport,
      tournament: Tournament,
      status: FixtureLifecycleStatus,
      markets: Seq[MarketStateUpdate],
      /* In case a filter has been applied on the markets, `marketsTotalCount` refers to the original (unfiltered) number of markets */
      marketsTotalCount: Int,
      competitors: Map[String, CompetitorWithScore])

  final case class TradingMarketNavigationData(
      fixtureId: FixtureId,
      fixtureName: String,
      startTime: OffsetDateTime,
      isLive: Boolean,
      sport: Sport,
      score: FixtureScore,
      status: FixtureLifecycleStatus,
      scoreHistory: Seq[FixtureScoreChange],
      statusHistory: Seq[FixtureLifecycleStatusChange],
      market: TradingMarketData,
      competitors: Seq[Competitor])

  final case class MarketNavigationQuery(sportId: Option[String])

  final case class MarketInfoUpdateRequest(marketName: String)

  final case class MarketChangeVisibilityRequest(
      sportId: SportId,
      marketCategory: MarketCategory,
      marketVisibility: MarketVisibility)

  final case class FixtureInfoUpdateRequest(
      fixtureName: Option[String],
      fixtureStatus: Option[FixtureLifecycleStatus],
      fixtureStartTime: Option[OffsetDateTime])

  final case class MarketSettlingRequest(winningSelectionId: SelectionId)
  final case class MarketResettlingRequest(winningSelectionId: SelectionId, reason: String)

  final case class FixtureResult(sportId: SportId, tournamentId: TournamentId, fixtureId: FixtureId)

  final case class MatchStatusResult(sportId: SportId, fixtureId: FixtureId)
  final case class MarketCategoryVisibility(marketCategory: MarketCategory, visibility: MarketVisibility)
}
