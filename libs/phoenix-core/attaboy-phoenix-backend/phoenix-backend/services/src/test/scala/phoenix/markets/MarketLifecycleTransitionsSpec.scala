package phoenix.markets

import java.time.OffsetDateTime

import org.scalatest.Inspectors
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers

import phoenix.markets.LifecycleChangeReason.BackofficeCancellation
import phoenix.markets.LifecycleChangeReason.BackofficeChange
import phoenix.markets.LifecycleChangeReason.DataSupplierCancellation
import phoenix.markets.LifecycleChangeReason.DataSupplierStatusChange
import phoenix.markets.MarketLifecycle.Bettable
import phoenix.markets.MarketLifecycle.Cancelled
import phoenix.markets.MarketLifecycle.NotBettable
import phoenix.markets.MarketLifecycle.Resettled
import phoenix.markets.MarketLifecycle.Settled
import phoenix.markets.MarketProtocol.Events.MarketBecameBettable
import phoenix.markets.MarketProtocol.Events.MarketBecameNotBettable
import phoenix.markets.MarketProtocol.Events.MarketCancelled
import phoenix.markets.MarketProtocol.Events.MarketResettled
import phoenix.markets.MarketProtocol.Events.MarketSettled
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.MarketsBoundedContext.SelectionId
import phoenix.support.DataGenerator.generateMarketId
import phoenix.support.DataGenerator.generateSelectionId

final class MarketLifecycleTransitionsSpec extends AnyFreeSpec with Matchers with Inspectors {

  private val id: MarketId = generateMarketId()
  private val winningSelection: SelectionId = generateSelectionId()
  private val newWinnginSelection: SelectionId = generateSelectionId()
  private val timestamp: OffsetDateTime = OffsetDateTime.MIN

  "Market transitions" - {
    "Bettable -> NotBettable transition" - {
      "should be always possible, regardless of change reason" in {
        // given
        val transitions = crossProduct(
          Seq(Bettable(DataSupplierStatusChange), Bettable(BackofficeChange())),
          Seq(NotBettable(DataSupplierStatusChange), NotBettable(BackofficeChange())))

        // then
        forEvery(transitions) {
          case (from, to) =>
            MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe Some(
              MarketBecameNotBettable(
                marketId = id,
                reason = to.changeReason.asInstanceOf[LifecycleOperationalChangeReason],
                updatedAt = timestamp))
        }
      }

      "NotBettable -> Bettable transition" - {
        "should not be possible by oddin change, if the initial cause was backoffice" in {
          // given
          val from = NotBettable(BackofficeChange())
          val to = Bettable(DataSupplierStatusChange)

          // then
          MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe None
        }

        "should be possible otherwise" in {
          // given
          val transitions = Seq(
            NotBettable(BackofficeChange()) -> Bettable(BackofficeChange()),
            NotBettable(DataSupplierStatusChange) -> Bettable(BackofficeChange()),
            NotBettable(DataSupplierStatusChange) -> Bettable(DataSupplierStatusChange))

          // then
          forEvery(transitions) {
            case (from, to) =>
              MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe Some(
                MarketBecameBettable(marketId = id, reason = to.changeReason, updatedAt = timestamp))
          }
        }
      }

      "Bettable -> Settled transition" - {
        "should be always possible, regardless of change reason" in {
          // given
          val transitions = crossProduct(
            Seq(Bettable(DataSupplierStatusChange), Bettable(BackofficeChange())),
            Seq(Settled(DataSupplierStatusChange, winningSelection), Settled(BackofficeChange(), winningSelection)))

          // then
          forEvery(transitions) {
            case (from, to) =>
              MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe Some(
                MarketSettled(
                  marketId = id,
                  reason = to.changeReason.asInstanceOf[LifecycleOperationalChangeReason],
                  updatedAt = timestamp,
                  winningSelection = winningSelection))
          }
        }
      }

      "NotBettable -> Settled transition" - {
        "should be always possible, regardless of change reason" in {
          // given
          val transitions = crossProduct(
            Seq(NotBettable(DataSupplierStatusChange), NotBettable(BackofficeChange())),
            Seq(Settled(DataSupplierStatusChange, winningSelection), Settled(BackofficeChange(), winningSelection)))

          // then
          forEvery(transitions) {
            case (from, to) =>
              MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe Some(
                MarketSettled(
                  marketId = id,
                  reason = to.changeReason.asInstanceOf[LifecycleOperationalChangeReason],
                  updatedAt = timestamp,
                  winningSelection = winningSelection))
          }
        }
      }

      "Bettable -> Cancelled transition" - {
        "should be always possible, regardless of change reason" in {
          // given
          val transitions = crossProduct(
            Seq(Bettable(DataSupplierStatusChange), Bettable(BackofficeChange())),
            Seq(Cancelled(DataSupplierCancellation("a reason")), Cancelled(BackofficeCancellation())))

          // then
          forEvery(transitions) {
            case (from, to) =>
              MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe Some(
                MarketCancelled(
                  marketId = id,
                  reason = to.changeReason.asInstanceOf[LifecycleCancellationReason],
                  updatedAt = timestamp))
          }
        }
      }

      "NotBettable -> Cancelled transition" - {
        "should be always possible, regardless of change reason" in {
          // given
          val transitions = crossProduct(
            Seq(NotBettable(DataSupplierStatusChange), NotBettable(BackofficeChange())),
            Seq(Cancelled(DataSupplierCancellation("a reason")), Cancelled(BackofficeCancellation())))

          // then
          forEvery(transitions) {
            case (from, to) =>
              MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe Some(
                MarketCancelled(
                  marketId = id,
                  reason = to.changeReason.asInstanceOf[LifecycleCancellationReason],
                  updatedAt = timestamp))
          }
        }
      }

      "Settled -> Resettled transition" - {
        "should be possible, regardless of change reason, if result is different" in {
          // given
          val transitions = crossProduct(
            Seq(Settled(DataSupplierStatusChange, winningSelection), Settled(BackofficeChange(), winningSelection)),
            Seq(
              Resettled(DataSupplierStatusChange, newWinnginSelection),
              Resettled(BackofficeChange(), newWinnginSelection)))

          // then
          forEvery(transitions) {
            case (from, to) =>
              MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe Some(
                MarketResettled(
                  marketId = id,
                  reason = to.changeReason.asInstanceOf[LifecycleOperationalChangeReason],
                  updatedAt = timestamp,
                  newWinningSelection = newWinnginSelection))
          }
        }

        "should not be possible, regardless of change reason, if result is the same" in {
          // given
          val transitions = crossProduct(
            Seq(Settled(DataSupplierStatusChange, winningSelection), Settled(BackofficeChange(), winningSelection)),
            Seq(Resettled(DataSupplierStatusChange, winningSelection), Resettled(BackofficeChange(), winningSelection)))

          // then
          forEvery(transitions) {
            case (from, to) =>
              MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe None
          }
        }
      }

      "Settled -> Any transition" - {
        "should never be possible" in {
          // given
          val transitions = crossProduct(
            Seq(Settled(DataSupplierStatusChange, winningSelection), Settled(BackofficeChange(), winningSelection)),
            Seq(
              Bettable(DataSupplierStatusChange),
              Bettable(BackofficeChange()),
              NotBettable(DataSupplierStatusChange),
              NotBettable(BackofficeChange()),
              Cancelled(DataSupplierCancellation("a reason")),
              Cancelled(BackofficeCancellation())))

          // then
          forEvery(transitions) {
            case (from, to) =>
              MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe None
          }
        }
      }

      "Cancelled -> Any transition" - {
        "should never be possible" in {
          // given
          val transitions = crossProduct(
            Seq(Cancelled(DataSupplierCancellation("a reason")), Cancelled(BackofficeCancellation("a reason"))),
            Seq(
              Bettable(DataSupplierStatusChange),
              Bettable(BackofficeChange()),
              NotBettable(DataSupplierStatusChange),
              NotBettable(BackofficeChange()),
              Settled(DataSupplierStatusChange, winningSelection),
              Settled(BackofficeChange(), winningSelection)))

          // then
          forEvery(transitions) {
            case (from, to) =>
              MarketLifecycleTransitions.attemptLifecycleTransition(id, from, to, timestamp) shouldBe None
          }
        }
      }
    }
  }

  private def crossProduct(
      from: Seq[MarketLifecycle],
      to: Seq[MarketLifecycle]): Seq[(MarketLifecycle, MarketLifecycle)] =
    for { from <- from; to <- to } yield (from, to)
}
