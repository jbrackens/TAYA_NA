package phoenix.bets.unit

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.infrastructure.events.BetProjectionHandler
import phoenix.bets.support.BetDataGenerator.generateBetCancelledEvent
import phoenix.bets.support.BetDataGenerator.generateBetOpenedEvent
import phoenix.bets.support.BetDataGenerator.generateBetResettledEvent
import phoenix.bets.support.BetDataGenerator.generateBetSettledEvent
import phoenix.bets.support.BetDataGenerator.generateBetVoidedEvent
import phoenix.bets.support.BetDataGenerator.generatePunterStake
import phoenix.bets.support.TestPunterStakeRepository
import phoenix.support.FutureSupport

final class BetProjectionHandlerSpec extends AnyWordSpec with Matchers with FutureSupport {
  "A BetProjectionHandler" should {
    "do nothing on a BetOpened event" in {
      val betOpenedEvent = generateBetOpenedEvent()
      val repository = new TestPunterStakeRepository()

      BetProjectionHandler.handleEvent(repository)(betOpenedEvent).futureValue

      repository.punterStakes shouldBe List.empty
    }

    "update an existing bet when a WINNING BetSettled event happens" in {
      // given
      val existingBet = generatePunterStake(BetStatus.Open)
      val betSettledEvent = generateBetSettledEvent().copy(betId = existingBet.betId, winner = true)
      val repository = new TestPunterStakeRepository(punterStakes = List(existingBet))

      // when
      BetProjectionHandler.handleEvent(repository)(betSettledEvent).futureValue

      // then
      val expectedBet = existingBet.copy(betStatus = BetStatus.Settled, outcome = Some(BetOutcome.Won))
      repository.punterStakes shouldBe List(expectedBet)
    }

    "update an existing bet when a LOSING BetSettled event happens" in {
      // given
      val existingBet = generatePunterStake(BetStatus.Open)
      val betSettledEvent = generateBetSettledEvent().copy(betId = existingBet.betId, winner = false)
      val repository = new TestPunterStakeRepository(punterStakes = List(existingBet))

      // when
      BetProjectionHandler.handleEvent(repository)(betSettledEvent).futureValue

      // then
      val expectedBet = existingBet.copy(betStatus = BetStatus.Settled, outcome = Some(BetOutcome.Lost))
      repository.punterStakes shouldBe List(expectedBet)
    }

    "update an existing bet when a BetResettled event happens" in {
      // given
      val existingBet = generatePunterStake(BetStatus.Open)
      val betResettledEvent = generateBetResettledEvent().copy(betId = existingBet.betId, winner = true)
      val repository = new TestPunterStakeRepository(punterStakes = List(existingBet))

      // when
      BetProjectionHandler.handleEvent(repository)(betResettledEvent).futureValue

      // then
      val expectedBet = existingBet.copy(betStatus = BetStatus.Resettled, outcome = Some(BetOutcome.Won))
      repository.punterStakes shouldBe List(expectedBet)
    }

    "update an existing bet when a BetVoided event happens" in {
      // given
      val existingBet = generatePunterStake(BetStatus.Open)
      val betVoidedEvent = generateBetVoidedEvent().copy(betId = existingBet.betId)
      val repository = new TestPunterStakeRepository(punterStakes = List(existingBet))

      // when
      BetProjectionHandler.handleEvent(repository)(betVoidedEvent).futureValue

      // then
      val expectedBet = existingBet.copy(betStatus = BetStatus.Voided)
      repository.punterStakes shouldBe List(expectedBet)
    }

    "update an existing bet when a BetCancelled event happens" in {
      // given
      val existingBet = generatePunterStake(BetStatus.Open)
      val betCancelledEvent = generateBetCancelledEvent().copy(betId = existingBet.betId)
      val repository = new TestPunterStakeRepository(punterStakes = List(existingBet))

      // when
      BetProjectionHandler.handleEvent(repository)(betCancelledEvent).futureValue

      // then
      val expectedBet = existingBet.copy(betStatus = BetStatus.Cancelled)
      repository.punterStakes shouldBe List(expectedBet)
    }
  }
}
