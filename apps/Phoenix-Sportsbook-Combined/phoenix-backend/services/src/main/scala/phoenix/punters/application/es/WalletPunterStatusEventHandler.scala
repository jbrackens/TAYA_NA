package phoenix.punters.application.es

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.notes.application.InsertNotes
import phoenix.notes.domain.NoteText
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.SuspensionEntity.{NegativeBalance => SuspendNegativeBalance}
import phoenix.wallets.WalletActorProtocol.events._
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

final class WalletPunterStatusEventHandler(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    insertNotes: InsertNotes,
    clock: Clock)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[WalletEvent] {
  override def process(envelope: EventEnvelope[WalletEvent]): Future[Done] =
    WalletPunterStatusEventHandler.handle(envelope.event, punters, wallets, insertNotes, clock).map(_ => Done)
}

private[punters] object WalletPunterStatusEventHandler {
  private val log: Logger = LoggerFactory.getLogger(getClass)
  def handle(
      event: WalletEvent,
      punters: PuntersBoundedContext,
      wallets: WalletsBoundedContext,
      insertNotes: InsertNotes,
      clock: Clock)(implicit ec: ExecutionContext): Future[Unit] = {
    event match {
      case PunterUnsuspendApproved(walletId) =>
        log.info(s"Completing approved unsuspend for punter: ${walletId.owner}")
        punters.completeUnsuspend(walletId.owner).value.map(_ => ())

      case PunterUnsuspendRejected(walletId) =>
        log.info(s"Unsuspend rejected for punter [${walletId.owner}] due to negative balance")
        Future.unit

      case BetResettled(walletId, _, _, _, _, _) =>
        log.info(s"Requesting balance check for punter ${walletId.owner} after bet resettlement")
        wallets.requestBalanceCheckForSuspend(walletId).value.map(_ => ())

      case PredictionResettled(walletId, _, _, _, _, _) =>
        log.info(s"Requesting balance check for punter ${walletId.owner} after prediction resettlement")
        wallets.requestBalanceCheckForSuspend(walletId).value.map(_ => ())

      case NegativeBalance(walletId) =>
        log.info(s"Suspending punter [${walletId.owner}] due to negative balance")
        for {
          _ <- setNegativeBalance(punters, clock, walletId)
          _ <- insertNote(walletId, insertNotes, NoteText.unsafe(s"Suspended due to negative balance"))
        } yield ()

      case FundsDeposited(walletId, _, _, _, previousBalance, _) if previousBalance.isNegative() =>
        log.info(s"Requesting balance check for punter ${walletId.owner} after deposit")
        wallets.requestBalanceCheckForUnsuspend(walletId).value.map(_ => ())

      case _: FundsReservedForWithdrawal | _: AdjustingFundsDeposited | _: AdjustingFundsWithdrawn | _: FundsDeposited |
          _: WithdrawalConfirmed | _: WalletCreated | _: FundsWithdrawn | _: ResponsibilityCheckAcceptanceRequested |
          _: ResponsibilityCheckAccepted | _: WithdrawalCancelled | _: BetCancelled | _: PredictionCancelled |
          _: BetLost | _: PredictionLost | _: BetPushed | _: PredictionPushed | _: BetVoided |
          _: PredictionVoided | _: BetWon | _: PredictionWon | _: FundsReservedForBet |
          _: FundsReservedForPrediction =>
        Future.unit
    }
  }

  private def setNegativeBalance(punters: PuntersBoundedContext, clock: Clock, walletId: WalletId)(implicit
      ec: ExecutionContext): Future[Unit] = {
    punters
      .setNegativeBalance(
        walletId.owner,
        SuspendNegativeBalance("Negative balance after resettlement"),
        clock.currentOffsetDateTime())
      .value
      .map(_ => ())
  }

  private def insertNote(walletId: WalletId, insertNotes: InsertNotes, noteText: NoteText): Future[Unit] = {
    insertNotes.insertSystemNote(walletId.owner, noteText)
  }
}
