package phoenix.wallets.application.es

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.core.TimeUtils._
import phoenix.projections.ProjectionEventHandler
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletActorProtocol.events
import phoenix.wallets.WalletActorProtocol.events.AdjustingFundsDeposited
import phoenix.wallets.WalletActorProtocol.events.AdjustingFundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.BetCancelled
import phoenix.wallets.WalletActorProtocol.events.BetLost
import phoenix.wallets.WalletActorProtocol.events.BetPushed
import phoenix.wallets.WalletActorProtocol.events.BetResettled
import phoenix.wallets.WalletActorProtocol.events.BetVoided
import phoenix.wallets.WalletActorProtocol.events.BetWon
import phoenix.wallets.WalletActorProtocol.events.FundsDeposited
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForBet
import phoenix.wallets.WalletActorProtocol.events.FundsReservedForWithdrawal
import phoenix.wallets.WalletActorProtocol.events.FundsWithdrawn
import phoenix.wallets.WalletActorProtocol.events.NegativeBalance
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendApproved
import phoenix.wallets.WalletActorProtocol.events.PunterUnsuspendRejected
import phoenix.wallets.WalletActorProtocol.events.ResponsibilityCheckAcceptanceRequested
import phoenix.wallets.WalletActorProtocol.events.WalletCreated
import phoenix.wallets.WalletActorProtocol.events.WalletEvent
import phoenix.wallets.WalletActorProtocol.events.WithdrawalCancelled
import phoenix.wallets.WalletActorProtocol.events.WithdrawalConfirmed
import phoenix.wallets.application.es.ScheduleResponsibilityCheckTaskEventHandler.handle
import phoenix.wallets.domain.ResponsibilityCheckTask
import phoenix.wallets.domain.ResponsibilityCheckTaskId
import phoenix.wallets.domain.ResponsibilityCheckTaskRepository

private[wallets] final class ScheduleResponsibilityCheckTaskEventHandler(
    responsibilityCheckTaskRepository: ResponsibilityCheckTaskRepository,
    uuidGenerator: UUIDGenerator)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[WalletEvent] {

  private val handler: (WalletEvent, OffsetDateTime) => Future[Unit] =
    handle(responsibilityCheckTaskRepository, uuidGenerator)

  override def process(envelope: EventEnvelope[WalletEvent]): Future[Done] =
    handler(envelope.event, envelope.timestamp.toUtcOffsetDateTime).map(_ => Done)
}

private[wallets] object ScheduleResponsibilityCheckTaskEventHandler {
  private val AmountOfYearsToAdd = 1

  def handle(responsibilityCheckTaskRepository: ResponsibilityCheckTaskRepository, uuidGenerator: UUIDGenerator)(
      event: WalletEvent,
      eventHappenedAt: OffsetDateTime): Future[Unit] =
    event match {
      case events.ResponsibilityCheckAccepted(walletId) =>
        val task = ResponsibilityCheckTask(
          ResponsibilityCheckTaskId(uuidGenerator.generate()),
          walletId,
          scheduledFor = eventHappenedAt.plusYears(AmountOfYearsToAdd))
        responsibilityCheckTaskRepository.insert(task)
      case _: WalletCreated | _: AdjustingFundsDeposited | _: AdjustingFundsWithdrawn | _: FundsDeposited |
          _: FundsReservedForBet | _: FundsReservedForWithdrawal | _: FundsWithdrawn |
          _: ResponsibilityCheckAcceptanceRequested | _: WithdrawalCancelled | _: WithdrawalConfirmed | _: BetWon |
          _: BetVoided | _: BetResettled | _: BetCancelled | _: BetLost | _: BetPushed | _: PunterUnsuspendApproved |
          _: PunterUnsuspendRejected | _: NegativeBalance =>
        Future.unit
    }
}
