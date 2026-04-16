package phoenix.acceptance

import akka.stream.scaladsl.Sink
import cats.data.NonEmptyList
import org.scalatest.GivenWhenThen
import org.scalatest.concurrent.Eventually.eventually
import org.scalatest.concurrent.PatienceConfiguration.Interval
import org.scalatest.concurrent.PatienceConfiguration.Timeout
import org.scalatest.featurespec.AnyFeatureSpec
import org.scalatest.matchers.should.Matchers
import org.scalatest.time.Millis
import org.scalatest.time.Seconds
import org.scalatest.time.Span

import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetStateUpdate
import phoenix.bets.BetStateUpdate.TargetState.Voided
import phoenix.bets.BetValidator.MarketDoesNotExist
import phoenix.bets.BetValidator.MarketNotBettable
import phoenix.bets.BetValidator.OddsHaveChangedError
import phoenix.bets.BetValidator.WalletReservationError
import phoenix.bets.Stake
import phoenix.bets.application.PlaceBetError.InvalidBetPlacement
import phoenix.bets.support.BetDataGenerator
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.odds.Odds
import phoenix.markets.LifecycleChangeReason.BackofficeCancellation
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.SelectionOdds
import phoenix.punters.PunterDataGenerator.Api
import phoenix.punters.PunterEntity.PunterId
import phoenix.support.DataGenerator.generateBetId
import phoenix.support.DataGenerator.generateGeolocation
import phoenix.support.DataGenerator.generateSelectionId
import phoenix.support.DataGenerator.generateSelectionName
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.TestScenarios.RandomMarket
import phoenix.support._
import phoenix.wallets.WalletsBoundedContextProtocol.InsufficientFundsError
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

final class BettingAcceptanceSpec
    extends AnyFeatureSpec
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with KeycloakIntegrationSpec
    with GivenWhenThen {

  val eventuallyTimeout: Timeout = Timeout(Span(60, Seconds))
  val eventuallyInterval: Interval = Interval(Span(10, Millis))

  Feature("Betting") {

    val env = new ProductionLikeEnvironment(system, keycloakRealm.config, dbConfig)

    val initialFunds = DefaultCurrencyMoney(100)
    val initialOdds = Some(Odds(2.0))
    val selection = SelectionOdds(generateSelectionId(), generateSelectionName(), initialOdds, active = true)

    def withPunterWalletAndMarket(test: (PunterId, WalletId, MarketId) => Unit): Unit = {

      Given("a punter with a wallet")
      val punter = env.punterScenarios.punterWithWallet(initialFunds)

      And("a bettable market")
      val market = env.marketScenarios.bettableMarket(NonEmptyList.one(selection))

      test(punter.punterId, punter.walletId, market.marketId)
    }

    def failedBetStateUpdate(betId: BetId, betData: BetData, reason: String) =
      BetStateUpdate(
        betId,
        state = BetStateUpdate.TargetState.Failed,
        betData = betData,
        winner = false,
        reason = Some(reason))

    Scenario("Active punter with sufficient funds places a bet on a bettable market") {

      withPunterWalletAndMarket((punterId, _, marketId) => {

        When("a bet is placed by the punter on the market")
        val betId = generateBetId()
        val betData =
          BetData(punterId, marketId, selection.selectionId, Stake.unsafe(DefaultCurrencyMoney(10)), Odds(2.0))

        val betEventStream = await(env.betEventStreams.streamStateUpdates(punterId))

        Then("creating the bet should not cause errors")
        awaitRight(env.betScenarios.placeBet(betId, betData, generateGeolocation()))

        And("the bet update notification should be received on the punter's bet event stream")
        val events = await(betEventStream.take(1).runWith(Sink.seq))
        val expectedEvent = BetStateUpdate(
          betId,
          state = BetStateUpdate.TargetState.Opened,
          betData = betData,
          winner = false,
          reason = None)

        events should contain only expectedEvent
      })
    }

    Scenario("Active punter places a bet on a market that is part of not DGE-allowed tournament") {
      Given("a punter with a wallet")
      val punter = env.punterScenarios.punterWithWallet(initialFunds)

      And("a bettable market")
      val RandomMarket(_, tournamentId, _, marketId, _, _, _, _, _, _) =
        env.marketScenarios.bettableMarket(NonEmptyList.one(selection))

      When("a bet is placed by the punter on the market")
      val betId = generateBetId()
      val betData =
        BetData(punter.punterId, marketId, selection.selectionId, Stake.unsafe(DefaultCurrencyMoney(10)), Odds(2.0))

      val betEventStream = await(env.betEventStreams.streamStateUpdates(punter.punterId))

      Then("make tournament not displayable for the market")
      await(env.marketsBC.makeTournamentNotDisplayable(tournamentId))

      Then("creating the bet should cause validation error")
      awaitLeft(env.betScenarios.placeBet(betId, betData, generateGeolocation())) should matchPattern {
        case InvalidBetPlacement(NonEmptyList(MarketDoesNotExist(`marketId`), Nil)) =>
      }

      And("the bet update notification should be received on the punter's bet event stream")
      val events = await(betEventStream.take(1).runWith(Sink.seq))
      val expectedEvent = failedBetStateUpdate(betId, betData, reason = "marketNotFound")

      events should contain only expectedEvent
    }

    Scenario("Active punter places a bet on a market that is part of not DGE-allowed sport") {
      Given("a punter with a wallet")
      val punter = env.punterScenarios.punterWithWallet(initialFunds)

      And("a bettable market")
      val marketId = env.marketScenarios.bettableMarket(NonEmptyList.one(selection), Some(false)).marketId

      When("a bet is placed by the punter on the market")
      val betId = generateBetId()
      val betData =
        BetData(punter.punterId, marketId, selection.selectionId, Stake.unsafe(DefaultCurrencyMoney(10)), Odds(2.0))

      val betEventStream = await(env.betEventStreams.streamStateUpdates(punter.punterId))

      Then("creating the bet should cause validation error")
      awaitLeft(env.betScenarios.placeBet(betId, betData, generateGeolocation())) should matchPattern {
        case InvalidBetPlacement(NonEmptyList(MarketDoesNotExist(`marketId`), Nil)) =>
      }

      And("the bet update notification should be received on the punter's bet event stream")
      val events = await(betEventStream.take(1).runWith(Sink.seq))
      val expectedEvent = failedBetStateUpdate(betId, betData, reason = "marketNotFound")

      events should contain only expectedEvent
    }

    Scenario("Active punter with insufficient funds places a bet on a bettable market") {

      withPunterWalletAndMarket((punterId, _, marketId) => {

        When("a bet is placed for a stake greater than wallet balance")
        val betId = generateBetId()
        val betData =
          BetData(punterId, marketId, selection.selectionId, Stake.unsafe(DefaultCurrencyMoney(110)), Odds(2.0))

        val betEventStream = await(env.betEventStreams.streamStateUpdates(punterId))
        Then("placing the bet should cause a validation error")
        awaitLeft(env.betScenarios.placeBet(betId, betData, generateGeolocation())) should matchPattern {
          case InvalidBetPlacement(NonEmptyList(WalletReservationError(InsufficientFundsError(_)), Nil)) =>
        }

        And("the bet update notification should be received on the punter's bet event stream")
        val events = await(betEventStream.take(1).runWith(Sink.seq))
        val expectedEvent = failedBetStateUpdate(betId, betData, reason = "insufficientFunds")

        events should contain only expectedEvent
      })
    }

    Scenario("Active punter with sufficient funds places a bet on a frozen market") {

      withPunterWalletAndMarket((punterId, _, marketId) => {

        When("the market is frozen")
        awaitRight(env.marketsBC.freezeMarket(marketId, BackofficeChange()))

        And("a bet is placed by the punter on the market")
        val betId = generateBetId()
        val betData =
          BetData(punterId, marketId, selection.selectionId, Stake.unsafe(DefaultCurrencyMoney(10)), Odds(2.0))

        val betEventStream = await(env.betEventStreams.streamStateUpdates(punterId))
        Then("placing the bet should cause a validation error")
        awaitLeft(env.betScenarios.placeBet(betId, betData, generateGeolocation())) should matchPattern {
          case InvalidBetPlacement(NonEmptyList(MarketNotBettable(`marketId`), Nil)) =>
        }

        And("the bet update notification should be received on the punter's bet event stream")
        val events = await(betEventStream.take(1).runWith(Sink.seq))
        val expectedEvent = failedBetStateUpdate(betId, betData, reason = "marketNotBettable")

        events should contain only expectedEvent
      })
    }

    Scenario("Active punter with sufficient funds places a bet on a market after odds have changed") {

      withPunterWalletAndMarket((punterId, _, marketId) => {

        val oddsAfterMove = Some(Odds(5.5))

        When("odds have moved for the bet selection")
        awaitRight(
          env.marketsBC.updateSelectionOdds(
            marketId,
            Seq(SelectionOdds(selection.selectionId, selection.selectionName, oddsAfterMove, active = true))))

        And("a bet is placed by the punter on the market")
        val betId = generateBetId()
        val oddsThePunterWasExpecting = Odds(2.0)
        val betData =
          BetData(
            punterId,
            marketId,
            selection.selectionId,
            Stake.unsafe(DefaultCurrencyMoney(10)),
            oddsThePunterWasExpecting)

        val betEventStream = await(env.betEventStreams.streamStateUpdates(punterId))
        Then("placing the bet should cause a validation error")
        awaitLeft(env.betScenarios.placeBet(betId, betData, generateGeolocation())) should matchPattern {
          case InvalidBetPlacement(
                NonEmptyList(OddsHaveChangedError(`oddsThePunterWasExpecting`, `oddsAfterMove`), Nil)) =>
        }

        And("the bet update notification should be received on the punter's bet event stream")
        val events = await(betEventStream.take(1).runWith(Sink.seq))
        val expectedEvent = failedBetStateUpdate(betId, betData, reason = "selectionOddsHaveChanged")

        events should contain only expectedEvent
      })
    }

    Scenario("Market a punter has bet on is settled") {

      Given("a market with selections")
      val firstTeamWinning = SelectionOdds(generateSelectionId(), "First team winning", Some(Odds(2.0)), active = true)
      val secondTeamWinning =
        SelectionOdds(generateSelectionId(), "Second team winning", Some(Odds(1.5)), active = true)
      val market = env.marketScenarios.bettableMarket(NonEmptyList.of(firstTeamWinning, secondTeamWinning))

      And("punter accounts")
      val firstPunter = env.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(100))
      val secondPunter = env.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(100))

      And("bets placed against different selections")
      env.betScenarios.placedBet(
        firstPunter.punterId,
        market.marketId,
        firstTeamWinning,
        Stake.unsafe(DefaultCurrencyMoney(50)))
      env.betScenarios.placedBet(
        secondPunter.punterId,
        market.marketId,
        secondTeamWinning,
        Stake.unsafe(DefaultCurrencyMoney(50)))

      When("market settles - first team won")
      awaitRight(
        env.marketsBC.settleMarket(market.marketId, firstTeamWinning.selectionId, BackofficeChange("Finished")))

      Then("balance should be updated")
      eventually(eventuallyTimeout, eventuallyInterval) {
        eventually(eventuallyTimeout, eventuallyInterval) {
          env.getCurrentBalance(firstPunter) shouldBe DefaultCurrencyMoney(150)
          env.getCurrentBalance(secondPunter) shouldBe DefaultCurrencyMoney(50)
        }
      }
    }

    Scenario("Market a punter has bet on is cancelled") {
      Given("a market with selections")
      val firstTeamWinning = SelectionOdds(generateSelectionId(), "First team winning", Some(Odds(2.0)), active = true)
      val secondTeamWinning =
        SelectionOdds(generateSelectionId(), "Second team winning", Some(Odds(1.5)), active = true)
      val market = env.marketScenarios.bettableMarket(NonEmptyList.of(firstTeamWinning, secondTeamWinning))

      And("punter accounts")
      val firstPunter = env.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(100))
      val firstPunterEventsStream = await(env.betEventStreams.streamStateUpdates(firstPunter.punterId))

      val secondPunter = env.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(100))
      val secondPunterEventsStream = await(env.betEventStreams.streamStateUpdates(secondPunter.punterId))

      And("bets placed against different selections")
      env.betScenarios.placedBet(
        firstPunter.punterId,
        market.marketId,
        firstTeamWinning,
        Stake.unsafe(DefaultCurrencyMoney(50)))
      env.betScenarios.placedBet(
        secondPunter.punterId,
        market.marketId,
        secondTeamWinning,
        Stake.unsafe(DefaultCurrencyMoney(50)))

      And("funds reserved for bet")
      eventually(eventuallyTimeout, eventuallyInterval) {
        env.getCurrentBalance(firstPunter) shouldBe DefaultCurrencyMoney(50)
        env.getCurrentBalance(secondPunter) shouldBe DefaultCurrencyMoney(50)
      }

      When("market cancelled")
      awaitRight(env.marketsBC.cancelMarket(market.marketId, BackofficeCancellation()))

      Then("voided events should be delivered")
      val firstPunterEvents = await(firstPunterEventsStream.take(2).runWith(Sink.seq))
      firstPunterEvents.exists(_.state == Voided) shouldBe true

      val secondPunterEvents = await(secondPunterEventsStream.take(2).runWith(Sink.seq))
      secondPunterEvents.exists(_.state == Voided) shouldBe true

      And("funds should be freed back")
      eventually(eventuallyTimeout, eventuallyInterval) {
        env.getCurrentBalance(firstPunter) shouldBe DefaultCurrencyMoney(100)
        env.getCurrentBalance(secondPunter) shouldBe DefaultCurrencyMoney(100)
      }
    }

    Scenario("A punter has a bet cancelled by an admin user") {
      Given("an admin user and a bet cancellation timestamp")
      val adminUser = Api.generateAdminId()
      val cancellationReason = BetDataGenerator.generateCancellationReason()
      val betCancellationTimestamp = randomOffsetDateTime()

      And("a market with selections")
      val firstTeamWinning = SelectionOdds(generateSelectionId(), "First team winning", Some(Odds(2.0)), active = true)
      val secondTeamWinning =
        SelectionOdds(generateSelectionId(), "Second team winning", Some(Odds(1.5)), active = true)
      val market = env.marketScenarios.bettableMarket(NonEmptyList.of(firstTeamWinning, secondTeamWinning))

      And("a punter account")
      val punter = env.punterScenarios.punterWithWallet(initialBalance = DefaultCurrencyMoney(100))

      And("the punter places a bet")
      val betId = env.betScenarios.placedBet(
        punter.punterId,
        market.marketId,
        firstTeamWinning,
        Stake.unsafe(DefaultCurrencyMoney(50)))

      And("funds reserved for bet")
      eventually(eventuallyTimeout, eventuallyInterval) {
        env.getCurrentBalance(punter) shouldBe DefaultCurrencyMoney(50)
      }

      When("the bet is cancelled")
      awaitRight(env.betsBC.cancelBet(betId, adminUser, cancellationReason, betCancellationTimestamp))

      And("funds should be freed back")
      eventually(eventuallyTimeout, eventuallyInterval) {
        env.getCurrentBalance(punter) shouldBe DefaultCurrencyMoney(100)
      }
    }
  }
}
