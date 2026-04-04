package phoenix.reports.integration

import akka.stream.scaladsl.Sink
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.bets.CancellationReason
import phoenix.core.Clock
import phoenix.punters.PunterDataGenerator.Api.generateAdminId
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetData
import phoenix.reports.domain.model.bets.ESportEvents
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.infrastructure.SlickBetEventsRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.generateBetId
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateMoneyAmount
import phoenix.support.DataGenerator.generateOdds
import phoenix.support.DataGenerator.generateSelectionId
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport

class SlickBetEventsRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec {

  val clock: Clock = Clock.utcClock
  val repository: SlickBetEventsRepository = new SlickBetEventsRepository(dbConfig)

  "SlickBetsRepository" should {
    "read daily events" in {
      // given
      val firstDay = clock.currentOffsetDateTime()
      val firstBet = generateBetId()

      val firstDayEvents = List(
        ESportEvents.betOpened(EventId.random(), generateBetData(firstBet), operationTime = firstDay.plusSeconds(1)),
        ESportEvents.betSettled(
          EventId.random(),
          generateBetData(firstBet),
          operationTime = firstDay.plusSeconds(2),
          generateMoneyAmount()),
        ESportEvents.betResettled(
          EventId.random(),
          generateBetData(firstBet),
          unsettledAmount = generateMoneyAmount(),
          resettledAmount = generateMoneyAmount(),
          operationTime = firstDay.plusSeconds(3)),
        ESportEvents.betVoided(
          EventId.random(),
          generateBetData(),
          operationTime = firstDay.plusSeconds(4),
          adminUser = generateAdminId(),
          cancellationReason = CancellationReason.unsafe("reason")))

      // and
      val secondDay = firstDay.plusDays(1)
      val secondBet = generateBetId()

      val secondDayEvents = List(
        ESportEvents.betOpened(EventId.random(), generateBetData(secondBet), operationTime = secondDay.plusSeconds(1)),
        ESportEvents
          .betCancelled(EventId.random(), generateBetData(secondBet), operationTime = secondDay.plusSeconds(2)))

      // and
      awaitSeq((firstDayEvents ++ secondDayEvents).map(repository.upsert): _*)

      // then
      val firstDayLoaded =
        await(repository.findEventsWithinPeriod(ReportingPeriod.enclosingDay(firstDay, clock)).runWith(Sink.seq))
      firstDayLoaded shouldBe firstDayEvents

      // and
      val secondDayLoaded =
        await(repository.findEventsWithinPeriod(ReportingPeriod.enclosingDay(secondDay, clock)).runWith(Sink.seq))
      secondDayLoaded shouldBe secondDayEvents
    }
  }

  def generateBetData(betId: BetId = generateBetId()): BetData =
    BetData(betId, generatePunterId(), generateSelectionId(), generateMarketId(), generateMoneyAmount(), generateOdds())
}
