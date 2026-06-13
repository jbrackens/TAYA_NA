package phoenix.reports.application.es
import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterProtocol.Events._
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.SuspensionEntity.Deceased
import phoenix.punters.domain.SuspensionEntity.NegativeBalance
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.punters.domain.{PuntersRepository => ApplicationPuntersRepository}
import phoenix.reports.domain.DeceasedPuntersRepository
import phoenix.reports.domain.PunterProfile
import phoenix.reports.domain.PuntersRepository

final class PuntersReportingEventHandler(
    puntersRepository: PuntersRepository,
    applicationPuntersRepository: ApplicationPuntersRepository,
    deceasedPuntersRepository: DeceasedPuntersRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {

  private def handler: PunterEvent => Future[Unit] =
    PuntersReportingEventHandler.handle(puntersRepository, applicationPuntersRepository, deceasedPuntersRepository)

  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] =
    handler(envelope.event).map(_ => Done)
}

object PuntersReportingEventHandler {
  def handle(
      puntersRepository: PuntersRepository,
      applicationPuntersRepository: ApplicationPuntersRepository,
      deceasedPuntersRepository: DeceasedPuntersRepository)(punterEvent: PunterEvent)(implicit
      ec: ExecutionContext): Future[Unit] =
    punterEvent match {
      case PunterProfileCreated(punterId, _, _, _, _, isTestAccount) =>
        applicationPuntersRepository.findByPunterId(punterId).value.flatMap { punter =>
          puntersRepository.upsert(
            PunterProfile(
              punterId,
              punter.map(p => nameToString(p.details.name)).getOrElse(""),
              isTestAccount,
              ActivationPath.Unknown,
              suspensionReason = None,
              None,
              None))
        }
      case PunterVerified(punterId, activationPath, verifiedAt, verifiedBy) =>
        puntersRepository.setActivationPath(punterId, activationPath, verifiedAt, verifiedBy)

      case PunterSuspended(punterId, reason @ Deceased(clientIp, clientDevice, _), suspendedAt) =>
        Future
          .sequence(
            Seq(
              deceasedPuntersRepository.save(punterId, suspendedAt, clientIp, clientDevice),
              puntersRepository.setSuspensionReason(punterId, reason.details)))
          .map(_ => ())

      case PunterSuspended(punterId, OperatorSuspend(reason), _) =>
        puntersRepository.setSuspensionReason(punterId, reason)

      case PunterSuspended(punterId, NegativeBalance(reason), _) =>
        puntersRepository.setSuspensionReason(punterId, reason)

      case PunterSuspended(punterId, RegistrationIssue(reason), _) =>
        puntersRepository.setSuspensionReason(punterId, reason)

      case _: DailySessionLimitChanged | _: WeeklySessionLimitChanged | _: MonthlySessionLimitChanged |
          _: DailyDepositLimitChanged | _: WeeklyDepositLimitChanged | _: MonthlyDepositLimitChanged |
          _: DailyStakeLimitChanged | _: WeeklyStakeLimitChanged | _: MonthlyStakeLimitChanged |
          _: CoolOffExclusionBegan | _: CoolOffEnded | _: PunterSuspended | _: PunterUnsuspended |
          _: SelfExclusionBegan | _: SelfExclusionEnded | _: SessionStarted | _: SessionEnded | _: SessionUpdated |
          _: FailedMFAAttemptCounterIncremented | _: LoginContextGotReset | _: LoginFailureCounterIncremented |
          _: PunterUnsuspendStarted | _: NegativeBalanceAccepted | _: NegativeBalanceCancelled | _: PunterUnverified |
          _: PunterStateGotReset =>
        Future.unit
    }
  private def nameToString(name: PersonalName): String =
    s"${name.title.value} ${name.firstName.value} ${name.lastName.value}"
}
