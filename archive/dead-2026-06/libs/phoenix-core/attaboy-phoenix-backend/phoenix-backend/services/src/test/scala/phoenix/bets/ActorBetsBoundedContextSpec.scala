package phoenix.bets

import cats.data.NonEmptyList
import org.scalatest.Inside
import org.scalatest.LoneElement
import org.scalatest.OptionValues
import org.scalatest.concurrent.Eventually.eventually
import org.scalatest.concurrent.PatienceConfiguration
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetValidator.MarketNotBettable
import phoenix.bets.BetsBoundedContext.BetDetails
import phoenix.bets.BetsBoundedContext.BetHistoryQuery
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsBoundedContext.BetView
import phoenix.bets.BetsBoundedContext.UnexpectedStateError
import phoenix.bets.infrastructure.SlickMarketBetsRepository
import phoenix.bets.infrastructure.SlickPunterStakesRepository
import phoenix.bets.support.BetDataGenerator.generateBetsDomainConfig
import phoenix.bets.support.BetDataGenerator.generateCancellationReason
import phoenix.boundedcontexts.market.InMemoryMarkets
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.odds.Odds
import phoenix.core.pagination.Pagination
import phoenix.http.routes.EndpointInputs.TimeRange
import phoenix.markets.LifecycleChangeReason
import phoenix.markets.LifecycleChangeReason.BackofficeCancellation
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.MarketProtocol.Events.MarketCancelled
import phoenix.markets.MarketProtocol.Events.MarketEvent
import phoenix.markets.MarketProtocol.Events.MarketResettled
import phoenix.markets.MarketProtocol.Events.MarketSettled
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.SelectionOdds
import phoenix.punters.PunterDataGenerator.Api._
import phoenix.punters.PunterEntity.PunterId
import phoenix.support.DataGenerator._
import phoenix.support._
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.WalletsBoundedContext

final class ActorBetsBoundedContextSpec
    extends AnyFreeSpec
    with Matchers
    with LoneElement
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with OptionValues
    with Inside {

  val eventuallyTimeout: Timeout = Timeout(awaitTimeout.value * 2)
  val eventuallyInterval: PatienceConfiguration.Interval = awaitInterval
  val stubbedSelection: SelectionOdds =
    SelectionOdds(selectionId = generateSelectionId(), selectionName = "home", odds = Some(Odds(10.0)), active = true)
  val stubbedSelectionList: NonEmptyList[SelectionOdds] = NonEmptyList.one(stubbedSelection)

  implicit val utcClock: Clock = Clock.utcClock
  val hardcodedClock = new FakeHardcodedClock

  "Bets BC" - new BetsBoundedContextScope {
    "should allow opening a bet" in {
      val selectionId = stubbedSelection.selectionId
      val marketId = marketScenarios.bettableMarket(stubbedSelectionList).marketId

      val betId = BetId.random()
      val betData = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(
        betsBC
          .openBet(betId, betData, generateGeolocation(), generateReservationId(), placedAt = randomOffsetDateTime()))

      val details = awaitRight(betsBC.betDetails(betId))
      details.status shouldBe BetState.Status.Open
    }

    "should allow failing a bet" in {
      val betId = BetId.random()
      val marketId = generateMarketId()
      val betData = createBetData(generatePunterId(), generateMarketId(), generateSelectionId())
      awaitRight(betsBC.failBet(betId, betData, NonEmptyList.of(MarketNotBettable(marketId))))
    }

    "should allow getting state of a fail bet" in {
      val betId = BetId.random()
      val marketId = generateMarketId()
      val betData = createBetData(generatePunterId(), generateMarketId(), generateSelectionId())
      awaitRight(betsBC.failBet(betId, betData, NonEmptyList.of(MarketNotBettable(marketId))))

      awaitRight(betsBC.betDetails(betId)).status should ===(BetState.Status.Failed)
    }

    "should allow settling all bets for given market" in {
      // given
      val selectionId = stubbedSelection.selectionId
      val marketId = marketScenarios.bettableMarket(stubbedSelectionList).marketId

      // and
      val firstBetId = BetId.random()
      val firstBetData = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(firstBetId, firstBetData, generateGeolocation()))

      // and
      val secondBetId = BetId.random()
      val secondBetData = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(secondBetId, secondBetData, generateGeolocation()))

      // when
      awaitRight(betsBC.settleBets(marketId, selectionId))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        getBetDetails(firstBetId, betsBC).status shouldBe BetState.Status.Settled
        getBetDetails(secondBetId, betsBC).status shouldBe BetState.Status.Settled
      }
    }

    "should settle bets in response to market event" in {
      // given
      val selectionId = stubbedSelection.selectionId
      val marketId = marketScenarios.bettableMarket(stubbedSelectionList).marketId

      // and
      val betId = BetId.random()
      val bet = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(betId, bet, generateGeolocation()))

      // when
      marketEventsQueue.pushEvent(
        MarketSettled(marketId, selectionId, BackofficeChange(), hardcodedClock.currentOffsetDateTime()))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        getBetDetails(betId, betsBC).status shouldBe BetState.Status.Settled
      }
    }

    "should resettle bets in response to market event" in {
      // given
      val selectionId = stubbedSelection.selectionId
      val marketId = marketScenarios.bettableMarket(stubbedSelectionList).marketId

      // and
      val bet = createBetData(generatePunterId(), marketId, selectionId)
      val selection = SelectionOdds(bet.selectionId, "", Some(bet.odds), true)
      val betId =
        betScenarios.settledBet(bet.punterId, bet.marketId, selection, bet.stake)

      // when
      val resettledAt = hardcodedClock.currentOffsetDateTime()
      marketEventsQueue.pushEvent(MarketResettled(marketId, selectionId, BackofficeChange(), resettledAt))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        getBetDetails(betId, betsBC).status shouldBe BetState.Status.Resettled
      }

    }

    "should allow voiding all bets for given market" in {
      // given
      val selectionId = stubbedSelection.selectionId
      val marketId = marketScenarios.bettableMarket(NonEmptyList.one(stubbedSelection)).marketId

      // and
      val firstBetId = BetId.random()
      val firstBetData = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(firstBetId, firstBetData, generateGeolocation()))

      // and
      val secondBetId = BetId.random()
      val secondBetData = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(secondBetId, secondBetData, generateGeolocation()))

      // when
      awaitRight(betsBC.voidBets(marketId))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        getBetDetails(firstBetId, betsBC).status shouldBe BetState.Status.Voided
        getBetDetails(secondBetId, betsBC).status shouldBe BetState.Status.Voided
      }
    }

    "should void bets in response to market event" in {
      // given
      val selectionId = stubbedSelection.selectionId
      val marketId = marketScenarios.bettableMarket(NonEmptyList.one(stubbedSelection)).marketId

      // and
      val betId = BetId.random()
      val bet = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(betId, bet, generateGeolocation()))

      // when
      marketEventsQueue.pushEvent(
        MarketCancelled(marketId, BackofficeCancellation(), hardcodedClock.currentOffsetDateTime()))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        getBetDetails(betId, betsBC).status shouldBe BetState.Status.Voided
      }
    }

    "should allow pushing all bets for given market" in {
      // given
      val selectionId = stubbedSelection.selectionId
      val marketId = marketScenarios.bettableMarket(NonEmptyList.one(stubbedSelection)).marketId

      // and
      val firstBetId = BetId.random()
      val firstBetData = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(firstBetId, firstBetData, generateGeolocation()))

      // and
      val secondBetId = BetId.random()
      val secondBetData = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(secondBetId, secondBetData, generateGeolocation()))

      // when
      awaitRight(betsBC.pushBets(marketId))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        getBetDetails(firstBetId, betsBC).status shouldBe BetState.Status.Pushed
        getBetDetails(secondBetId, betsBC).status shouldBe BetState.Status.Pushed
      }
    }

    "should push bets in response to market event" in {
      // given
      val selectionId = stubbedSelection.selectionId
      val marketId = marketScenarios.bettableMarket(NonEmptyList.one(stubbedSelection)).marketId

      // and
      val betId = BetId.random()
      val bet = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(betId, bet, generateGeolocation()))

      // when
      marketEventsQueue.pushEvent(
        MarketCancelled(marketId, LifecycleChangeReason.DataSupplierPush(), hardcodedClock.currentOffsetDateTime()))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        getBetDetails(betId, betsBC).status shouldBe BetState.Status.Pushed
      }
    }

    "should allow cancelling an opened bet" in {
      // given
      val selectionId = stubbedSelection.selectionId
      val marketId = marketScenarios.bettableMarket(NonEmptyList.one(stubbedSelection)).marketId
      val adminUser = generateAdminId()
      val cancellationReason = generateCancellationReason()
      val betCancellationTimestamp = randomOffsetDateTime()

      // and
      val betId = BetId.random()
      val bet = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(betId, bet, generateGeolocation()))

      // when
      awaitRight(betsBC.cancelBet(betId, adminUser, cancellationReason, betCancellationTimestamp))

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {
        getBetDetails(betId, betsBC).status shouldBe BetState.Status.Cancelled
      }
    }

    "should fail when trying to cancel an uninitialized bet" in {
      val betId = BetId.random()
      awaitLeft(
        betsBC.cancelBet(
          betId,
          generateAdminId(),
          generateCancellationReason(),
          randomOffsetDateTime())) shouldBe UnexpectedStateError(betId, BetState.Status.Uninitialized)
    }

    "should fail when trying to cancel an already cancelled bet" in {
      // given
      val selectionId = stubbedSelection.selectionId
      val marketId = marketScenarios.bettableMarket(NonEmptyList.one(stubbedSelection)).marketId
      val adminUser = generateAdminId()
      val cancellationReason = generateCancellationReason()
      val betCancellationTimestamp = randomOffsetDateTime()

      // and
      val betId = BetId.random()
      val bet = createBetData(generatePunterId(), marketId, selectionId)
      awaitRight(betScenarios.placeBet(betId, bet, generateGeolocation()))

      // when
      awaitRight(betsBC.cancelBet(betId, adminUser, cancellationReason, betCancellationTimestamp))

      awaitLeft(betsBC.cancelBet(betId, adminUser, cancellationReason, betCancellationTimestamp)) shouldBe
      UnexpectedStateError(betId, BetState.Status.Cancelled)
    }

    "should allow searching for recently placed bets" in {
      // given
      val selectionId = stubbedSelection.selectionId
      val marketOne = marketScenarios.bettableMarket(stubbedSelectionList).marketId
      val marketTwo = marketScenarios.bettableMarket(stubbedSelectionList).marketId
      val punterId = generatePunterId()

      val anotherPunter = generatePunterId()
      val anotherPunterMarket = marketScenarios.bettableMarket(stubbedSelectionList).marketId

      val setup = for {
        _ <- betsBC.openBet(
          BetId.random(),
          createBetData(punterId, marketOne, selectionId),
          generateGeolocation(),
          generateReservationId(),
          placedAt = clock.currentOffsetDateTime())
        _ <- betsBC.openBet(
          BetId.random(),
          createBetData(punterId, marketTwo, selectionId),
          generateGeolocation(),
          generateReservationId(),
          placedAt = clock.currentOffsetDateTime())
        _ <- betsBC.openBet(
          BetId.random(),
          createBetData(anotherPunter, anotherPunterMarket, selectionId),
          generateGeolocation(),
          generateReservationId(),
          placedAt = clock.currentOffsetDateTime())
      } yield ()

      awaitRight(setup)

      // then
      eventually(eventuallyTimeout, eventuallyInterval) {

        val allRecords = Pagination(currentPage = 1, itemsPerPage = 10000)
        val betHistoryQuery =
          BetHistoryQuery(
            placedWithin = Some(TimeRange.lastDays(90)),
            statuses = BetStatus.values.toSet,
            pagination = allRecords)
        val bets = await(betsBC.searchForBets(punterId, betHistoryQuery))

        bets.data should have size 2
      }
    }

    "should allow searching for bets by their outcome" in {
      // given:
      // - 3 settled bets (2 winning bets, 1 losing bet) for one punter
      // - 1 settled, winning bet for another punter
      // - 1 open bet for each of these punters
      val selectionId = stubbedSelection.selectionId
      val punterId = generatePunterId()
      val otherPunterId = generatePunterId()

      val marketOne = marketScenarios.bettableMarket(stubbedSelectionList).marketId
      val marketTwo = marketScenarios.bettableMarket(stubbedSelectionList).marketId
      val marketThree = marketScenarios.bettableMarket(stubbedSelectionList).marketId
      val marketFour = marketScenarios.bettableMarket(stubbedSelectionList).marketId

      val winningBetOneId = BetId.random()
      val winningBetTwoId = BetId.random()
      val losingBetId = BetId.random()
      val otherPunterWinningBetId = BetId.random()

      val setup = for {
        _ <-
          betScenarios.placeBet(winningBetOneId, createBetData(punterId, marketOne, selectionId), generateGeolocation())
        _ <-
          betScenarios.placeBet(winningBetTwoId, createBetData(punterId, marketTwo, selectionId), generateGeolocation())
        _ <-
          betScenarios.placeBet(losingBetId, createBetData(punterId, marketThree, selectionId), generateGeolocation())
        _ <-
          betScenarios.placeBet(BetId.random(), createBetData(punterId, marketFour, selectionId), generateGeolocation())
        _ <- betScenarios.placeBet(
          BetId.random(),
          createBetData(otherPunterId, marketFour, selectionId),
          generateGeolocation())
        _ <- betScenarios.placeBet(
          otherPunterWinningBetId,
          createBetData(otherPunterId, marketOne, selectionId),
          generateGeolocation())
      } yield ()

      awaitRight(setup)

      marketEventsQueue.pushEvent(
        MarketSettled(marketOne, selectionId, BackofficeChange(), hardcodedClock.currentOffsetDateTime()))
      marketEventsQueue.pushEvent(
        MarketSettled(marketTwo, selectionId, BackofficeChange(), hardcodedClock.currentOffsetDateTime()))
      marketEventsQueue.pushEvent(
        MarketSettled(marketThree, generateSelectionId(), BackofficeChange(), hardcodedClock.currentOffsetDateTime()))

      def verifySettledBet(
          bet: BetView,
          expectedBetId: BetId,
          expectedOutcome: BetOutcome,
          expectedProfitLoss: BigDecimal) = {
        bet.betId shouldBe expectedBetId
        bet.legs.loneElement.status shouldBe BetStatus.Settled
        bet.legs.loneElement.outcome.value shouldBe expectedOutcome
        bet.profitLoss shouldBe Some(expectedProfitLoss)
      }

      val allRecords = Pagination(currentPage = 1, itemsPerPage = 10000)
      val winningBetsQuery = BetHistoryQuery(
        placedWithin = Some(TimeRange.lastDays(90)),
        statuses = BetStatus.values.toSet,
        outcome = Some(BetOutcome.Won),
        pagination = allRecords)
      val expectedWinningBetsIds = Seq(winningBetOneId, winningBetTwoId).sortBy(_.value)

      eventually(eventuallyTimeout, eventuallyInterval) {
        // when: searching for winning bets of a first punter
        val winningBets = await(betsBC.searchForBets(punterId, winningBetsQuery))

        // then: we get expected two bets
        val betsInExpectedStableOrder = winningBets.data.sortBy(_.betId.value)
        inside(betsInExpectedStableOrder) {
          case Seq(winningBet1, winningBet2) =>
            verifySettledBet(
              winningBet1,
              expectedBetId = expectedWinningBetsIds.head,
              expectedOutcome = BetOutcome.Won,
              expectedProfitLoss = 21.37 * 9)
            verifySettledBet(
              winningBet2,
              expectedBetId = expectedWinningBetsIds.last,
              expectedOutcome = BetOutcome.Won,
              expectedProfitLoss = 21.37 * 9)
        }
      }

      val losingBetsQuery = BetHistoryQuery(
        placedWithin = Some(TimeRange.lastDays(90)),
        statuses = Set(BetStatus.Settled),
        outcome = Some(BetOutcome.Lost),
        pagination = allRecords)

      eventually(eventuallyTimeout, eventuallyInterval) {
        // when: searching for losing bets of a first punter
        val losingBets = await(betsBC.searchForBets(punterId, losingBetsQuery))

        // then: we get expected single bet
        inside(losingBets.data) {
          case Seq(losingBet) =>
            verifySettledBet(
              losingBet,
              expectedBetId = losingBetId,
              expectedOutcome = BetOutcome.Lost,
              expectedProfitLoss = 21.37)
        }
      }
    }
  }

  trait BetsBoundedContextScope {
    val marketBetsRepository = new SlickMarketBetsRepository(dbConfig)
    val punterStakeRepository = new SlickPunterStakesRepository(dbConfig)
    val marketsBC: MarketsBoundedContext = new InMemoryMarkets()
    val walletsBC: WalletsBoundedContext = new WalletContextProviderSuccess(clock)
    val marketEventsQueue: TestEventQueue[MarketEvent] = TestEventQueue.instance
    val betsBC: BetsBoundedContext =
      ActorBetsBoundedContext(system, marketsBC, marketBetsRepository, dbConfig, marketEventsQueue)
    val betsDomainConfig: BetsDomainConfig = generateBetsDomainConfig()

    val marketScenarios = new MarketScenarios(marketsBC)
    val betScenarios = new BetScenarios(
      betsBC,
      walletsBC,
      marketsBC,
      marketBetsRepository,
      punterStakeRepository,
      AlwaysValidGeolocationValidator,
      betsDomainConfig,
      clock)
  }

  private def getBetDetails(betId: BetId, betsBoundedContext: BetsBoundedContext): BetDetails =
    awaitRight(betsBoundedContext.betDetails(betId))

  private def createBetData(punterId: PunterId, marketId: MarketId, selectionId: String): BetData =
    BetData(
      punterId,
      marketId,
      selectionId,
      stake = Stake.unsafe(DefaultCurrencyMoney(21.37)),
      odds = stubbedSelection.odds.get)
}
