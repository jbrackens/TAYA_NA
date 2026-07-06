package phoenix.reports.unit

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.support.BetDataGenerator.generateBetCancelledEvent
import phoenix.bets.support.BetDataGenerator.generateBetOpenedEvent
import phoenix.bets.support.BetDataGenerator.generateBetResettledEvent
import phoenix.bets.support.BetDataGenerator.generateBetSettledEvent
import phoenix.bets.support.BetDataGenerator.generateBetVoidedEvent
import phoenix.reports.application.es.BetsProjectionEventHandler
import phoenix.reports.domain.Bet
import phoenix.reports.domain.model.bets.NormalizedStake
import phoenix.reports.infrastructure.InMemoryBetsRepository
import phoenix.reports.infrastructure.ReportsDataGenerator.generateBet
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.FutureSupport

final class BetsProjectionEventHandlerSpec extends AnyWordSpec with Matchers with FutureSupport {

  "it should insert a new Bet on BetOpened" in {
    val repository = new InMemoryBetsRepository()

    val event = generateBetOpenedEvent()
    val eventHappenedAt = randomOffsetDateTime()

    await(BetsProjectionEventHandler.handle(repository)(event, eventHappenedAt))

    await(repository.find(event.betId)) shouldBe Some(
      Bet(
        event.betId,
        event.betData.punterId,
        event.betData.marketId,
        event.betData.selectionId,
        NormalizedStake.from(event.betData.stake),
        event.placedAt,
        closedAt = None,
        initialSettlementData = None))
  }

  "it should set `closedAt` on BetSettled" in {
    val existingBet = generateBet()
    val repository = new InMemoryBetsRepository()

    val event = generateBetSettledEvent().copy(betId = existingBet.betId)
    val eventHappenedAt = randomOffsetDateTime()

    await(repository.upsert(existingBet))
    await(BetsProjectionEventHandler.handle(repository)(event, eventHappenedAt))

    val expectedBet = existingBet.copy(closedAt = Some(eventHappenedAt), initialSettlementData = Some(eventHappenedAt))
    await(repository.find(event.betId)) shouldBe Some(expectedBet)
  }

  "it should set `closedAt` on BetResettled" in {
    val existingBet = generateBet()
    val repository = new InMemoryBetsRepository()

    val event = generateBetResettledEvent().copy(betId = existingBet.betId)
    val resettledAt = event.resettledAt

    await(repository.upsert(existingBet))
    await(BetsProjectionEventHandler.handle(repository)(event, resettledAt))

    val expectedBet = existingBet.copy(closedAt = Some(resettledAt))
    await(repository.find(event.betId)) shouldBe Some(expectedBet)
  }

  "it should set `closedAt` on BetVoided" in {
    val existingBet = generateBet()
    val repository = new InMemoryBetsRepository()

    val event = generateBetVoidedEvent().copy(betId = existingBet.betId)
    val eventHappenedAt = randomOffsetDateTime()

    await(repository.upsert(existingBet))
    await(BetsProjectionEventHandler.handle(repository)(event, eventHappenedAt))

    val expectedBet = existingBet.copy(closedAt = Some(eventHappenedAt))
    await(repository.find(event.betId)) shouldBe Some(expectedBet)
  }

  "it should set `closedAt` on BetCancelled" in {
    val existingBet = generateBet()
    val repository = new InMemoryBetsRepository()

    val event = generateBetCancelledEvent().copy(betId = existingBet.betId)
    val eventHappenedAt = randomOffsetDateTime()

    await(repository.upsert(existingBet))
    await(BetsProjectionEventHandler.handle(repository)(event, eventHappenedAt))

    val expectedBet = existingBet.copy(closedAt = Some(eventHappenedAt))
    await(repository.find(event.betId)) shouldBe Some(expectedBet)
  }
}
