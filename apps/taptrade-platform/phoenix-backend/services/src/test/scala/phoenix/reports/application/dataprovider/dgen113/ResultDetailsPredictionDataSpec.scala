package phoenix.reports.application.dataprovider.dgen113

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global

import cats.data.OptionT
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.punters.PunterDataGenerator.Api.generatePunterName
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.application.PuntersFinder
import phoenix.reports.application.dataprovider.dge19.PredictionReportingSummaryProvider
import phoenix.reports.application.dataprovider.dge19.PredictionResultDetailSummary
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.PuntersRepository
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.model.punter.AccountDesignation.RealAccount
import phoenix.reports.domain.template.dgen113.ResultDetails.PredictionResultDetailsRow
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

final class ResultDetailsPredictionDataSpec extends AnyWordSpecLike with Matchers with FutureSupport {

  "A ResultDetailsPredictionData" should {
    "produce prediction result detail rows" in {
      val reportingClock = new FakeHardcodedClock(OffsetDateTime.of(2026, 3, 2, 12, 0, 0, 0, ZoneOffset.UTC))
      val reportingPeriod = ReportingPeriod.enclosingDay(reportingClock.currentOffsetDateTime(), reportingClock)
      val punterId = PunterId("prediction-result-punter")

      val puntersRepository = new PuntersRepository {
        override def upsert(event: PunterProfile): Future[Unit] = Future.unit
        override def setSuspensionReason(punterId: PunterId, reason: String): Future[Unit] = Future.unit
        override def setActivationPath(
            punterId: PunterId,
            activationPath: ActivationPath,
            verifiedAt: OffsetDateTime,
            verifiedBy: Option[AdminId]): Future[Unit] = Future.unit
        override def find(punterId: PunterId): OptionT[Future, PunterProfile] =
          OptionT.pure(
            PunterProfile(
              punterId,
              generatePunterName(),
              isTestAccount = false,
              ActivationPath.Manual,
              suspensionReason = None,
              verifiedAt = None,
              verifiedBy = None))
        override def getManuallyVerifiedPunters(
            verifiedAfter: OffsetDateTime,
            verifiedBefore: OffsetDateTime): Future[Seq[PunterProfile]] = Future.successful(Seq.empty)
      }

      val predictionProvider = new PredictionReportingSummaryProvider {
        override def summarizePunters(reportingPeriod: ReportingPeriod, punterIds: Set[PunterId])(implicit
            ec: ExecutionContext) = Future.successful(Map.empty)

        override def summarizeMarkets(reportingPeriod: ReportingPeriod)(implicit
            ec: ExecutionContext) = Future.successful(Seq.empty)

        override def summarizeResultCategories(reportingPeriod: ReportingPeriod)(implicit
            ec: ExecutionContext) = Future.successful(Seq.empty)

        override def summarizeResultDetails(reportingPeriod: ReportingPeriod)(implicit
            ec: ExecutionContext): Future[Seq[PredictionResultDetailSummary]] =
          Future.successful(
            Seq(
              PredictionResultDetailSummary(
                orderId = "po-won",
                punterId = punterId,
                categoryLabel = "Crypto",
                marketTitle = "BTC above $120k",
                outcomeLabel = "Yes",
                transactionTime = reportingPeriod.periodStart.plusHours(3),
                stakePlacedAmount = phoenix.core.currency.MoneyAmount(10),
                paidAmount = phoenix.core.currency.MoneyAmount(18),
                cancelledAmount = phoenix.core.currency.MoneyAmount(0),
                voidedAmount = phoenix.core.currency.MoneyAmount(0),
                resettledAdjustment = phoenix.core.currency.MoneyAmount(0),
                netPredictionRevenueImpact = phoenix.core.currency.MoneyAmount(-8))))
      }

      val rows = await(
        new ResultDetailsPredictionData(predictionProvider, new PuntersFinder(puntersRepository)).getData(reportingPeriod))

      rows shouldBe Seq(
        PredictionResultDetailsRow(
          gamingDate = DateField(reportingPeriod.periodStart),
          transactionTime = TimeField(reportingPeriod.periodStart.plusHours(3)),
          patronId = PatronIdField(punterId),
          accountDesignation = AccountDesignationField(RealAccount),
          orderId = StringField("po-won"),
          marketCategory = StringField("Crypto"),
          marketTitle = StringField("BTC above $120k"),
          position = StringField("Yes"),
          orderPlacedAmount = MoneyField(10),
          orderPaidAmount = MoneyField(18),
          canceledOrderAmount = MoneyField(0),
          voidedOrderAmount = MoneyField(0),
          resettledOrderAdjustment = MoneyField(0),
          transactionImpactOnPredictionRevenue = MoneyField(-8)))
    }
  }
}
