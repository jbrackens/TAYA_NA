package phoenix.bets.infrastructure.events

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.bets.BetProtocol.Events
import phoenix.bets.BetProtocol.Events.BetEvent
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.domain.PunterStakeRepository
import phoenix.bets.infrastructure.events.BetProjectionHandler.handleEvent
import phoenix.projections.ProjectionEventHandler

final class BetProjectionHandler(betViewRepository: PunterStakeRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[BetEvent] {
  override def process(envelope: EventEnvelope[BetEvent]): Future[Done] =
    handleEvent(betViewRepository)(envelope.event).map(_ => Done)
}

object BetProjectionHandler {
  def handleEvent(betViewRepository: PunterStakeRepository)(betEvent: BetEvent): Future[Unit] =
    betEvent match {
      case Events.BetSettled(betId, _, _, winner) =>
        val betOutcome = if (winner) BetOutcome.Won else BetOutcome.Lost
        betViewRepository.update(betId, BetStatus.Settled, Some(betOutcome))
      case Events.BetResettled(betId, _, winner, _) =>
        val betOutcome = if (winner) BetOutcome.Won else BetOutcome.Lost
        betViewRepository.update(betId, BetStatus.Resettled, Some(betOutcome))
      case Events.BetVoided(betId, _, _) =>
        betViewRepository.update(betId, BetStatus.Voided, newOutcome = None)
      case Events.BetPushed(betId, _, _) =>
        betViewRepository.update(betId, BetStatus.Pushed, newOutcome = None)
      case Events.BetCancelled(betId, _, _, _, _, _) =>
        betViewRepository.update(betId, BetStatus.Cancelled, newOutcome = None)
      case _: Events.BetOpened | _: Events.BetFailed =>
        Future.unit
    }
}
