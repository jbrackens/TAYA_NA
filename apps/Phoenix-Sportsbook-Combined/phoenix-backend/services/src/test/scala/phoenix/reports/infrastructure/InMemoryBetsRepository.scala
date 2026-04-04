package phoenix.reports.infrastructure

import java.time.OffsetDateTime

import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.OptionT

import phoenix.bets.BetEntity
import phoenix.reports.domain.Bet
import phoenix.reports.domain.BetsRepository

private[reports] final class InMemoryBetsRepository(private var bets: List[Bet] = List.empty) extends BetsRepository {
  override def upsert(bet: Bet): Future[Unit] =
    Future.successful {
      replace(bet)
    }

  override def find(betId: BetEntity.BetId): OptionT[Future, Bet] =
    OptionT(Future.successful {
      bets.find(_.betId == betId)
    })

  override def setSettled(betId: BetEntity.BetId, settledAt: OffsetDateTime): Future[Unit] = {
    Future.successful {
      bets.find(_.betId == betId) match {
        case Some(openBet) => replace(openBet.copy(closedAt = Some(settledAt), initialSettlementData = Some(settledAt)))
        case None          => ()
      }
    }
  }

  override def setClosedAt(betId: BetEntity.BetId, closedAt: OffsetDateTime): Future[Unit] = {
    Future.successful {
      bets.find(_.betId == betId) match {
        case Some(openBet) => replace(openBet.copy(closedAt = Some(closedAt)))
        case None          => ()
      }
    }
  }

  private def replace(bet: Bet): Unit = {
    bets = bets.filter(_.betId != bet.betId) :+ bet
  }

  override def findOpenBetsAsOf(reference: OffsetDateTime): Source[Bet, NotUsed] = {
    def wasOpenedAt(placedAt: OffsetDateTime, maybeClosedAt: Option[OffsetDateTime]) =
      !placedAt.isAfter(reference) && maybeClosedAt.forall(_.isAfter(reference))

    val openedBets = bets.filter(bet => wasOpenedAt(bet.placedAt, bet.closedAt))

    Source(openedBets.sortBy(_.placedAt))
  }
}
