package phoenix.markets

import java.time.OffsetDateTime

import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.Cancelled
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketLifecycle.Resettled
import phoenix.markets.MarketLifecycle.Settled
import phoenix.markets.MarketProtocol.Events._
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId

sealed trait MarketLifecycle {
  def changeReason: LifecycleChangeReason
}

object MarketLifecycle {
  final case class Bettable(changeReason: LifecycleOperationalChangeReason) extends MarketLifecycle
  final case class NotBettable(changeReason: LifecycleOperationalChangeReason) extends MarketLifecycle
  final case class Settled(changeReason: LifecycleOperationalChangeReason, winningSelection: SelectionId)
      extends MarketLifecycle
  final case class Resettled(changeReason: LifecycleOperationalChangeReason, newWinningSelection: SelectionId)
      extends MarketLifecycle
  final case class Cancelled(changeReason: LifecycleCancellationReason) extends MarketLifecycle
}

sealed trait LifecycleChangeReason
sealed trait LifecycleOperationalChangeReason extends LifecycleChangeReason
sealed trait LifecycleCancellationReason extends LifecycleChangeReason

object LifecycleChangeReason {
  final case object DataSupplierStatusChange extends LifecycleOperationalChangeReason
  final case class BackofficeChange(reason: String = "Requested by backoffice") extends LifecycleOperationalChangeReason
  final case class DataSupplierCancellation(reason: String) extends LifecycleCancellationReason
  final case class DataSupplierPush() extends LifecycleCancellationReason
  final case class BackofficeCancellation(reason: String = "Requested by backoffice")
      extends LifecycleCancellationReason
}

object MarketLifecycleTransitions {

  def attemptLifecycleTransition(
      id: MarketId,
      from: MarketLifecycle,
      to: MarketLifecycle,
      timestamp: OffsetDateTime): Option[MarketLifecycleEvent] =
    Option.when(canPerformTransition(from, to))(lifecycleEvent(id, to, timestamp))

  def lifecycleEvent(id: MarketId, lifecycle: MarketLifecycle, timestamp: OffsetDateTime): MarketLifecycleEvent =
    lifecycle match {
      case Bettable(changeReason)                  => MarketBecameBettable(id, changeReason, timestamp)
      case NotBettable(changeReason)               => MarketBecameNotBettable(id, changeReason, timestamp)
      case Settled(changeReason, winningSelection) => MarketSettled(id, winningSelection, changeReason, timestamp)
      case Resettled(changeReason, newWinningSelection) =>
        MarketResettled(id, newWinningSelection, changeReason, timestamp)
      case Cancelled(changeReason) => MarketCancelled(id, changeReason, timestamp)
    }

  private def canPerformTransition(from: MarketLifecycle, to: MarketLifecycle): Boolean =
    (from, to) match {
      case (Bettable(_), NotBettable(_))                                          => true
      case (NotBettable(BackofficeChange(_)), Bettable(DataSupplierStatusChange)) => false
      case (NotBettable(_), Bettable(_))                                          => true
      case (Bettable(_) | NotBettable(_), Settled(_, _))                          => true
      case (Bettable(_) | NotBettable(_), Cancelled(_))                           => true
      case (Settled(_, winningSelection), Resettled(_, newWinningSelection))
          if winningSelection != newWinningSelection =>
        true
      case _ => false
    }
}
