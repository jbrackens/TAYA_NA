package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.testkit.typed.scaladsl.ScalaTestWithActorTestKit
import akka.stream.Materializer
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProvider
import phoenix.reports.application.dataprovider.dge19.PredictionResultCategorySummary
import phoenix.reports.application.dataprovider.dge19.PredictionResultDetailSummary
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.dgen113.ResultSummary.PredictionResultSummaryRow
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

final class ResultSummaryPredictionDataSpec
    extends ScalaTestWithActorTestKit
    with AnyWordSpecLike
    with Matchers
    with FutureSupport {

  implicit val ec: ExecutionContext = system.executionContext
  implicit val materializer: Materializer = Materializer(system)

  private val hardcodedClock = new FakeHardcodedClock(OffsetDateTime.of(2026, 3, 2, 1, 0, 0, 0, ZoneOffset.UTC))
  private val reportingPeriod = ReportingPeriod.enclosingDay(hardcodedClock.currentOffsetDateTime(), hardcodedClock)

  "A ResultSummaryPredictionData" should {
    "produce prediction result summary rows by category" in {
      val predictionProvider = new PredictionReportingSummaryProvider {
        override def summarizePunters(
            reportingPeriod: ReportingPeriod,
            punterIds: Set[phoenix.punters.PunterEntity.PunterId])(implicit
            ec: ExecutionContext) = Future.successful(Map.empty)

        override def summarizeMarkets(reportingPeriod: ReportingPeriod)(implicit
            ec: ExecutionContext) = Future.successful(Seq.empty)

        override def summarizeResultCategories(reportingPeriod: ReportingPeriod)(implicit
            ec: ExecutionContext): Future[Seq[PredictionResultCategorySummary]] =
          Future.successful(
            Seq(
              PredictionResultCategorySummary(
                categoryLabel = "Crypto",
                ticketBetSales = phoenix.core.currency.MoneyAmount(40),
                ticketsBetsPaid = phoenix.core.currency.MoneyAmount(18),
                ticketsBetsCancelled = phoenix.core.currency.MoneyAmount(6),
                ticketsBetsVoided = phoenix.core.currency.MoneyAmount(4),
                resettledBetAdjustment = phoenix.core.currency.MoneyAmount(3),
                netPredictionGrossRevenue = phoenix.core.currency.MoneyAmount(9))))

        override def summarizeResultDetails(reportingPeriod: ReportingPeriod)(implicit
            ec: ExecutionContext): Future[Seq[PredictionResultDetailSummary]] =
          Future.successful(Seq.empty)
      }

      val objectUnderTest = new ResultSummaryPredictionData(predictionProvider)

      val rows = await(objectUnderTest.getData(reportingPeriod))

      rows shouldBe Seq(
        PredictionResultSummaryRow(
          gamingDate = DateField(reportingPeriod.periodStart),
          marketCategory = StringField("Crypto"),
          ticketBetSales = MoneyField(40),
          ticketsBetsPaid = MoneyField(18),
          ticketsBetsCancelled = MoneyField(6),
          ticketsBetsVoided = MoneyField(4),
          resettledBetAdjustment = MoneyField(3),
          netPredictionMarketGrossRevenue = MoneyField(9)))
    }
  }
}
