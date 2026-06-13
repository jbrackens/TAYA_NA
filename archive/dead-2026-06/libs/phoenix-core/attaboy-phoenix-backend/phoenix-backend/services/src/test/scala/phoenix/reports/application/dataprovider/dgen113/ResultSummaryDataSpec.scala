package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import akka.stream.scaladsl.Source
import org.scalatest.GivenWhenThen
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.bets.BetEntity.BetId
import phoenix.core.currency.MoneyAmount
import phoenix.core.domain.DataProvider
import phoenix.core.odds.Odds
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.bets.BetData
import phoenix.reports.domain.model.bets.BetEvent
import phoenix.reports.domain.model.bets.BetEvent.BetOpened
import phoenix.reports.domain.model.bets.EventId
import phoenix.reports.domain.model.markets.SportDiscipline
import phoenix.reports.domain.template.dgen113.ResultSummary
import phoenix.reports.infrastructure.CsvBetEventsRepository
import phoenix.reports.support.BetStubs
import phoenix.shared.support.CsvReader
import phoenix.support.DataGenerator
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

class ResultSummaryDataSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport
    with Eventually
    with GivenWhenThen {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)

  private val hardcodedClock = new FakeHardcodedClock(OffsetDateTime.of(2021, 2, 20, 1, 0, 0, 0, ZoneOffset.UTC))
  private val givenReportingPeriod =
    ReportingPeriod.enclosingDay(hardcodedClock.currentOffsetDateTime(), hardcodedClock)

  "A ResultSummaryData from CSV" should {
    val csvReader = new CsvReader
    "produce empty report for no data" in {
      Given("no bets returned by repository")
      val repository = new BetEventsRepository {
        override def upsert(event: BetEvent): Future[Unit] = Future.unit

        override def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed] = Source(List())
      }

      val objectUnderTest = new ResultSummaryData(repository)

      When("data is aggregated")
      val result = await(objectUnderTest.getData(givenReportingPeriod))

      Then("report should contain all required sports with total")
      val expectedSize = 9
      result.size should be(expectedSize)
      objectUnderTest.requiredDisciplinesIndex.forEach((discipline, index) => {
        result(index).gamingDate should be(DateField(givenReportingPeriod.periodStart))
        result(index).eventType.value should be(discipline)
      })

      And("all rows should be empty")
      result.foreach(row => {
        row.ticketBetSales should be(MoneyField(0.0))
        row.ticketsBetsPaid should be(MoneyField(0.0))
        row.ticketsBetsCancelled should be(MoneyField(0.0))
        row.ticketsBetsVoided should be(MoneyField(0.0))
        row.resettledBetAdjustment should be(MoneyField(0.0))
        row.netSportsPoolGrossRevenue should be(MoneyField(0.0))
      })
    }

    "aggregate bets by status" in {
      Given("multiple bets with different state returned by repository")
      val repository = new CsvBetEventsRepository(csvReader, "data/reports/application/multiple-states-bets.csv")

      val objectUnderTest = new ResultSummaryData(repository)

      When("data is aggregated")
      val result = await(objectUnderTest.getData(givenReportingPeriod))

      Then("all bets by default should be aggregated only in OTHER discipline")
      result
        .filterNot(row => row.eventType.value == SportDiscipline.Other)
        .foreach(row => {
          row.ticketBetSales should be(MoneyField(0.0))
          row.ticketsBetsPaid should be(MoneyField(0.0))
          row.ticketsBetsCancelled should be(MoneyField(0.0))
          row.ticketsBetsVoided should be(MoneyField(0.0))
          row.resettledBetAdjustment should be(MoneyField(0.0))
          row.netSportsPoolGrossRevenue should be(MoneyField(0.0))
        })

      And("values should be distributed by state")
      val otherSportsRow = getDisciplineRow(result, SportDiscipline.Other)
      otherSportsRow.ticketBetSales should be(MoneyField(10.0))
      otherSportsRow.ticketsBetsPaid should be(MoneyField(7.3))
      otherSportsRow.ticketsBetsCancelled should be(MoneyField(2.0))
      otherSportsRow.ticketsBetsVoided should be(MoneyField(4.0))
      otherSportsRow.resettledBetAdjustment should be(MoneyField(-4.8))
      otherSportsRow.netSportsPoolGrossRevenue should be(MoneyField(1.5))
    }

    "group bets by sport discipline" in {
      Given("multiple bets with different disciplines returned by repository")
      val repository = new BetEventsRepository {
        override def upsert(event: BetEvent): Future[Unit] = Future.unit

        override def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed] = {
          Source.apply(
            List(
              betOpenedEvent(SportDiscipline.AmericanFootball, 1),
              betOpenedEvent(SportDiscipline.Baseball, 2),
              betOpenedEvent(SportDiscipline.Basketball, 3),
              betOpenedEvent(SportDiscipline.Boxing, 4),
              betOpenedEvent(SportDiscipline.Football, 5),
              betOpenedEvent(SportDiscipline.Golf, 6),
              betOpenedEvent(SportDiscipline.MotorSport, 7),
              betOpenedEvent(SportDiscipline.Tennis, 8),
              betOpenedEvent(SportDiscipline.Other, 9)))
        }
      }

      val objectUnderTest = new ResultSummaryData(repository)

      When("data is aggregated")
      val result = await(objectUnderTest.getData(givenReportingPeriod))

      Then("values should be distributed by discipline")
      getDisciplineRow(result, SportDiscipline.AmericanFootball).ticketBetSales should be(MoneyField(1.0))
      getDisciplineRow(result, SportDiscipline.Baseball).ticketBetSales should be(MoneyField(2.0))
      getDisciplineRow(result, SportDiscipline.Basketball).ticketBetSales should be(MoneyField(3.0))
      getDisciplineRow(result, SportDiscipline.Boxing).ticketBetSales should be(MoneyField(4.0))
      getDisciplineRow(result, SportDiscipline.Football).ticketBetSales should be(MoneyField(5.0))
      getDisciplineRow(result, SportDiscipline.Golf).ticketBetSales should be(MoneyField(6.0))
      getDisciplineRow(result, SportDiscipline.MotorSport).ticketBetSales should be(MoneyField(7.0))
      getDisciplineRow(result, SportDiscipline.Tennis).ticketBetSales should be(MoneyField(8.0))
      getDisciplineRow(result, SportDiscipline.Other).ticketBetSales should be(MoneyField(9.0))
    }

    def betOpenedEvent(discipline: SportDiscipline, stake: Double): BetEvent = {
      val betId = BetId(DataGenerator.randomString())
      val betData =
        BetData(
          betId = betId,
          punterId = PunterId(""),
          marketId = MarketId(DataProvider.Oddin, ""),
          selectionId = "",
          stake = MoneyAmount(stake),
          odds = Odds(1.5))
      BetOpened(EventId.random(), betData, hardcodedClock.currentOffsetDateTime(), discipline)
    }
  }

  "A ResultSummaryData from Events" should {
    val dayOfEvents =
      ReportingPeriod.enclosingDay(OffsetDateTime.of(2022, 2, 25, 0, 0, 0, 0, ZoneOffset.UTC), hardcodedClock)
    "produce empty report for no data" in {
      Given("no bets returned by repository")
      val repository = new BetEventsRepository {
        override def upsert(event: BetEvent): Future[Unit] = Future.unit

        override def findEventsWithinPeriod(period: ReportingPeriod): Source[BetEvent, NotUsed] = Source(List())
      }

      val objectUnderTest = new ResultSummaryData(repository)

      When("data is aggregated")
      val result = await(objectUnderTest.getData(dayOfEvents))

      Then("report should contain all required sports with total")
      val expectedSize = 9
      result.size should be(expectedSize)
      objectUnderTest.requiredDisciplinesIndex.forEach((discipline, index) => {
        result(index).gamingDate should be(DateField(dayOfEvents.periodStart))
        result(index).eventType.value should be(discipline)
      })

      And("all rows should be empty")
      result.foreach(row => {
        row.ticketBetSales should be(MoneyField(0.0))
        row.ticketsBetsPaid should be(MoneyField(0.0))
        row.ticketsBetsCancelled should be(MoneyField(0.0))
        row.ticketsBetsVoided should be(MoneyField(0.0))
        row.resettledBetAdjustment should be(MoneyField(0.0))
        row.netSportsPoolGrossRevenue should be(MoneyField(0.0))
      })
    }

    "aggregate bets by status" in {
      Given("multiple bets with different state returned by repository")
      val env = new EnvironmentWithTwoPuntersAndTwoBetsResettled()

      val repository = BetStubs.stubbedBetEvents(env.bets)

      val objectUnderTest = new ResultSummaryData(repository)

      When("data is aggregated")
      val result = await(objectUnderTest.getData(dayOfEvents))

      Then("all bets by default should be aggregated only in OTHER discipline")
      result
        .filterNot(row => row.eventType.value == SportDiscipline.Other)
        .foreach(row => {
          row.ticketBetSales should be(MoneyField(0.0))
          row.ticketsBetsPaid should be(MoneyField(0.0))
          row.ticketsBetsCancelled should be(MoneyField(0.0))
          row.ticketsBetsVoided should be(MoneyField(0.0))
          row.resettledBetAdjustment should be(MoneyField(0.0))
          row.netSportsPoolGrossRevenue should be(MoneyField(0.0))
        })

      And("values should be distributed by state")
      val otherSportsRow = getDisciplineRow(result, SportDiscipline.Other)
      otherSportsRow.ticketBetSales should be(MoneyField(0.0))
      otherSportsRow.ticketsBetsPaid should be(MoneyField(147))
      otherSportsRow.ticketsBetsCancelled should be(MoneyField(0.0))
      otherSportsRow.ticketsBetsVoided should be(MoneyField(0.0))
      otherSportsRow.resettledBetAdjustment should be(MoneyField(-85.5))
      otherSportsRow.netSportsPoolGrossRevenue should be(MoneyField(-61.5))
    }
  }

  private def getDisciplineRow(result: Seq[ResultSummary.ResultSummaryRow], toFind: SportDiscipline) = {
    result.find(row => row.eventType.value == toFind).get
  }
}
