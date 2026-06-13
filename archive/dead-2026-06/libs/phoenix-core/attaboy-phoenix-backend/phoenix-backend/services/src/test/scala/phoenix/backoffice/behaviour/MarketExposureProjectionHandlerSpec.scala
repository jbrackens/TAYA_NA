package phoenix.backoffice.behaviour

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.backoffice._
import phoenix.bets.BetProtocol.Events.BetSettled
import phoenix.bets.support.BetDataGenerator
import phoenix.core.currency.MoneyAmount
import phoenix.support.DataGenerator
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateMoneyAmount
import phoenix.support.DataGenerator.generateSelectionId
import phoenix.support.FutureSupport

final class MarketExposureProjectionHandlerSpec extends AnyWordSpecLike with FutureSupport with Matchers {
  "A MarketExposureProjectionHandler" when {

    val existingExposure = MarketExposure(
      generateMarketId(),
      generateSelectionId(),
      totalStaked = generateMoneyAmount(),
      potentialLoss = generateMoneyAmount())
    val existingExposures = Set(existingExposure)

    "receiving a BetOpened event" should {

      "insert a new MarketExposure when it didn't exist before" in {
        // Given
        val repository = new InMemoryMarketExposureRepository(initialExposures = existingExposures)
        val event = BetDataGenerator.generateBetOpenedEvent()
        val betData = event.betData

        // When
        MarketExposureProjectionHandler.handleEvent(event, repository).futureValue

        // Then
        val newTotalStakedAmount = MoneyAmount(betData.stake.value.amount)
        val newPotentialLossAmount = MoneyAmount(betData.stake.value.amount * (betData.odds.value - 1))
        val newMarkets = existingExposures + MarketExposure(
            betData.marketId,
            betData.selectionId,
            newTotalStakedAmount,
            newPotentialLossAmount)
        repository.exposures() shouldBe newMarkets
      }

      "increase the exposure if it already existed before" in {
        // Given
        val event = BetDataGenerator.generateBetOpenedEvent()
        val betData = event.betData
        val initialMarketExposures =
          existingExposures + MarketExposure(
            betData.marketId,
            betData.selectionId,
            totalStaked = MoneyAmount(100),
            potentialLoss = MoneyAmount(200))
        val repository = new InMemoryMarketExposureRepository(initialExposures = initialMarketExposures)

        // When
        MarketExposureProjectionHandler.handleEvent(event, repository).futureValue

        // Then
        val newTotalStakedAmount = MoneyAmount(100) + MoneyAmount(betData.stake.value.amount)
        val newPotentialLossAmount =
          MoneyAmount(200) + MoneyAmount(betData.stake.value.amount * (betData.odds.value - 1))
        val newExposures = existingExposures + MarketExposure(
            betData.marketId,
            betData.selectionId,
            totalStaked = newTotalStakedAmount,
            potentialLoss = newPotentialLossAmount)
        repository.exposures() shouldBe newExposures
      }
    }

    "receiving a BetSettled event" should {

      "decrease the exposure if it already existed before" in {
        // Given
        val event =
          BetSettled(
            DataGenerator.generateBetId(),
            DataGenerator.generateBetData(),
            DataGenerator.generateReservationId(),
            winner = DataGenerator.generateBoolean())
        val betData = event.betData
        val initialMarketExposures =
          existingExposures + MarketExposure(
            betData.marketId,
            betData.selectionId,
            totalStaked = MoneyAmount(1200),
            potentialLoss = MoneyAmount(3600))
        val repository = new InMemoryMarketExposureRepository(initialExposures = initialMarketExposures)

        // When
        MarketExposureProjectionHandler.handleEvent(event, repository).futureValue

        // Then
        val newTotalStakedAmount = MoneyAmount(1200) - MoneyAmount(betData.stake.value.amount)
        val newPotentialLossAmount =
          MoneyAmount(3600) - MoneyAmount(betData.stake.value.amount * (betData.odds.value - 1))
        val newExposures = existingExposures + MarketExposure(
            betData.marketId,
            betData.selectionId,
            totalStaked = newTotalStakedAmount,
            potentialLoss = newPotentialLossAmount)
        repository.exposures() shouldBe newExposures
      }
    }
  }
}
