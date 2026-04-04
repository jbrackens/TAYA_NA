package phoenix.bets

import java.time.OffsetDateTime
import java.util.NoSuchElementException

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import org.slf4j.LoggerFactory

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.Events._
import phoenix.bets.BetsBoundedContext.BetHistory
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsBoundedContext.BetSummary
import phoenix.core.TimeUtils.TimeUtilsLongOps
import phoenix.markets.MarketVisibility
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketAggregate.CompetitorSummary
import phoenix.markets.MarketsBoundedContext.MarketAggregate.SelectionSummary
import phoenix.markets.MarketsBoundedContext._
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.projections.ProjectionEventHandler

private class PunterBetsHistoryHandler(markets: MarketsBoundedContext, betsHistory: PunterBetHistoryRepository)(implicit
    ec: ExecutionContext)
    extends ProjectionEventHandler[BetEvent] {

  private val log = LoggerFactory.getLogger(getClass)

  override def process(envelope: EventEnvelope[BetEvent]): Future[Done] = {
    log.info(s"processing bet event ${envelope.event}")

    val eventProcessing = envelope.event match {
      case BetOpened(betId, betData, _, _, placedAt) =>
        for {
          marketDetails <- findMarket(betData.marketId)
          fixtureDetails <- findFixture(marketDetails.fixture.id)
          selection <- findSelection(marketDetails, betData.selectionId)
          competitor <- findCompetitor(fixtureDetails, selection.name)
          betRow = buildBetRow(betId, marketDetails, betData, selection, competitor, placedAt)
          _ <- betsHistory.save(betRow)
        } yield ()

      case BetSettled(betId, _, _, winner) =>
        val betOutcome = if (winner) BetOutcome.Won else BetOutcome.Lost
        for {
          openBet <- findBet(betId)
          fixtureDetails <- findFixture(openBet.fixture.id)
          settledBet =
            openBet.settled(settledAt = envelope.timestamp.toUtcOffsetDateTime, betOutcome, fixtureDetails.status)
          _ <- betsHistory.save(settledBet)
        } yield ()

      case BetResettled(betId, _, winner, resettledAt) =>
        val betOutcome = if (winner) BetOutcome.Won else BetOutcome.Lost
        for {
          openBet <- findBet(betId)
          fixtureDetails <- findFixture(openBet.fixture.id)
          resettledBet = openBet.resettled(resettledAt, betOutcome, fixtureDetails.status)
          _ <- betsHistory.save(resettledBet)
        } yield ()

      case BetVoided(betId, _, _) =>
        for {
          openBet <- findBet(betId)
          fixtureDetails <- findFixture(openBet.fixture.id)
          voidedBet = openBet.voided(voidedAt = envelope.timestamp.toUtcOffsetDateTime, fixtureDetails.status)
          _ <- betsHistory.save(voidedBet)
        } yield ()

      case BetPushed(betId, _, _) =>
        for {
          openBet <- findBet(betId)
          fixtureDetails <- findFixture(openBet.fixture.id)
          pushedBet = openBet.pushed(pushedAt = envelope.timestamp.toUtcOffsetDateTime, fixtureDetails.status)
          _ <- betsHistory.save(pushedBet)
        } yield ()

      case BetCancelled(betId, _, _, _, _, betCancellationTimestamp) =>
        for {
          openBet <- findBet(betId)
          fixtureDetails <- findFixture(openBet.fixture.id)
          cancelledBet = openBet.cancelled(cancelledAt = betCancellationTimestamp, fixtureDetails.status)
          _ <- betsHistory.save(cancelledBet)
        } yield ()

      case other: BetFailed =>
        Future(log.debug(s"Bet event irrelevant for punter betting history: $other"))
    }

    eventProcessing.map(_ => Done)
  }

  private def findMarket(marketId: MarketId): Future[MarketAggregate] =
    markets.getMarket(marketId).valueOrF {
      case MarketNotFound(id) => Future.failed(new NoSuchElementException(s"No such market [marketId = $id]"))
    }

  private def findFixture(fixtureId: FixtureId): Future[FixtureDetailData] =
    markets.getFixtureDetails(fixtureId, Set(MarketVisibility.Featured, MarketVisibility.Enabled)).valueOrF {
      case FixtureNotFound(id) => Future.failed(new NoSuchElementException(s"No such fixture [fixtureId = $id]"))
    }

  private def findSelection(market: MarketAggregate, selectionId: SelectionId): Future[SelectionSummary] =
    Future.successful(market.selectionSummary(selectionId).getOrElse {
      throw new NoSuchElementException(s"Missing selection [selectionId = $selectionId]")
    })

  private def findCompetitor(fixture: FixtureDetailData, qualifier: String): Future[Option[CompetitorSummary]] =
    Future.successful {
      fixture.competitors.get(qualifier).map(competitor => CompetitorSummary(competitor.competitorId, competitor.name))
    }

  private def buildBetRow(
      betId: BetId,
      market: MarketAggregate,
      bet: BetData,
      selection: SelectionSummary,
      competitor: Option[CompetitorSummary],
      betOpenedAt: OffsetDateTime): BetHistory = {
    val betDetails =
      BetSummary(
        betId,
        bet.stake,
        bet.odds,
        placedAt = betOpenedAt,
        settledAt = None,
        resettledAt = None,
        voidedAt = None,
        pushedAt = None,
        cancelledAt = None,
        outcome = None,
        status = BetStatus.Open)

    BetHistory(
      bet.punterId,
      betDetails,
      market.sport,
      market.tournament,
      market.fixture,
      market.marketSummary,
      selection,
      competitor)
  }

  private def findBet(betId: BetId): Future[BetHistory] =
    betsHistory.get(betId).flatMap {
      case Some(bet) => Future.successful(bet)
      case None      => Future.failed(new NoSuchElementException(s"No such bet [betId = $betId]"))
    }
}
