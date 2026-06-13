package phoenix.punters.exclusion.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.scheduler.ScheduledJob
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.exclusion.application.IndividualPunterError
import phoenix.punters.exclusion.application.ProduceSelfExcludedPuntersReport
import phoenix.punters.exclusion.domain.LicenseId
import phoenix.punters.exclusion.domain.SelfExcludedPuntersReportPublisher
import phoenix.punters.exclusion.domain.SelfExcludedPuntersRepository
import phoenix.punters.exclusion.domain.SkinId

private[exclusion] final class ProduceSelfExcludedPuntersReportJob(
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    selfExcludedPuntersRepository: SelfExcludedPuntersRepository,
    selfExcludedPuntersReportPublisher: SelfExcludedPuntersReportPublisher,
    clock: Clock,
    licenseId: LicenseId,
    skinId: SkinId)(implicit ec: ExecutionContext)
    extends ScheduledJob[Unit] {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  private val useCase =
    new ProduceSelfExcludedPuntersReport(
      authenticationRepository,
      puntersRepository,
      selfExcludedPuntersRepository,
      selfExcludedPuntersReportPublisher,
      clock,
      licenseId,
      skinId)

  override def execute()(implicit ec: ExecutionContext): Future[Unit] = {
    log.info("Starting DGE self excluded punters report production...")
    val attempt = useCase.produceReport()

    attempt.foldF(
      error => Future.failed(ProduceSelfExcludedPuntersReportJobDomainFailure(error)),
      _ => Future.successful(log.info("Finished DGE self excluded punters report production successfully")))
  }
}

final case class ProduceSelfExcludedPuntersReportJobDomainFailure(error: IndividualPunterError)
    extends RuntimeException(s"ERROR on DGE Self Excluded Punters Report - $error")
