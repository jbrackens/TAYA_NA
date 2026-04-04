package phoenix.backoffice

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.backoffice.MarketExposureProjectionHandler.handleEvent
import phoenix.bets.BetProtocol.Events.BetCancelled
import phoenix.bets.BetProtocol.Events.BetEvent
import phoenix.bets.BetProtocol.Events.BetFailed
import phoenix.bets.BetProtocol.Events.BetOpened
import phoenix.bets.BetProtocol.Events.BetPushed
import phoenix.bets.BetProtocol.Events.BetResettled
import phoenix.bets.BetProtocol.Events.BetSettled
import phoenix.bets.BetProtocol.Events.BetVoided
import phoenix.core.currency.MoneyAmount
import phoenix.projections.ProjectionEventHandler

private[backoffice] final class MarketExposureProjectionHandler(repository: MarketExposureRepository)(implicit
    ec: ExecutionContext)
    extends ProjectionEventHandler[BetEvent] {

  override def process(envelope: EventEnvelope[BetEvent]): Future[Done] =
    handleEvent(envelope.event, repository).map(_ => Done)
}

private[backoffice] object MarketExposureProjectionHandler {
  def handleEvent(betEvent: BetEvent, repository: MarketExposureRepository): Future[Unit] =
    betEvent match {
      case BetOpened(_, betData, _, _, _) =>
        repository.updateExposure(
          betData.marketId,
          betData.selectionId,
          totalStakedDelta = MoneyAmount(betData.stake.value.amount),
          potentialLossDelta = betData.potentialCompanyLoss)

      case BetSettled(_, betData, _, _) =>
        repository.updateExposure(
          betData.marketId,
          betData.selectionId,
          totalStakedDelta = MoneyAmount(betData.stake.value.amount) * -1,
          potentialLossDelta = betData.potentialCompanyLoss * -1)

      case _: BetFailed | _: BetCancelled | _: BetPushed | _: BetResettled | _: BetVoided => Future.unit
    }
}
