package phoenix.bets

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import phoenix.bets.BetProtocol.Events._
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.domain.MarketBet
import phoenix.bets.domain.MarketBetsRepository
import phoenix.projections.ProjectionEventHandler

final class BetLifecycleHandler(marketBets: MarketBetsRepository)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[BetEvent] {

  private val log: Logger = LoggerFactory.getLogger(getClass)

  override def process(envelope: EventEnvelope[BetEvent]): Future[Done] = {
    log.info(s"processing ${envelope.event}")

    envelope.event match {
      case BetSettled(betId, betData, _, _) =>
        updateBetRow(MarketBet(betId, betData.marketId, BetStatus.Settled))

      case BetResettled(betId, betData, _, _) =>
        updateBetRow(MarketBet(betId, betData.marketId, BetStatus.Resettled))

      case BetVoided(betId, betData, _) =>
        updateBetRow(MarketBet(betId, betData.marketId, BetStatus.Voided))

      case BetPushed(betId, betData, _) =>
        updateBetRow(MarketBet(betId, betData.marketId, BetStatus.Pushed))

      case BetCancelled(betId, betData, _, _, _, _) =>
        updateBetRow(MarketBet(betId, betData.marketId, BetStatus.Cancelled))

      case otherEvent =>
        log.debug(s"Bet ${otherEvent.betId} changed by $otherEvent")
        Future.successful(Done)
    }
  }

  private def updateBetRow(row: MarketBet): Future[Done] =
    marketBets.save(row).map(_ => Done)
}
