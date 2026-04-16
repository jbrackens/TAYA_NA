package phoenix.markets

import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.MarketsRepository.FixtureData
import phoenix.markets.MarketsRepository.Market
import phoenix.markets.MarketsRepository.MarketWithDetails
import phoenix.markets.sports.FixtureScore

object MarketDataConverters {

  private val log = LoggerFactory.getLogger(this.objectName)

  def toFixtureDetailData(data: FixtureData): FixtureDetailData = {
    val fixture = data.fixture
    val sport = data.sport
    val tournament = data.tournament
    val marketsList = data.markets.flatMap(toMarketStateUpdate)
    val markets = marketsList.groupBy(_.marketType)

    FixtureDetailData(
      fixtureId = fixture.fixtureId,
      fixtureName = fixture.name,
      startTime = fixture.startTime,
      isLive = fixture.isLive,
      sport = sport,
      tournament = tournament,
      status = fixture.lifecycleStatus,
      score = fixture.latestScore,
      markets = markets,
      marketsList = marketsList.toSet,
      marketsTotalCount = data.markets.size,
      toCompetitorWithScoreMap(fixture.competitors, fixture.latestScore))
  }

  def toMarketStateUpdate(market: Market): Option[MarketStateUpdate] = {
    val marketId = market.marketId
    val name = market.name
    val marketType = market.marketType
    val currentLifecycle = market.currentLifecycle
    val specifiers = marketSpecifiersToMap(market.specifiers)
    val selectionOdds = market.selectionOdds
    market.category.map(category =>
      MarketStateUpdate(marketId, name, marketType, category, currentLifecycle, specifiers, selectionOdds))
  }

  def marketSpecifiersToMap(specifiers: Seq[MarketSpecifier]): Map[String, String] =
    specifiers.toList.groupBy(_.key).map {
      case (k, Nil)       => (k, "???")
      case (k, head :: _) => (k, head.value.toLowerCase)
    }

  def toFixtureNavigationData(data: FixtureData): FixtureNavigationData = {
    val fixture = data.fixture
    val sport = data.sport
    val tournament = data.tournament
    val markets = data.markets.flatMap(toMarketStateUpdate)
    val latestScore = fixture.latestScore
    val competitors = toCompetitorWithScoreMap(fixture.competitors, latestScore)

    FixtureNavigationData(
      fixtureId = fixture.fixtureId,
      fixtureName = fixture.name,
      startTime = fixture.startTime,
      isLive = fixture.isLive,
      sport = sport,
      tournament = tournament,
      status = fixture.lifecycleStatus,
      markets = markets,
      marketsTotalCount = data.markets.size,
      competitors = competitors)
  }

  private def toCompetitorWithScoreMap(
      competitors: Seq[Competitor],
      latestScore: FixtureScore): Map[String, CompetitorWithScore] =
    competitors.groupBy(_.qualifier).map {
      case (qualifier, competitors) =>
        val firstCompetitor = competitors.head
        val score = firstCompetitor.qualifier.toLowerCase match {
          case "home" => latestScore.home
          case "away" => latestScore.away
          case q =>
            log.error(s"Unexpected competitor qualifier '$q'")
            0
        }
        qualifier.toLowerCase -> CompetitorWithScore(
          competitorId = firstCompetitor.competitorId,
          name = firstCompetitor.name,
          qualifier = firstCompetitor.qualifier,
          score = score)
    }

  def toTradingMarketNavigationData(data: MarketWithDetails): TradingMarketNavigationData = {
    val sport = data.sport
    val fixture = data.fixture
    val market = toTradingMarketData(data.market)

    TradingMarketNavigationData(
      fixtureId = fixture.fixtureId,
      fixtureName = fixture.name,
      startTime = fixture.startTime,
      isLive = fixture.isLive,
      sport = sport,
      score = fixture.latestScore,
      status = fixture.lifecycleStatus,
      scoreHistory = fixture.scoreHistory,
      statusHistory = fixture.statusHistory,
      market = market,
      competitors = fixture.competitors)
  }

  def toTradingMarketData(market: Market): TradingMarketData =
    TradingMarketData(
      marketId = market.marketId,
      marketName = market.name,
      marketType = market.marketType,
      marketCategory = market.marketType.entryName,
      selectionOdds = market.selectionOdds,
      currentLifecycle = market.currentLifecycle,
      lifecycleChanges = market.lifecycleChanges.toList)

  def toTradingFixtureDetails(data: FixtureData): TradingFixtureDetails =
    TradingFixtureDetails(
      fixtureId = data.fixture.fixtureId,
      fixtureName = data.fixture.name,
      startTime = data.fixture.startTime,
      isLive = data.fixture.isLive,
      sport = data.sport,
      score = data.fixture.latestScore,
      status = data.fixture.lifecycleStatus,
      scoreHistory = data.fixture.scoreHistory,
      statusHistory = data.fixture.statusHistory,
      marketsTotalCount = data.markets.size,
      markets = data.markets.map(toTradingMarketData).toList,
      competitors = data.fixture.competitors)
}
