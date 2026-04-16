package phoenix.punters.exclusion.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.bets.BetsBoundedContext
import phoenix.core.Clock
import phoenix.core.ftp.SftpClient
import phoenix.core.scheduler.ScheduledJob
import phoenix.punters.ExcludedUsersIngestionConfig
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.exclusion.application.IngestExcludedPlayersReport
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository

private[punters] final class IngestExcludedPlayersJob(
    config: ExcludedUsersIngestionConfig,
    sftpClient: SftpClient,
    excludedPlayersRepository: ExcludedPlayersRepository,
    puntersRepository: PuntersRepository,
    puntersBoundedContext: PuntersBoundedContext,
    betsBoundedContext: BetsBoundedContext,
    clock: Clock)(implicit mat: Materializer, ec: ExecutionContext)
    extends ScheduledJob[Unit] {
  private val log: Logger = LoggerFactory.getLogger(getClass)
  private val feed = new SftpExcludedPlayersFeed(sftpClient, config.ingestionFilePath)

  private val useCase =
    new IngestExcludedPlayersReport(
      feed,
      excludedPlayersRepository,
      puntersRepository,
      puntersBoundedContext,
      betsBoundedContext,
      clock)

  override def execute()(implicit ec: ExecutionContext): Future[Unit] =
    for {
      _ <- Future { log.info("Starting DGE excluded players ingestion...") }
      _ <- useCase.ingest()
      _ <- Future { log.info("Finished DGE excluded players ingestion successfully") }
    } yield ()
}
