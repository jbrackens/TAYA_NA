package phoenix.dbviews.integration

import java.time.OffsetDateTime

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetProtocol.Events._
import phoenix.bets.support.BetDataGenerator
import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.dbviews.domain.model.SportsWagers
import phoenix.dbviews.domain.model.SportsWagers._
import phoenix.dbviews.infrastructure.View06SportsWagersProjectionHandler
import phoenix.dbviews.infrastructure.View06SportsWagersProjectionHandler.MarketData
import phoenix.markets.MarketCategory
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.support.DataGenerator

class View06SportsWagersProjectionHandlerSpec extends AnyWordSpecLike with Matchers {

  val clock = Clock.utcClock

  "View06SportsWagersProjectionHandler" should {

    "handle BetOpened event" in {
      val event = BetDataGenerator.generateBetOpenedEvent()
      val marketData = generateMarketData()
      val timestamp = clock.currentOffsetDateTime()
      val transaction = transform(event, marketData, timestamp)

      transaction shouldBe Some(
        SportsWagers.Transaction(
          betId = event.betId,
          fixtureId = marketData.fixtureId,
          punterId = event.betData.punterId,
          transactionId = Some(event.reservationId.unwrap),
          timestamp = timestamp,
          transactionType = TransactionType.Created,
          transactionReason = None,
          toWager = event.betData.punterStake,
          toWin = event.betData.potentialCompanyLoss,
          toPay = event.betData.winnerFunds,
          actualPayout = None,
          wagerLeagues = marketData.sportAbbreviation,
          wagerStyle = WagerStyle.MoneyLine,
          wagerOdds = Some(event.betData.odds.toAmericanOdds)))
    }

    "handle BetSettled event" in {
      val event = BetDataGenerator.generateBetSettledEvent()
      val marketData = generateMarketData()
      val timestamp = clock.currentOffsetDateTime()
      val transaction = transform(event, marketData, timestamp)

      transaction shouldBe Some(
        SportsWagers.Transaction(
          betId = event.betId,
          fixtureId = marketData.fixtureId,
          punterId = event.betData.punterId,
          transactionId = Some(event.reservationId.unwrap),
          timestamp = timestamp,
          transactionType = TransactionType.Settled,
          transactionReason = None,
          toWager = event.betData.punterStake,
          toWin = event.betData.potentialCompanyLoss,
          toPay = event.betData.winnerFunds,
          actualPayout = Some(if (event.winner) event.betData.winnerFunds else MoneyAmount.zero.get),
          wagerLeagues = marketData.sportAbbreviation,
          wagerStyle = WagerStyle.MoneyLine,
          wagerOdds = Some(event.betData.odds.toAmericanOdds)))
    }

    "handle BetResettled event" in {
      val event = BetDataGenerator.generateBetResettledEvent()
      val marketData = generateMarketData()
      val timestamp = clock.currentOffsetDateTime()
      val transaction = transform(event, marketData, timestamp)

      transaction shouldBe Some(
        SportsWagers.Transaction(
          betId = event.betId,
          fixtureId = marketData.fixtureId,
          punterId = event.betData.punterId,
          transactionId = None,
          timestamp = timestamp,
          transactionType = TransactionType.Resettled,
          transactionReason = None,
          toWager = event.betData.punterStake,
          toWin = event.betData.potentialCompanyLoss,
          toPay = event.betData.winnerFunds,
          actualPayout =
            Some(if (event.winner) event.betData.winnerFunds else MoneyAmount.zero.get - event.betData.winnerFunds),
          wagerLeagues = marketData.sportAbbreviation,
          wagerStyle = WagerStyle.MoneyLine,
          wagerOdds = Some(event.betData.odds.toAmericanOdds)))
    }

    "handle BetCancelled event" in {
      val event = BetDataGenerator.generateBetCancelledEvent()
      val marketData = generateMarketData()
      val timestamp = clock.currentOffsetDateTime()
      val transaction = transform(event, marketData, timestamp)

      transaction shouldBe Some(
        SportsWagers.Transaction(
          betId = event.betId,
          fixtureId = marketData.fixtureId,
          punterId = event.betData.punterId,
          transactionId = Some(event.reservationId.unwrap),
          timestamp = timestamp,
          transactionType = TransactionType.Cancelled,
          transactionReason = Some(event.cancellationReason.value),
          toWager = event.betData.punterStake,
          toWin = event.betData.potentialCompanyLoss,
          toPay = event.betData.winnerFunds,
          actualPayout = None,
          wagerLeagues = marketData.sportAbbreviation,
          wagerStyle = WagerStyle.MoneyLine,
          wagerOdds = Some(event.betData.odds.toAmericanOdds)))
    }

    "handle BetVoided event" in {
      val event = BetDataGenerator.generateBetVoidedEvent()
      val marketData = generateMarketData()
      val timestamp = clock.currentOffsetDateTime()
      val transaction = transform(event, marketData, timestamp)

      transaction shouldBe Some(
        SportsWagers.Transaction(
          betId = event.betId,
          fixtureId = marketData.fixtureId,
          punterId = event.betData.punterId,
          transactionId = Some(event.reservationId.unwrap),
          timestamp = timestamp,
          transactionType = TransactionType.Voided,
          transactionReason = Some("BetVoided"),
          toWager = event.betData.punterStake,
          toWin = event.betData.potentialCompanyLoss,
          toPay = event.betData.winnerFunds,
          actualPayout = None,
          wagerLeagues = marketData.sportAbbreviation,
          wagerStyle = WagerStyle.MoneyLine,
          wagerOdds = Some(event.betData.odds.toAmericanOdds)))
    }

    "handle BetPushed event" in {
      val event = BetDataGenerator.generateBetPushedEvent()
      val timestamp = clock.currentOffsetDateTime()
      val transaction = transform(event, generateMarketData(), timestamp)

      transaction shouldBe None
    }

    "handle BetFailed event" in {
      val event = BetDataGenerator.generateBetFailedEventWithMarketDoesNotExistReason()
      val timestamp = clock.currentOffsetDateTime()
      val transaction = transform(event, generateMarketData(), timestamp)

      transaction shouldBe None
    }

  }

  def transform(event: BetEvent, marketWithDetails: MarketData, timestamp: OffsetDateTime): Option[Transaction] =
    View06SportsWagersProjectionHandler.transform[Option](event, timestamp, _ => Some(Some(marketWithDetails))).flatten

  def generateMarketData(fixtureId: FixtureId = DataGenerator.generateFixtureId()): MarketData =
    MarketData(fixtureId, "LoL", MarketCategory("First dragon"))

}
