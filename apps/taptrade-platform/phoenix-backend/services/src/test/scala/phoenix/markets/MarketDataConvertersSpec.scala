package phoenix.markets

import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.markets.MarketsBoundedContext.CompetitorWithScore
import phoenix.markets.MarketsBoundedContext.FixtureDetailData
import phoenix.markets.MarketsBoundedContext.FixtureNavigationData
import phoenix.markets.MarketsBoundedContext.TradingMarketNavigationData
import phoenix.support.DataGenerator.generateFixture
import phoenix.support.DataGenerator.generateMarket
import phoenix.support.DataGenerator.generateSport
import phoenix.support.DataGenerator.generateTournament

class MarketDataConvertersSpec extends AnyWordSpecLike with Matchers {
  "MarketDataConverters" should {

    val sport = generateSport()
    val tournament = generateTournament()
    val fixture = generateFixture()
    val market1, market2 = generateMarket()
    val awayScore = fixture.latestScore.away
    val homeScore = fixture.latestScore.home

    s"correctly format ${classOf[FixtureDetailData].getSimpleName}" in {
      val fixtureData = MarketsRepository.FixtureData(sport, tournament, fixture, Seq(market1, market2))
      val result: FixtureDetailData = MarketDataConverters.toFixtureDetailData(fixtureData)
      val expected = FixtureDetailData(
        fixtureId = fixture.fixtureId,
        fixtureName = fixture.name,
        startTime = fixture.startTime,
        isLive = fixture.isLive,
        sport = sport,
        tournament = tournament,
        status = fixture.lifecycleStatus,
        score = fixture.latestScore,
        markets = Map.empty,
        marketsList = Set.empty,
        marketsTotalCount = 2,
        competitors = fixture.competitors
          .map(
            c =>
              c.qualifier.toLowerCase -> CompetitorWithScore(
                c.competitorId,
                c.name,
                c.qualifier,
                c.qualifier match {
                  case "away" => awayScore
                  case "home" => homeScore
                }))
          .toMap)

      result.copy(markets = Map.empty, marketsList = Set.empty) mustBe expected
    }

    s"correctly format ${classOf[FixtureDetailData].getSimpleName} when competitor qualifier is uppercase" in {
      val fixtureWithUppercaseCompetitorQualifiers =
        fixture.copy(competitors = fixture.competitors.map(c => c.copy(qualifier = c.qualifier.toUpperCase)))
      val fixtureData = MarketsRepository.FixtureData(
        sport,
        tournament,
        fixtureWithUppercaseCompetitorQualifiers,
        Seq(market1, market2))

      val expected = FixtureDetailData(
        fixtureId = fixture.fixtureId,
        fixtureName = fixture.name,
        startTime = fixture.startTime,
        isLive = fixture.isLive,
        sport = sport,
        tournament = tournament,
        status = fixture.lifecycleStatus,
        score = fixture.latestScore,
        markets = Map.empty,
        marketsList = Set.empty,
        marketsTotalCount = 2,
        competitors = fixture.competitors
          .map(
            c =>
              c.qualifier.toLowerCase -> CompetitorWithScore(
                c.competitorId,
                c.name,
                c.qualifier.toUpperCase,
                c.qualifier match {
                  case "away" => awayScore
                  case "home" => homeScore
                }))
          .toMap)

      val result: FixtureDetailData = MarketDataConverters.toFixtureDetailData(fixtureData)

      result.copy(markets = Map.empty, marketsList = Set.empty) mustBe expected
    }

    s"correctly format ${classOf[FixtureNavigationData].getSimpleName}" in {
      pending
    }

    s"correctly format ${classOf[TradingMarketNavigationData].getSimpleName}" in {
      pending
    }
  }
}
