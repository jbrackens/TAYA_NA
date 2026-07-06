package phoenix.bets

import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import cats.data.NonEmptyList
import org.scalatest.BeforeAndAfterAll
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetValidator.GeolocationNotAllowed
import phoenix.bets.BetValidator.MarketDoesNotExist
import phoenix.bets.BetValidator.MarketNotBettable
import phoenix.bets.BetValidator.OddsHaveChangedError
import phoenix.bets.BetValidator.SelectionDoesNotExist
import phoenix.bets.BetValidator.WalletReservationError
import phoenix.bets.support.BetDataGenerator.generateMaximumAllowedStakeAmount
import phoenix.bets.support.TestGeolocationValidator
import phoenix.boundedcontexts.market.MarketBoundedContextMock
import phoenix.boundedcontexts.wallet.WalletContextProviderFailure
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketsBoundedContext.MarketNotFound
import phoenix.support.DataGenerator._
import phoenix.support.FutureSupport
import phoenix.support.TestUtils
import phoenix.support.UnsafeValueObjectExtensions._

final class BetValidatorSpec
    extends ScalaTestWithActorTestKit(TestUtils.eventSourcedBehaviorTestKitConfig)
    with AnyWordSpecLike
    with FutureSupport
    with BeforeAndAfterAll {

  implicit val clock: Clock = Clock.utcClock
  implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())
  implicit val mat: Materializer = Materializer(testKit.system)

  override def afterAll(): Unit = {
    super.afterAll()
    TestUtils.testCleanUp(system)
  }

  "A BetValidator" should {
    "forward reservation id if all validations succeed" in {
      // given
      val marketToBetOn = generateInitializedMarket()
      val markets = MarketBoundedContextMock.returningDgeAllowedMarketState(marketToBetOn)
      val wallets = new WalletContextProviderSuccess(clock)
      val geolocationValidator = TestGeolocationValidator.valid
      val maximumAllowedStakeAmount = generateMaximumAllowedStakeAmount()
      val objectUnderTest = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)
      val betData = generateBetDataForMarketState(marketToBetOn).copy(stake = Stake(DefaultCurrencyMoney(
        generateMoneyAmount(maximumAmountExclusive = maximumAllowedStakeAmount.value.amount.toInt))).unsafe())

      // when
      val validationResult = await(objectUnderTest.validateBet(generateBetId(), betData, generateGeolocation()).value)

      // then
      validationResult.isRight should be(true)
    }

    "fail if stake was too high" in {
      // given
      val marketToBetOn = generateInitializedMarket()
      val markets = MarketBoundedContextMock.returningDgeAllowedMarketState(marketToBetOn)
      val wallets = new WalletContextProviderSuccess(clock)
      val geolocationValidator = TestGeolocationValidator.valid
      val maximumAllowedStakeAmount = generateMaximumAllowedStakeAmount()
      val objectUnderTest = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)
      val betData =
        generateBetDataForMarketState(marketToBetOn).copy(stake =
          Stake(DefaultCurrencyMoney(maximumAllowedStakeAmount.value + MoneyAmount(1))).unsafe())

      // when
      val validationResult = await(objectUnderTest.validateBet(generateBetId(), betData, generateGeolocation()).value)

      // then
      validationResult shouldBe Left(NonEmptyList.one(BetValidator.StakeTooHigh(betData.stake)))
    }

    "fail if wallets check fails" in {
      // given
      val marketToBetOn = generateInitializedMarket()
      val markets = MarketBoundedContextMock.returningDgeAllowedMarketState(marketToBetOn)
      val wallets = new WalletContextProviderFailure
      val geolocationValidator = TestGeolocationValidator.valid
      val maximumAllowedStakeAmount = generateMaximumAllowedStakeAmount()
      val objectUnderTest = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)

      // when
      val validationResult = await(
        objectUnderTest
          .validateBet(generateBetId(), generateBetDataForMarketState(marketToBetOn), generateGeolocation())
          .value)

      // then
      validationResult.isLeft should be(true)
    }

    "fail if trying to bet on not existing market" in {
      // given
      val markets =
        MarketBoundedContextMock(getDgeAllowedMarketStateFn = id => Future.successful(Left(MarketNotFound(id))))
      val wallets = new WalletContextProviderSuccess(clock)
      val geolocationValidator = TestGeolocationValidator.valid
      val maximumAllowedStakeAmount = generateMaximumAllowedStakeAmount()
      val objectUnderTest = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)

      // when
      val validationResult =
        awaitLeft(objectUnderTest.validateBet(generateBetId(), generateBetData(), generateGeolocation()))

      // then
      validationResult should matchPattern {
        case NonEmptyList(MarketDoesNotExist(_), _) =>
      }
    }

    "fail if trying to bet on not bettable market" in {
      // given
      val marketToBetOn = generateInitializedMarket(lifecycle = NotBettable(BackofficeChange("Market frozen")))
      val markets = MarketBoundedContextMock.returningDgeAllowedMarketState(marketToBetOn)
      val wallets = new WalletContextProviderSuccess(clock)
      val geolocationValidator = TestGeolocationValidator.valid
      val maximumAllowedStakeAmount = generateMaximumAllowedStakeAmount()
      val objectUnderTest = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)

      // when
      val validationResult =
        awaitLeft(
          objectUnderTest
            .validateBet(generateBetId(), generateBetDataForMarketState(marketToBetOn), generateGeolocation()))

      // then
      validationResult should matchPattern {
        case NonEmptyList(MarketNotBettable(_), _) =>
      }
    }

    "fail if trying to bet on non existing selection" in {
      // given
      val marketToBetOn = generateInitializedMarket()
      val markets = MarketBoundedContextMock.returningDgeAllowedMarketState(marketToBetOn)
      val wallets = new WalletContextProviderSuccess(clock)
      val geolocationValidator = TestGeolocationValidator.valid
      val maximumAllowedStakeAmount = generateMaximumAllowedStakeAmount()
      val objectUnderTest = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)

      // when
      val betForNonExistingSelection =
        generateBetDataForMarketState(marketToBetOn).copy(selectionId = generateSelectionId())
      val validationResult =
        awaitLeft(objectUnderTest.validateBet(generateBetId(), betForNonExistingSelection, generateGeolocation()))

      // then
      validationResult should matchPattern {
        case NonEmptyList(SelectionDoesNotExist(_, _), _) =>
      }
    }

    "fail if market selection odds changed in between" in {
      // given
      val marketToBetOn = generateInitializedMarket()
      val markets = MarketBoundedContextMock.returningDgeAllowedMarketState(marketToBetOn)
      val wallets = new WalletContextProviderSuccess(clock)
      val geolocationValidator = TestGeolocationValidator.valid
      val maximumAllowedStakeAmount = generateMaximumAllowedStakeAmount()
      val objectUnderTest = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)

      // when
      val betWithDifferentOdds = generateBetDataForMarketState(marketToBetOn).copy(odds = generateOdds())
      val validationResult =
        awaitLeft(objectUnderTest.validateBet(generateBetId(), betWithDifferentOdds, generateGeolocation()))

      // then
      validationResult should matchPattern {
        case NonEmptyList(OddsHaveChangedError(_, _), _) =>
      }
    }

    "fail if geolocation check fails" in {
      // given
      val marketToBetOn = generateInitializedMarket()
      val markets = MarketBoundedContextMock.returningDgeAllowedMarketState(marketToBetOn)
      val wallets = new WalletContextProviderSuccess(clock)
      val geolocationValidator = TestGeolocationValidator.invalid
      val maximumAllowedStakeAmount = generateMaximumAllowedStakeAmount()
      val objectUnderTest = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)

      // when
      val validationResult =
        awaitLeft(
          objectUnderTest
            .validateBet(generateBetId(), generateBetDataForMarketState(marketToBetOn), generateGeolocation()))

      // then
      validationResult should matchPattern {
        case NonEmptyList(GeolocationNotAllowed(_), _) =>
      }
    }

    "collect all side-effectful validation failures" in {
      // given
      val markets = MarketBoundedContextMock.returningAllMarketsException
      val geolocationValidator = TestGeolocationValidator.invalid
      val wallets = new WalletContextProviderSuccess(clock)
      val maximumAllowedStakeAmount = generateMaximumAllowedStakeAmount()
      val objectUnderTest = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)

      // when
      val validationResult =
        awaitLeft(objectUnderTest.validateBet(generateBetId(), generateBetData(), generateGeolocation()))

      // then
      validationResult.toList should matchPattern {
        case MarketDoesNotExist(_) :: GeolocationNotAllowed(_) :: _ =>
      }
    }

    "do not run wallet reservation if validation fails" in {
      // given
      val markets = MarketBoundedContextMock.returningAllMarketsException
      val geolocationValidator = TestGeolocationValidator.valid
      val wallets = new WalletContextProviderFailure
      val maximumAllowedStakeAmount = generateMaximumAllowedStakeAmount()
      val objectUnderTest = new BetValidator(wallets, markets, geolocationValidator, maximumAllowedStakeAmount)

      // when
      val validationResult =
        awaitLeft(objectUnderTest.validateBet(generateBetId(), generateBetData(), generateGeolocation()))

      // then
      validationResult.exists(_.isInstanceOf[WalletReservationError]) shouldBe false
    }
  }
}
