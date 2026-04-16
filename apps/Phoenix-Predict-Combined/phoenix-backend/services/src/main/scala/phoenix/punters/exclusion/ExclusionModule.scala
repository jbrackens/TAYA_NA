package phoenix.punters.exclusion

import scala.concurrent.ExecutionContext

import akka.stream.Materializer
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import phoenix.bets.BetsBoundedContext
import phoenix.core.Clock
import phoenix.core.ftp.SftpClient
import phoenix.core.scheduler.AkkaScheduler
import phoenix.projections.ProjectionRunner
import phoenix.punters.ExcludedUsersConfig
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersConfig
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.exclusion.application.es.SelfExcludedPuntersProjectionHandler
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.exclusion.domain.SelfExcludedPuntersRepository
import phoenix.punters.exclusion.infrastructure.IngestExcludedPlayersJob
import phoenix.punters.exclusion.infrastructure.ProduceSelfExcludedPuntersReportJob
import phoenix.punters.exclusion.infrastructure.SftpSelfExcludedPuntersReportPublisher
import phoenix.punters.exclusion.infrastructure.SlickSelfExcludedPuntersRepository

object ExclusionModule {

  def init(
      dbConfig: DatabaseConfig[JdbcProfile],
      puntersConfig: PuntersConfig,
      projectionRunner: ProjectionRunner[PunterEvent],
      excludedPlayersRepository: ExcludedPlayersRepository,
      puntersRepository: PuntersRepository,
      authenticationRepository: AuthenticationRepository,
      puntersBoundedContext: PuntersBoundedContext,
      betsBoundedContext: BetsBoundedContext,
      akkaJobScheduler: AkkaScheduler,
      clock: Clock)(implicit ec: ExecutionContext, mat: Materializer): Unit = {

    val selfExcludedPuntersRepository = new SlickSelfExcludedPuntersRepository(dbConfig)

    startPeriodicExcludedPlayersIngestion(
      puntersConfig.excludedUsers,
      excludedPlayersRepository,
      puntersRepository,
      puntersBoundedContext,
      betsBoundedContext,
      akkaJobScheduler,
      clock)
    startPeriodicExcludedPlayersReport(
      puntersConfig.excludedUsers,
      akkaJobScheduler,
      authenticationRepository,
      puntersRepository,
      selfExcludedPuntersRepository,
      clock)

    projectionRunner.runProjection(
      puntersConfig.projections.selfExcludedPunters,
      new SelfExcludedPuntersProjectionHandler(selfExcludedPuntersRepository, clock))
  }

  private def startPeriodicExcludedPlayersIngestion(
      config: ExcludedUsersConfig,
      excludedPlayers: ExcludedPlayersRepository,
      puntersRepository: PuntersRepository,
      puntersBoundedContext: PuntersBoundedContext,
      betsBoundedContext: BetsBoundedContext,
      akkaJobScheduler: AkkaScheduler,
      clock: Clock)(implicit mat: Materializer, ec: ExecutionContext): Unit = {
    val excludedUsersIngestionConfig = config.excludedUsersIngestion
    val sftpClient = new SftpClient(config.sftp)
    val job = new IngestExcludedPlayersJob(
      excludedUsersIngestionConfig,
      sftpClient,
      excludedPlayers,
      puntersRepository,
      puntersBoundedContext,
      betsBoundedContext,
      clock)
    akkaJobScheduler.scheduleJob(job, excludedUsersIngestionConfig.periodicWorker)
  }

  private def startPeriodicExcludedPlayersReport(
      config: ExcludedUsersConfig,
      akkaJobScheduler: AkkaScheduler,
      authenticationRepository: AuthenticationRepository,
      puntersRepository: PuntersRepository,
      selfExcludedPuntersRepository: SelfExcludedPuntersRepository,
      clock: Clock)(implicit mat: Materializer, ec: ExecutionContext): Unit = {
    val excludedUsersReportConfig = config.excludedUsersReport
    val sftpClient = new SftpClient(config.sftp)
    val job = new ProduceSelfExcludedPuntersReportJob(
      authenticationRepository,
      puntersRepository,
      selfExcludedPuntersRepository,
      new SftpSelfExcludedPuntersReportPublisher(sftpClient, excludedUsersReportConfig),
      clock,
      excludedUsersReportConfig.licenseId,
      excludedUsersReportConfig.skinId)
    akkaJobScheduler.scheduleJob(job, excludedUsersReportConfig.periodicWorker)
  }
}
