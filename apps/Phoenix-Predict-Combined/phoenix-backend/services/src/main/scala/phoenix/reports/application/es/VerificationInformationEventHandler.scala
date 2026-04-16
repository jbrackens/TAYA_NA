package phoenix.reports.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.LoggerFactory

import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterProtocol.Events._
import phoenix.punters.domain.SuspensionEntity.Deceased
import phoenix.punters.domain.SuspensionEntity.NegativeBalance
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.reports.domain.PuntersRepository

final class VerificationInformationEventHandler(puntersRepository: PuntersRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PunterEvent] {

  private def handler: PunterEvent => Future[Unit] =
    VerificationInformationEventHandler.handle(puntersRepository)

  override def process(envelope: EventEnvelope[PunterEvent]): Future[Done] =
    handler(envelope.event).map(_ => Done)
}

object VerificationInformationEventHandler {

  private val log = LoggerFactory.getLogger(getClass)

  def handle(puntersRepository: PuntersRepository)(punterEvent: PunterEvent): Future[Unit] =
    punterEvent match {
      case event @ PunterVerified(punterId, activationPath, verifiedAt, verifiedBy) =>
        log.info(s"[VERIFICATION_HANDLER] Handling $event")
        puntersRepository.setActivationPath(punterId, activationPath, verifiedAt, verifiedBy)

      case event @ PunterSuspended(punterId, reason: Deceased, _) =>
        log.info(s"[VERIFICATION_HANDLER] Handling $event")
        puntersRepository.setSuspensionReason(punterId, reason.details)

      case event @ PunterSuspended(punterId, OperatorSuspend(reason), _) =>
        log.info(s"[VERIFICATION_HANDLER] Handling $event")
        puntersRepository.setSuspensionReason(punterId, reason)

      case event @ PunterSuspended(punterId, NegativeBalance(reason), _) =>
        log.info(s"[VERIFICATION_HANDLER] Handling $event")
        puntersRepository.setSuspensionReason(punterId, reason)

      case event @ PunterSuspended(punterId, RegistrationIssue(reason), _) =>
        log.info(s"[VERIFICATION_HANDLER] Handling $event")
        puntersRepository.setSuspensionReason(punterId, reason)

      case _: PunterProfileCreated | _: DailySessionLimitChanged | _: WeeklySessionLimitChanged |
          _: MonthlySessionLimitChanged | _: DailyDepositLimitChanged | _: WeeklyDepositLimitChanged |
          _: MonthlyDepositLimitChanged | _: DailyStakeLimitChanged | _: WeeklyStakeLimitChanged |
          _: MonthlyStakeLimitChanged | _: CoolOffExclusionBegan | _: CoolOffEnded | _: PunterSuspended |
          _: PunterUnsuspended | _: SelfExclusionBegan | _: SelfExclusionEnded | _: SessionStarted | _: SessionEnded |
          _: SessionUpdated | _: FailedMFAAttemptCounterIncremented | _: LoginContextGotReset |
          _: LoginFailureCounterIncremented | _: PunterUnsuspendStarted | _: NegativeBalanceAccepted |
          _: NegativeBalanceCancelled | _: PunterUnverified | _: PunterStateGotReset =>
        Future.unit
    }
}
