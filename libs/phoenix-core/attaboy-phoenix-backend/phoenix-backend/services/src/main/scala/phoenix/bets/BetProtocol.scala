package phoenix.bets

import java.time.OffsetDateTime

import akka.actor.typed.ActorRef

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetValidator.BetValidationError
import phoenix.bets.infrastructure.BetsAkkaSerializable
import phoenix.core.odds.Odds
import phoenix.http.core.Geolocation
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.punters.PunterEntity.AdminId
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

object BetProtocol {

  object Commands {
    import phoenix.bets.BetProtocol.Responses.BetResponse

    sealed trait BetCommand extends BetsAkkaSerializable {
      val betId: BetId
      val replyTo: ActorRef[BetResponse]
    }

    final case class OpenBet(
        betId: BetId,
        betData: BetData,
        geolocation: Geolocation,
        reservationId: ReservationId,
        placedAt: OffsetDateTime,
        replyTo: ActorRef[BetResponse])
        extends BetCommand
    final case class FailBet(
        betId: BetId,
        betData: BetData,
        reasons: List[BetValidationError],
        replyTo: ActorRef[BetResponse])
        extends BetCommand
    final case class GetBetDetails(betId: BetId, replyTo: ActorRef[BetResponse]) extends BetCommand
    final case class SettleBet(
        betId: BetId,
        marketId: MarketId,
        winningSelectionId: SelectionId,
        replyTo: ActorRef[BetResponse])
        extends BetCommand
    final case class ResettleBet(
        betId: BetId,
        marketId: MarketId,
        newWinningSelectionId: SelectionId,
        resettledAt: OffsetDateTime,
        replyTo: ActorRef[BetResponse])
        extends BetCommand
    final case class VoidBet(betId: BetId, replyTo: ActorRef[BetResponse]) extends BetCommand
    final case class PushBet(betId: BetId, replyTo: ActorRef[BetResponse]) extends BetCommand
    final case class CancelBet(
        betId: BetId,
        adminUser: AdminId,
        cancellationReason: CancellationReason,
        betCancellationTimestamp: OffsetDateTime,
        replyTo: ActorRef[BetResponse])
        extends BetCommand
  }

  // RESPONSES
  object Responses {

    sealed trait BetResponse extends BetsAkkaSerializable

    object Success {
      final case class BetOpened(betId: BetId) extends BetResponse
      final case class BetFailed(betId: BetId) extends BetResponse
      final case class BetSettled(betId: BetId) extends BetResponse
      final case class BetResettled(betId: BetId) extends BetResponse
      final case class BetVoided(betId: BetId) extends BetResponse
      final case class BetPushed(betId: BetId) extends BetResponse
      final case class BetCancelled(betId: BetId) extends BetResponse
      final case class BetDetails(betId: BetId, status: BetState.Status, data: BetData, isWinner: Boolean)
          extends BetResponse
      final case class FailedBetDetails(betId: BetId, data: BetData, reasons: List[BetValidationError])
          extends BetResponse
    }

    object Failure {
      final case class BetNotInitialized(betId: BetId) extends BetResponse
      final case class GetBetDetailsFailure(betId: BetId, reason: String) extends BetResponse
      final case class AlreadyCancelled(betId: BetId) extends BetResponse
    }
  }

  // EVENTS
  object Events {
    sealed trait BetEvent extends BetsAkkaSerializable {
      def betId: BetId
    }

    final case class BetOpened(
        betId: BetId,
        betData: BetData,
        reservationId: ReservationId,
        geolocation: Geolocation,
        placedAt: OffsetDateTime)
        extends BetEvent
    final case class BetFailed(betId: BetId, betData: BetData, reasons: List[BetValidationError]) extends BetEvent
    final case class BetSettled(betId: BetId, betData: BetData, reservationId: ReservationId, winner: Boolean)
        extends BetEvent
    final case class BetResettled(betId: BetId, betData: BetData, winner: Boolean, resettledAt: OffsetDateTime)
        extends BetEvent
    final case class BetVoided(betId: BetId, betData: BetData, reservationId: ReservationId) extends BetEvent
    final case class BetPushed(betId: BetId, betData: BetData, reservationId: ReservationId) extends BetEvent
    final case class BetCancelled(
        betId: BetId,
        betData: BetData,
        reservationId: ReservationId,
        adminUser: AdminId,
        cancellationReason: CancellationReason,
        betCancellationTimestamp: OffsetDateTime)
        extends BetEvent
  }

  /**
   * Betting Domain Request (These are the objects that are received from outside the Betting Context... they're the API Objects
   */
  final case class BetRequest(
      marketId: MarketId,
      selectionId: SelectionId,
      stake: Stake,
      odds: Odds,
      acceptBetterOdds: Boolean)

  final case class BetsStatusRequest(betIds: List[BetId])

}
