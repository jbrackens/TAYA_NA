package phoenix.dbviews.infrastructure

import java.time.Instant
import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope
import cats.Applicative

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetsBoundedContext
import phoenix.core.Clock
import phoenix.dbviews.domain.model.TransferDescription
import phoenix.dbviews.domain.model.TransferType
import phoenix.dbviews.domain.model.TransferType._
import phoenix.dbviews.domain.model.WalletTransfer
import phoenix.markets.MarketsBoundedContext
import phoenix.projections.ProjectionEventHandler
import phoenix.punters.PunterEntity
import phoenix.punters.PuntersBoundedContext
import phoenix.wallets.WalletActorProtocol.events._
import phoenix.wallets.WalletsBoundedContextProtocol.Transaction
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason

class View03WalletTransfersProjectionHandler(
    repository: SlickView03WalletTransfersRepository,
    punters: PuntersBoundedContext,
    markets: MarketsBoundedContext,
    bets: BetsBoundedContext,
    clock: Clock)(implicit ec: ExecutionContext)
    extends ProjectionEventHandler[WalletEvent] {
  import View03WalletTransfersProjectionHandler._

  private def sessionIdResolver(punterId: PunterEntity.PunterId): Future[Option[PuntersBoundedContext.SessionId]] =
    (for {
      punter <- punters.getPunterProfile(punterId)
    } yield punter.maybeCurrentSession.map(_.sessionId)).value.map(_.toOption.flatten)

  private def fixtureNameResolver(betId: BetId): Future[Option[String]] =
    (for {
      bet <- bets.betDetails(betId).toOption
      market <- markets.getMarket(bet.marketId).toOption
    } yield market.fixture.name).value

  override def process(envelope: EventEnvelope[WalletEvent]): Future[Done] = {
    val timestamp = OffsetDateTime.ofInstant(Instant.ofEpochMilli(envelope.timestamp), clock.zone)

    for {
      transaction <- transform(timestamp, envelope.event, fixtureNameResolver, sessionIdResolver)
      _ <- transaction.fold(Future.unit)(repository.upsert)
    } yield Done
  }
}
object View03WalletTransfersProjectionHandler {
  def transform[F[_]](
      timestamp: OffsetDateTime,
      event: WalletEvent,
      fixtureNameResolver: BetId => F[Option[String]],
      sessionIdResolver: PunterEntity.PunterId => F[Option[PuntersBoundedContext.SessionId]])(implicit
      F: Applicative[F]): F[Option[WalletTransfer]] =
    event match {
      case e @ BetResettled(walletId, _, bet, _, _, _) =>
        val transaction = e.transaction
        F.map2(fixtureNameResolver(bet.betId), sessionIdResolver(walletId.owner))(
          (fixtureName, sessionId) =>
            Some(
              WalletTransfer(
                punterId = walletId.owner,
                sessionId = sessionId,
                transactionId = transaction.transactionId,
                timestamp,
                transferType = if (e.winner) ToWallet else FromWallet,
                transferDescription = TransferDescription.Profit,
                amount = e.bet.winnerFunds.moneyAmount,
                gameName = fixtureName,
                gameVersion = None,
                rgsName = None)))
      case e: TransactionEvent =>
        val transaction = e.transaction
        withTransactionEvent(transaction.reason).fold(F.pure(Option.empty[WalletTransfer])) {
          case (transferType, transferDescription) =>
            transaction match {
              case _: Transaction.PaymentTransaction =>
                F.map(sessionIdResolver(event.walletId.owner))(
                  sessionId =>
                    Some(WalletTransfer(
                      punterId = event.walletId.owner,
                      sessionId = sessionId,
                      transactionId = transaction.transactionId,
                      timestamp,
                      transferType = transferType,
                      transferDescription = transferDescription,
                      amount = transaction.amount,
                      gameName = None,
                      gameVersion = None,
                      rgsName = None)))
              case Transaction.BetTransaction(_, _, _, _, bet, _) =>
                F.map2(fixtureNameResolver(bet.betId), sessionIdResolver(event.walletId.owner)) {
                  (fixtureName, sessionId) =>
                    Some(
                      WalletTransfer(
                        punterId = event.walletId.owner,
                        sessionId = sessionId,
                        transactionId = transaction.transactionId,
                        timestamp,
                        transferType = transferType,
                        transferDescription = transferDescription,
                        amount = transaction.amount,
                        gameName = fixtureName,
                        gameVersion = None,
                        rgsName = None))
                }
            }
        }
      case _: WalletCreated | _: ResponsibilityCheckAccepted | _: ResponsibilityCheckAcceptanceRequested |
          _: PunterUnsuspendApproved | _: PunterUnsuspendRejected | _: NegativeBalance =>
        F.pure(None)
    }

  private def withTransactionEvent(reason: TransactionReason): Option[(TransferType, TransferDescription)] = {
    import TransactionReason._
    import TransferDescription._
    reason match {
      case BetWon                  => Some((ToWallet, Profit))
      case BetLost                 => Some((FromWallet, Profit))
      case AdjustingFundsDeposited => Some((ToWallet, CasinoAdjustment))
      case AdjustingFundsWithdrawn => Some((FromWallet, CasinoAdjustment))
      case FundsDeposited          => Some((ToWallet, Cash))
      case FundsWithdrawn          => Some((FromWallet, Cash))
      case WithdrawalConfirmed     => Some((FromWallet, Cash))
      case FundsReservedForBet | BetVoided | BetPushed | BetCancelled | BetResettled | WithdrawalCancelled |
          FundsReservedForWithdrawal =>
        None
    }
  }
}
