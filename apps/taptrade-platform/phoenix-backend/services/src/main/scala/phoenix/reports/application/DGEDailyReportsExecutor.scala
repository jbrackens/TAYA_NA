package phoenix.reports.application

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import cats.instances.list._
import cats.syntax.traverse._
import com.norbitltd.spoiwo.model.Sheet
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.scheduler.ScheduledJob
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.reports.application.dataprovider.dge19._
import phoenix.reports.application.dataprovider.dgen113._
import phoenix.reports.application.generator.ReportGenerator
import phoenix.reports.domain.BetEventsRepository
import phoenix.reports.domain.WalletSummaryRepository
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.dge19._
import phoenix.reports.domain.template.dgen113._

private[reports] final class DGEDailyReportsExecutor(
    reportGenerator: ReportGenerator,
    reportDelivery: ReportDelivery,
    betEventsRepository: BetEventsRepository,
    betsFinder: BetsFinder,
    puntersFinder: PuntersFinder,
    openedBetsFinder: OpenedBetsFinder,
    fixtureMarketFinder: FixtureMarketFinder,
    walletSummaries: WalletSummaryRepository,
    transactionFinder: TransactionFinder,
    predictionReadModels: PredictionQueryService,
    clock: Clock)(implicit mat: Materializer, ec: ExecutionContext)
    extends ScheduledJob[Unit] {

  private val log: Logger = LoggerFactory.getLogger(getClass)
  private val predictionReporting = PredictionReportingSummaryProvider.fromQueries(predictionReadModels)

  val dailyReports = List(
    new NonCashableBonusBalance(new NonCashableBonusBalanceData),
    new PatronAccountAdjustment(new PatronAccountAdjustmentData(transactionFinder, puntersFinder)),
    new PatronAccountSummary(
      new PatronAccountSummaryData(
        betEventsRepository,
        openedBetsFinder,
        walletSummaries,
        puntersFinder,
        predictionReporting)),
    new PendingTransactionDepositsWithdrawals(
      new PendingTransactionDepositsWithdrawalsData(transactionFinder, puntersFinder)),
    new WageringSummary(
      new WageringSummarySportsData(betEventsRepository, fixtureMarketFinder),
      new WageringSummaryPredictionData(predictionReporting)),
    new Cancelled(
      new CancelledData(betEventsRepository, betsFinder, fixtureMarketFinder, puntersFinder),
      new CancelledPredictionData(predictionReadModels, puntersFinder)),
    new Resettle(
      new ResettleData(betEventsRepository, betsFinder, fixtureMarketFinder, puntersFinder),
      new ResettlePredictionData(predictionReadModels, puntersFinder)),
    new ResultDetails(
      new ResultDetailsData(betEventsRepository, fixtureMarketFinder, puntersFinder),
      new ResultDetailsPredictionData(predictionReporting, puntersFinder)),
    new ResultSummary(
      new ResultSummaryData(betEventsRepository),
      new ResultSummaryPredictionData(predictionReporting)),
    new SportsLiability(
      new SportsLiabilityData(openedBetsFinder, fixtureMarketFinder, puntersFinder),
      new SportsLiabilityPredictionData(predictionReadModels, puntersFinder)),
    new Voids(
      new VoidsData(betEventsRepository, betsFinder, puntersFinder, fixtureMarketFinder),
      new VoidsPredictionData(predictionReadModels, puntersFinder)))

  override def execute()(implicit ec: ExecutionContext): Future[Unit] =
    executeForDate(clock.currentOffsetDateTime())

  def executeForDate(date: OffsetDateTime)(implicit ec: ExecutionContext): Future[Unit] = {
    val reportingPeriod: ReportingPeriod = ReportingPeriod.previousDay(date, clock)
    log.info(s"Generating reports for period: ${reportingPeriod.periodStart} - ${reportingPeriod.periodEnd}")

    //TODO (PHXD-1055): Reports should be generated separately but sending must stay one by one
    val reports = dailyReports.traverse(definition => reportGenerator.generate(reportingPeriod, definition, clock))

    // sending reports must be sequential
    reports.flatMap(transferSequentially(reportingPeriod, _))
  }

  private def transferSequentially(reportingPeriod: ReportingPeriod, reports: Seq[Sheet]): Future[Unit] = {
    reports.foldLeft(Future.unit)((prevTransfer, report) =>
      prevTransfer.flatMap(_ => reportDelivery.transferReport(reportingPeriod, report)))
  }
}
