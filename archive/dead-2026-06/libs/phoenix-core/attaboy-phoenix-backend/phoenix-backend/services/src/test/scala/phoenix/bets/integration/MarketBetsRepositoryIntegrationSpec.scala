package phoenix.bets.integration

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.domain.MarketBet
import phoenix.bets.infrastructure.SlickMarketBetsRepository
import phoenix.core.domain.DataProvider
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

final class MarketBetsRepositoryIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  private val objectUnderTest = new SlickMarketBetsRepository(dbConfig)

  "Market bets repository" should {
    "be able to create and retrieve open bets" in {
      // given
      val createBets = for {
        _ <- objectUnderTest.save(
          MarketBet(BetId("market1_bet1"), MarketId(DataProvider.Oddin, "market1"), BetStatus.Open))
        _ <- objectUnderTest.save(
          MarketBet(BetId("market2_bet1"), MarketId(DataProvider.Oddin, "market2"), BetStatus.Settled))
        _ <- objectUnderTest.save(
          MarketBet(BetId("market1_bet2"), MarketId(DataProvider.Oddin, "market1"), BetStatus.Open))
        _ <- objectUnderTest.save(
          MarketBet(BetId("market1_bet3"), MarketId(DataProvider.Oddin, "market1"), BetStatus.Voided))
      } yield ()
      await(createBets)

      // when
      val allBetsForMarket = await(objectUnderTest.openBetsForMarket(MarketId(DataProvider.Oddin, "market1")))

      // then
      allBetsForMarket shouldBe Set(
        MarketBet(BetId("market1_bet1"), MarketId(DataProvider.Oddin, "market1"), BetStatus.Open),
        MarketBet(BetId("market1_bet2"), MarketId(DataProvider.Oddin, "market1"), BetStatus.Open))
    }
  }
}
