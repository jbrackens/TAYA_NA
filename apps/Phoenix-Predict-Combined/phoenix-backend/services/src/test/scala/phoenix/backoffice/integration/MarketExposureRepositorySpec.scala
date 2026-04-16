package phoenix.backoffice.integration

import org.scalactic.TypeCheckedTripleEquals
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.backoffice.MarketExposure
import phoenix.backoffice.MarketExposureRepository
import phoenix.backoffice.SlickMarketExposureRepository
import phoenix.core.currency.MoneyAmount
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateMoneyAmount
import phoenix.support.DataGenerator.generateSelectionId
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

final class MarketExposureRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with TypeCheckedTripleEquals
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  withRepository { objectUnderTest =>
    "Market exposure repository" should {
      "not find non existing market exposures" in {
        await(objectUnderTest.findExposure(generateMarketId(), generateSelectionId())) shouldBe None
      }

      "insert new market exposures" in {
        // given
        // ---

        // when
        val (marketId, selectionId, totalStakedAmount, potentialLossAmount) =
          (generateMarketId(), generateSelectionId(), generateMoneyAmount(), generateMoneyAmount())
        await(
          objectUnderTest.updateExposure(
            marketId,
            selectionId,
            totalStakedDelta = totalStakedAmount,
            potentialLossDelta = potentialLossAmount))

        // then
        await(objectUnderTest.findExposure(marketId, selectionId)).get shouldBe MarketExposure(
          marketId,
          selectionId,
          totalStaked = totalStakedAmount,
          potentialLoss = potentialLossAmount)
      }

      "sum over an already existing exposure" in {
        // given
        val (marketId, selectionId, totalStakedAmount, potentialLossAmount) =
          (generateMarketId(), generateSelectionId(), generateMoneyAmount(), generateMoneyAmount())
        await(
          objectUnderTest.updateExposure(
            marketId,
            selectionId,
            totalStakedDelta = totalStakedAmount,
            potentialLossDelta = potentialLossAmount))

        // when
        val positiveTotalStakedDelta = MoneyAmount(100)
        val negativeTotalStakedDelta = MoneyAmount(-1000)

        val positivePotentialLossDelta = MoneyAmount(200)
        val negativePotentialLossDelta = MoneyAmount(-2000)

        await(
          objectUnderTest.updateExposure(marketId, selectionId, positiveTotalStakedDelta, positivePotentialLossDelta))
        await(
          objectUnderTest.updateExposure(marketId, selectionId, negativeTotalStakedDelta, negativePotentialLossDelta))

        // then
        await(objectUnderTest.findExposure(marketId, selectionId)).get shouldBe
        MarketExposure(
          marketId,
          selectionId,
          totalStakedAmount + positiveTotalStakedDelta + negativeTotalStakedDelta,
          potentialLossAmount + positivePotentialLossDelta + negativePotentialLossDelta)
      }
    }
  }

  private[this] def withRepository(f: MarketExposureRepository => Any): Unit = {
    val repository = new SlickMarketExposureRepository(dbConfig)
    f(repository)
  }
}
