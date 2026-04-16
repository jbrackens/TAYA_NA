package phoenix.reports

import java.nio.file.Path

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.stream.Materializer
import org.slf4j.LoggerFactory
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.bets.BetProjectionRunner
import phoenix.core.Clock
import phoenix.core.TimeUtils
import phoenix.core.UnitUtils.UnitCastOps
import phoenix.core.emailing.Mailer
import phoenix.core.ftp.SftpClient
import phoenix.core.scheduler.AkkaScheduler
import phoenix.markets.MarketProjectionRunner
import phoenix.markets.sports.SportsProjectionRunner
import phoenix.prediction.infrastructure.PredictionQueryService
import phoenix.prediction.infrastructure.PredictionReadModelService
import phoenix.punters.PuntersProjectionRunner
import phoenix.punters.domain.{PuntersRepository => ApplicationPuntersRepository}
import phoenix.punters.infrastructure.SlickPunterDeviceFingerprintsRepository
import phoenix.reports.application.AMLReportsExecutor
import phoenix.reports.application.BetsFinder
import phoenix.reports.application.DGEDailyReportsExecutor
import phoenix.reports.application.DeceasedPuntersReportExecutor
import phoenix.reports.application.FixtureMarketFinder
import phoenix.reports.application.ManuallyUnsuspendedPuntersReportExecutor
import phoenix.reports.application.MultiDeviceActivityReportExecutor
import phoenix.reports.application.OpenedBetsFinder
import phoenix.reports.application.PuntersFinder
import phoenix.reports.application.TransactionFinder
import phoenix.reports.application.es.BetEventsReportingEventHandler
import phoenix.reports.application.es.BetsProjectionEventHandler
import phoenix.reports.application.es.FixtureReportingEventHandler
import phoenix.reports.application.es.MarketReportingEventHandler
import phoenix.reports.application.es.PuntersReportingEventHandler
import phoenix.reports.application.es.VerificationInformationEventHandler
import phoenix.reports.application.es.WalletPendingWithdrawalsReportingEventHandler
import phoenix.reports.application.es.WalletsReportingEventHandler
import phoenix.reports.application.generator.ReportGenerator
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.infrastructure.EmailReportDelivery
import phoenix.reports.infrastructure.SftpReportDelivery
import phoenix.reports.infrastructure.SlickBetEventsRepository
import phoenix.reports.infrastructure.SlickBetsRepository
import phoenix.reports.infrastructure.SlickDeceasedPuntersRepository
import phoenix.reports.infrastructure.SlickFixtureMarketRepository
import phoenix.reports.infrastructure.SlickPuntersRepository
import phoenix.reports.infrastructure.SlickWalletSummaryRepository
import phoenix.reports.infrastructure.SlickWalletTransactionRepository
import phoenix.wallets.WalletProjectionRunner

class ProductionReportsModule(
    clock: Clock,
    akkaScheduler: AkkaScheduler,
    mailer: Mailer,
    dbConfig: DatabaseConfig[JdbcProfile],
    applicationPuntersRepository: ApplicationPuntersRepository,
    predictionReadModels: PredictionQueryService = PredictionReadModelService.noopQuery)(implicit
    system: ActorSystem[_],
    ec: ExecutionContext)
    extends ReportsModule {
  private val log = LoggerFactory.getLogger(getClass)
  log.info("ReportsModule starting...")
  ReportsModule.ensureHeadlessAwt()

  implicit val mat: Materializer = Materializer(system)

  val reportsConfig = ReportsConfig.of(system)
  val sftpClient = SftpClient(reportsConfig.dge.sftp)
  val reportsSubdirectory = Path.of(reportsConfig.dge.directory)
  val sftpReportDelivery = new SftpReportDelivery(sftpClient, reportsSubdirectory)
  val emailReportDelivery = new EmailReportDelivery(mailer, reportsConfig.aml.reportsRecipient)

  val reportGenerator = new ReportGenerator

  val betEventsRepository = new SlickBetEventsRepository(dbConfig)
  val fixtureMarketsRepository = new SlickFixtureMarketRepository(dbConfig)
  val fixtureMarketFinder = FixtureMarketFinder(fixtureMarketsRepository, reportsConfig.fixtureMarketCache)
  val betsRepository = new SlickBetsRepository(dbConfig)
  val betsFinder = new BetsFinder(betsRepository)
  val openedBetsFinder = new OpenedBetsFinder(betsRepository)
  val puntersRepository = new SlickPuntersRepository(dbConfig)
  val deceasedPuntersRepository = new SlickDeceasedPuntersRepository(dbConfig, clock)
  val puntersFinder = new PuntersFinder(puntersRepository)
  val walletSummaries = new SlickWalletSummaryRepository(dbConfig, clock)
  val transactionRepository = new SlickWalletTransactionRepository(dbConfig)
  val transactionFinder = new TransactionFinder(transactionRepository)
  val punterDeviceFingerprintsRepository = new SlickPunterDeviceFingerprintsRepository(dbConfig, clock)

  PuntersProjectionRunner
    .build(system, dbConfig)
    .runProjection(
      reportsConfig.projections.punters,
      new PuntersReportingEventHandler(puntersRepository, applicationPuntersRepository, deceasedPuntersRepository))

  PuntersProjectionRunner
    .build(system, dbConfig)
    .runProjection(
      reportsConfig.projections.verificationData,
      new VerificationInformationEventHandler(puntersRepository))

  val betProjectionRunner = BetProjectionRunner.build(system, dbConfig)
  betProjectionRunner.runProjection(
    reportsConfig.projections.betEvents,
    new BetEventsReportingEventHandler(betEventsRepository, clock))
  betProjectionRunner.runProjection(
    reportsConfig.projections.bets,
    new BetsProjectionEventHandler(betsRepository, clock))

  MarketProjectionRunner
    .build(system, dbConfig)
    .runProjection(reportsConfig.projections.markets, new MarketReportingEventHandler(fixtureMarketsRepository))

  SportsProjectionRunner
    .build(system, dbConfig)
    .runProjection(reportsConfig.projections.fixtures, new FixtureReportingEventHandler(fixtureMarketsRepository))

  val walletProjectionRunner = WalletProjectionRunner.build(system, dbConfig)

  walletProjectionRunner.runProjection(
    reportsConfig.projections.wallets,
    new WalletsReportingEventHandler(walletSummaries))

  // TODO (PHXD-3293): remove after release of PHXD-3293
  walletProjectionRunner.runProjection(
    reportsConfig.projections.walletPendingWithdrawals,
    new WalletPendingWithdrawalsReportingEventHandler(walletSummaries))

  val dgeDailyReportsExecutor =
    new DGEDailyReportsExecutor(
      reportGenerator,
      sftpReportDelivery,
      betEventsRepository,
      betsFinder,
      puntersFinder,
      openedBetsFinder,
      fixtureMarketFinder,
      walletSummaries,
      transactionFinder,
      predictionReadModels,
      clock)

  akkaScheduler.scheduleJob(dgeDailyReportsExecutor, reportsConfig.dge.dailyReports)

  val amlDailyReportsExecutor =
    new AMLReportsExecutor(
      emailReportDelivery,
      reportGenerator,
      puntersFinder,
      walletSummaries,
      ReportingPeriod.previousDay,
      clock)
  akkaScheduler.scheduleJob(amlDailyReportsExecutor, reportsConfig.aml.dailyReports)

  val amlWeeklyReportsExecutor =
    new AMLReportsExecutor(
      emailReportDelivery,
      reportGenerator,
      puntersFinder,
      walletSummaries,
      ReportingPeriod.previousWeek,
      clock)
  akkaScheduler.scheduleJob(amlWeeklyReportsExecutor, reportsConfig.aml.weeklyReports)

  val amlMonthlyReportsExecutor =
    new AMLReportsExecutor(
      emailReportDelivery,
      reportGenerator,
      puntersFinder,
      walletSummaries,
      ReportingPeriod.previousMonth,
      clock)
  akkaScheduler.scheduleJob(amlMonthlyReportsExecutor, reportsConfig.aml.monthlyReports)

  val deceasedPuntersReportExecutor =
    new DeceasedPuntersReportExecutor(
      emailReportDelivery,
      reportGenerator,
      applicationPuntersRepository,
      deceasedPuntersRepository,
      clock)
  akkaScheduler.scheduleJob(deceasedPuntersReportExecutor, reportsConfig.aml.deceasedReports)

  val manuallyUnsuspendedPuntersReportExecutor =
    new ManuallyUnsuspendedPuntersReportExecutor(
      emailReportDelivery,
      reportGenerator,
      puntersRepository,
      applicationPuntersRepository,
      clock)
  akkaScheduler.scheduleJob(
    manuallyUnsuspendedPuntersReportExecutor,
    reportsConfig.aml.manuallyUnsuspendedPuntersReports)

  val multiDeviceActivityReportExecutor =
    new MultiDeviceActivityReportExecutor(
      emailReportDelivery,
      reportGenerator,
      puntersFinder,
      punterDeviceFingerprintsRepository,
      clock)
  akkaScheduler.scheduleJob(multiDeviceActivityReportExecutor, reportsConfig.aml.multiDeviceActivityReports)
  def executeDGEReports(date: TimeUtils.Date): Future[Unit] =
    dgeDailyReportsExecutor.executeForDate(date.noon(clock.zone))
}

trait ReportsModule {
  def executeDGEReports(date: TimeUtils.Date): Future[Unit]
}

object ReportsModule {

  /**
   * Not to execute Java AWT when generating reports - otherwise it fails on k8 environment:
   * http://poi.apache.org/components/spreadsheet/quick-guide.html#Autofit
   */
  private[reports] def ensureHeadlessAwt(): Unit = {
    val props = System.getProperties
    props.setProperty("java.awt.headless", "true").toUnit()
  }
}
