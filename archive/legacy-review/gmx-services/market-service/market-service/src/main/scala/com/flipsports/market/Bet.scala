package com.flipsports.market

import akka.actor.typed.{ActorRef, Behavior}
import akka.persistence.typed.scaladsl.{Effect, EventSourcedBehavior}
import akka.persistence.typed.PersistenceId
import com.flipsports.market.BetEvents.BetPlaced

/**
 * Betting commands.
 */
object BetCommands {

  sealed trait BetCommand

  case class BetDto(customerId: String,
                      marketId: String,
                      selectionId: String,
                      liability: BigDecimal,
                      currency: String,
                      price: BigDecimal,
                      acceptBetterPrice: Boolean)

  case class PlaceBet(bet: BetDto,
                      betId: String,
                      replyTo: ActorRef[BetPlaced]) extends BetCommand
}

/**
 * Betting events.
 */
object BetEvents {

  sealed trait BetEvent

  case class BetPlaced(bidId: String,
                       customerId: String,
                       marketId: String,
                       selectionId: String,
                       liability: BigDecimal,
                       currency: String,
                       price: BigDecimal,
                       acceptBetterPrice: Boolean) extends BetEvent

  case class BetFailed(reason: String) extends BetEvent
}

/**
 * Status of any given bet.
 */
object BetStatus extends Enumeration {
  type BetStatus = Value
  val Uninitialized, Started, Failed, Open, Cleared = Value
}

/**
 * This represents a bet that has a status.
 * betting is optimistic, so this will message out to various systems confirming the bet is allowed and that the
 * wallet funds are available and extracted.
 *
 * Traits (as we're using here) are usually easier to test.
 *
 * The state machine aspects of this are very much todo:
 */
trait Bet {

  import BetCommands._
  import BetEvents._
  import BetStatus._

  final case class State(status: BetStatus)

  def initialCommandHandler(state: State, command: BetCommand): Effect[BetEvent, State] =
    command match {
      case PlaceBet(bet, id, replyTo) =>
        Effect.persist(BetPlaced(id, bet.customerId, bet.marketId, bet.selectionId, bet.liability, bet.currency,
          bet.price, bet.acceptBetterPrice))
      case _ => throw new NotImplementedError("TODO: process the command & return an Effect")
    }

  def initialEventHandler(state: State, event: BetEvent): State =
    event match {
      case BetPlaced(bidId, customerId, marketId, selectionId, liability, currency, price, acceptBetterPrice) =>
        State(Started)
      case _ => throw new NotImplementedError("TODO: process the event return the next state")
    }
}

/**
 * Impl of above.
 */
object BetEntity extends Bet {

  import BetCommands._
  import BetEvents._
  import BetStatus._

  def apply(id: String): Behavior[BetCommand] =
    EventSourcedBehavior[BetCommand, BetEvent, State] (
      persistenceId = PersistenceId.ofUniqueId(id),
      emptyState = State(Uninitialized),
      commandHandler = initialCommandHandler,
      eventHandler = initialEventHandler)
}
