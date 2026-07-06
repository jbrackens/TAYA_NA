package phoenix.dbviews.infrastructure

import java.time.Instant
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import cats.Applicative

import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.Events._
import phoenix.bets.BetProtocol.Events.{BetEvent => PhoenixBetEvent}
import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.dbviews.domain.model.SportsWagers
import phoenix.dbviews.domain.model.SportsWagers._
import phoenix.markets.MarketCategory
import phoenix.markets.MarketsBoundedContext
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.projections.ProjectionEventHandler
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

final class View06SportsWagersProjectionHandler(
    repository: SlickView06SportsWagersRepository,
    markets: MarketsBoundedContext,
    clock: Clock)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[PhoenixBetEvent] {
  import View06SportsWagersProjectionHandler._

  override def process(envelope: EventEnvelope[PhoenixBetEvent]): Future[Done] = {
    val eventCreationTime = OffsetDateTime.ofInstant(Instant.ofEpochMilli(envelope.timestamp), clock.zone)
    for {
      transaction <- transform(envelope.event, eventCreationTime, marketData)
      _ <- transaction.fold(Future.unit)(repository.upsert)
    } yield Done
  }

  private val marketData: MarketId => Future[Option[MarketData]] =
    markets
      .getTradingMarket(_)
      .map { m =>
        MarketData(m.fixtureId, m.sport.abbreviation, MarketCategory(m.market.marketCategory))
      }
      .toOption
      .value

}
object View06SportsWagersProjectionHandler {
  final case class MarketData(fixtureId: FixtureId, sportAbbreviation: String, marketCategory: MarketCategory)
  private def transaction(
      marketData: MarketData,
      timestamp: OffsetDateTime,
      transactionType: TransactionType,
      betId: BetId,
      betData: BetData,
      reservationId: Option[ReservationId],
      transactionReason: Option[String],
      actualPayout: Option[MoneyAmount]): SportsWagers.Transaction =
    SportsWagers.Transaction(
      betId = betId,
      fixtureId = marketData.fixtureId,
      punterId = betData.punterId,
      transactionId = reservationId.map(_.unwrap),
      timestamp = timestamp,
      transactionType = transactionType,
      transactionReason = transactionReason,
      toWager = betData.punterStake,
      toWin = betData.potentialCompanyLoss,
      toPay = betData.winnerFunds,
      actualPayout = actualPayout,
      wagerLeagues = marketData.sportAbbreviation,
      wagerStyle = WagerStyle.fromMarketCategory(marketData.marketCategory),
      wagerOdds = Some(betData.odds.toAmericanOdds))

  def transform[F[_]: Applicative](
      event: PhoenixBetEvent,
      createdAt: OffsetDateTime,
      marketResolver: MarketId => F[Option[MarketData]]): F[Option[SportsWagers.Transaction]] = {
    def withMarket: MarketId => (MarketData => SportsWagers.Transaction) => F[Option[SportsWagers.Transaction]] =
      id => Applicative[F].compose[Option].map(marketResolver(id))

    event match {
      case BetOpened(betId, betData, reservationId, _, _) =>
        withMarket(betData.marketId) {
          transaction(_, createdAt, TransactionType.Created, betId, betData, Some(reservationId), None, None)
        }
      case BetSettled(betId, betData, reservationId, winner) =>
        withMarket(betData.marketId) {
          val payout = if (winner) betData.winnerFunds else MoneyAmount.zero.get
          transaction(_, createdAt, TransactionType.Settled, betId, betData, Some(reservationId), None, Some(payout))
        }
      case BetResettled(betId, betData, winner, _) =>
        withMarket(betData.marketId) {
          val actualPayout = if (winner) betData.winnerFunds else MoneyAmount.zero.get - betData.winnerFunds
          transaction(_, createdAt, TransactionType.Resettled, betId, betData, None, None, Some(actualPayout))
        }
      case BetVoided(betId, betData, reservationId) =>
        withMarket(betData.marketId) {
          transaction(
            _,
            createdAt,
            TransactionType.Voided,
            betId,
            betData,
            Some(reservationId),
            Some("BetVoided"),
            None)
        }
      case BetCancelled(betId, betData, reservationId, _, cancellationReason, _) =>
        withMarket(betData.marketId) {
          transaction(
            _,
            createdAt,
            TransactionType.Cancelled,
            betId,
            betData,
            Some(reservationId),
            Some(cancellationReason.value),
            None)
        }
      case _ => Applicative[F].pure(None)
    }
  }

}
