package phoenix.wallets

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.bets.BetData
import phoenix.bets.BetProtocol.Events._
import phoenix.core.error.PresentationErrorCode
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterEntity.PunterId
import phoenix.wallets.WalletsBoundedContextProtocol.Bet
import phoenix.wallets.WalletsBoundedContextProtocol.BetFinalizationError
import phoenix.wallets.WalletsBoundedContextProtocol.BetPlacementOutcome
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.domain.Funds.RealMoney

private final class BetFinalizer(wallets: WalletsBoundedContext)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[BetEvent] {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  override def process(envelope: EventEnvelope[BetEvent]): Future[Done] = {
    log.info(s"processing ${envelope.event}")

    envelope.event match {
      case BetSettled(_, betData, reservationId, winner) =>
        val outcome = if (winner) BetPlacementOutcome.Won else BetPlacementOutcome.Lost
        finalizeBet(betData, reservationId, outcome)

      case BetVoided(_, betData, reservationId) =>
        finalizeBet(betData, reservationId, BetPlacementOutcome.Voided)

      case BetPushed(_, betData, reservationId) =>
        finalizeBet(betData, reservationId, BetPlacementOutcome.Pushed)

      case BetCancelled(_, betData, reservationId, _, _, _) =>
        finalizeBet(betData, reservationId, BetPlacementOutcome.Cancelled)

      case BetResettled(betId, betData, winner, _) =>
        val outcome = if (winner) BetPlacementOutcome.Won else BetPlacementOutcome.Lost
        val bet = Bet(betId, RealMoney(betData.stake.value), betData.odds)
        refinalizeBet(bet, betData.punterId, outcome)

      case otherEvent @ (BetOpened(_, _, _, _, _) | BetFailed(_, _, _)) =>
        log.debug(s"Ignoring $otherEvent, as it's not relevant to Bet Finalization")
        Future.successful(Done)
    }
  }

  private def refinalizeBet(bet: Bet, punterId: PunterId, outcome: BetPlacementOutcome): Future[Done] =
    wallets
      .refinalizeBet(WalletId.deriveFrom(punterId), bet, outcome)
      .bimap(error => new BetFinalizationException(error), _ => Done)
      .rethrowT

  private def finalizeBet(betData: BetData, reservationId: ReservationId, outcome: BetPlacementOutcome): Future[Done] =
    wallets
      .finalizeBet(WalletId.deriveFrom(betData.punterId), reservationId, outcome)
      .bimap(error => new BetFinalizationException(error), _ => Done)
      .rethrowT

}

private final class BetFinalizationException(domainError: BetFinalizationError)
    extends RuntimeException(domainError match {
      case WalletsBoundedContextProtocol.WalletNotFoundError(_) =>
        PresentationErrorCode.WalletNotFound.value
      case WalletsBoundedContextProtocol.ReservationNotFoundError(_, _) =>
        PresentationErrorCode.ReservationNotFound.value
      case WalletsBoundedContextProtocol.UnexpectedOutcomeError(_) =>
        PresentationErrorCode.UnexpectedBetState.value
    })
