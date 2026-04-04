package phoenix.reports.domain

import java.time.OffsetDateTime

import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.OptionT

import phoenix.bets.BetEntity.BetId
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.model.bets.NormalizedStake

private[reports] trait BetsRepository {
  def upsert(bet: Bet): Future[Unit]
  def find(betId: BetId): OptionT[Future, Bet]
  def setSettled(betId: BetId, settledAt: OffsetDateTime): Future[Unit]
  def setClosedAt(betId: BetId, closedAt: OffsetDateTime): Future[Unit]
  def findOpenBetsAsOf(reference: OffsetDateTime): Source[Bet, NotUsed]
}

private[reports] final case class Bet(
    betId: BetId,
    punterId: PunterId,
    marketId: MarketId,
    selectionId: SelectionId,
    stake: NormalizedStake,
    placedAt: OffsetDateTime,
    closedAt: Option[OffsetDateTime],
    initialSettlementData: Option[OffsetDateTime])
