package phoenix.reports.infrastructure
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.reports.domain.Bet
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.bets.NormalizedStake
import phoenix.reports.domain.model.markets.Fixture
import phoenix.reports.domain.model.markets.FixtureMarket
import phoenix.reports.domain.model.markets.Market
import phoenix.reports.domain.model.markets.MarketSelection
import phoenix.support.DataGenerator.generateBetId
import phoenix.support.DataGenerator.generateFixtureId
import phoenix.support.DataGenerator.generateFixtureName
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateMarketName
import phoenix.support.DataGenerator.generateSelectionId
import phoenix.support.DataGenerator.generateStake
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DataGenerator.randomOption

object ReportsDataGenerator {
  private[reports] def generateNormalizedStake(): NormalizedStake =
    NormalizedStake.from(generateStake())

  private[reports] def generateBet(): Bet =
    Bet(
      generateBetId(),
      generatePunterId(),
      generateMarketId(),
      generateSelectionId(),
      generateNormalizedStake(),
      placedAt = randomOffsetDateTime(),
      closedAt = randomOption(randomOffsetDateTime()),
      initialSettlementData = randomOption(randomOffsetDateTime()))

  private[reports] def extractBetData(event: BetEvent): Bet =
    event match {
      case BetEvent.BetSettled(_, betData, operationTime, _, _) =>
        Bet(
          betData.betId,
          betData.punterId,
          betData.marketId,
          betData.selectionId,
          NormalizedStake(event.betData.stake),
          placedAt = operationTime,
          closedAt = Some(operationTime),
          initialSettlementData = Some(operationTime))
      case _ =>
        Bet(
          event.betData.betId,
          event.betData.punterId,
          event.betData.marketId,
          event.betData.selectionId,
          NormalizedStake(event.betData.stake),
          placedAt = event.operationTime,
          closedAt = None,
          initialSettlementData = None)
    }

  private[reports] def generateMarket(): Market =
    Market(generateMarketId(), generateMarketName(), generateFixtureId())

  private[reports] def generateFixture(): Fixture =
    Fixture(generateFixtureId(), name = generateFixtureName(), startTime = randomOffsetDateTime())

  private[reports] def generateFixtureMarket(
      marketId: MarketId = generateMarketId(),
      selections: Seq[MarketSelection] = Seq.empty[MarketSelection]): FixtureMarket = {
    val market = generateMarket().copy(marketId = marketId)
    val fixture = generateFixture().copy(fixtureId = market.fixtureId)
    FixtureMarket(fixture, market, selections)
  }
}
