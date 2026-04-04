package phoenix.bets

import scala.collection.immutable.IndexedSeq

import enumeratum.EnumEntry.UpperSnakecase
import enumeratum._

import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetState.Status
import phoenix.bets.BetsBoundedContext.BetDetails
import phoenix.bets.infrastructure.BetValidationErrorMapping.betValidationErrorToString
import phoenix.core.websocket.PhoenixStateUpdate

/**
 * Bet state updates to be sent through phoenix.websockets towards frontend.
 * These are similar to BetProtocol.BetEvent, but just a subset from it
 */
case class BetStateUpdate(
    betId: BetId,
    state: BetStateUpdate.TargetState,
    betData: BetData,
    winner: Boolean,
    reason: Option[String])
    extends PhoenixStateUpdate

object BetStateUpdate {

  sealed trait TargetState extends EnumEntry with UpperSnakecase

  object TargetState extends Enum[TargetState] {
    override def values: IndexedSeq[TargetState] = findValues

    final case object Uninitialized extends TargetState
    final case object Opened extends TargetState
    final case object Failed extends TargetState
    final case object Settled extends TargetState
    final case object Resettled extends TargetState
    final case object Voided extends TargetState
    final case object Pushed extends TargetState
    final case object Cancelled extends TargetState

    def fromBetStatus(betStatus: Status): TargetState =
      betStatus match {
        case Status.Uninitialized => TargetState.Uninitialized
        case Status.Open          => TargetState.Opened
        case Status.Failed        => TargetState.Failed
        case Status.Settled       => TargetState.Settled
        case Status.Resettled     => TargetState.Resettled
        case Status.Voided        => TargetState.Voided
        case Status.Pushed        => TargetState.Pushed
        case Status.Cancelled     => TargetState.Cancelled
      }
  }

  def betStateUpdateOpened(betId: BetId, betData: BetData): BetStateUpdate =
    BetStateUpdate(betId, TargetState.Opened, betData, winner = false, reason = None)
  def betStateUpdateFailed(betId: BetId, betData: BetData, reason: String): BetStateUpdate =
    BetStateUpdate(betId, TargetState.Failed, betData, winner = false, Some(reason))
  def betStateUpdateSettled(betId: BetId, betData: BetData, winner: Boolean): BetStateUpdate =
    BetStateUpdate(betId, TargetState.Settled, betData, winner, reason = None)
  def betStateUpdateResettled(betId: BetId, betData: BetData, winner: Boolean): BetStateUpdate =
    BetStateUpdate(betId, TargetState.Resettled, betData, winner, reason = None)
  def betStateUpdateVoided(betId: BetId, betData: BetData): BetStateUpdate =
    BetStateUpdate(betId, TargetState.Voided, betData, winner = false, reason = None)
  def betStateUpdatePushed(betId: BetId, betData: BetData): BetStateUpdate =
    BetStateUpdate(betId, TargetState.Pushed, betData, winner = false, reason = None)
  def betStateUpdateCancelled(betId: BetId, betData: BetData): BetStateUpdate =
    BetStateUpdate(betId, TargetState.Cancelled, betData, winner = false, reason = None)

  def fromBetDetails(betDetails: BetDetails) = {
    val failures = betDetails.failureReasons.map(betValidationErrorToString)
    BetStateUpdate(
      betDetails.betId,
      TargetState.fromBetStatus(betDetails.status),
      BetData(betDetails.punterId, betDetails.marketId, betDetails.selectionId, betDetails.stake, betDetails.odds),
      betDetails.isWinner,
      if (failures.nonEmpty) Some(failures.mkString(",")) else None)
  }
}
