---
id: persistent-actor-guidelines
title: Coding Guidelines for Akka Persistent Actors
sidebar_label: Persistent Actor Coding Guidelines
---

## Introduction 

Phoenix makes use of Persistent Actors as the `Entities` within each Bounded Context. These actors are modelled as state machines - different commands are handled differently depending on the current state of the Actor is in when the command is received. 

The `Entity` behaviour can be complex, different Commands can mean different things when the `Entity` is in a different state. Each Command sent to the `Entity` can succeed in only one way but can have many modes of failure - each of which needs to be accounted for. This leads to complex code - to try and combat this complexity we introduce a set of patterns.

These patterns help us with:

* Readability/Understanding - A developer can easily recognise where the handling of a command is taking place when in a particular state.
* Resilience - There is a standard mechanism for responding when a command is received unexpectedly (in a state which is not permitted to handle the command).

The patterns are:

* Protocol - each `Entity` defines, in a separate file, the types of messages it can receive and those which it can send, in a particular structure.
* State - each `Entity` defines, in a separate file, the different states that it can be in, those states define their properties and the ways in which one state can move to another.
* Command Handlers - each `Entity` defines how it handles Commands in a separate object with a particular structure.
* Event Handers - each `Entity` defines how it handles Events in a separate object with a particular structure.

### Protocol

An `Entity` protocol follows this structure:

```scala
object BetProtocol { (1)

  object Commands { (2)

    sealed trait BetCommand extends CirceAkkaSerializable { (3)
      val betId: BetId
    }

    final case class PlaceBet(betId: BetId, betData: BetData, replyTo: ActorRef[BetResponse]) extends BetCommand (4)

    ...
  }

  // RESPONSES
  object Responses { (5)

    sealed trait BetResponse extends CirceAkkaSerializable (6)
  
    ...

    object Success {
      final case class Confirmation(betId: BetId) extends BetResponse (7)

      ...
    }

    object Failure {
      final case class BetNotInitialized(betId: BetId) extends BetResponse (8)

      ...
    }
  }

  // EVENTS
  object Events {
    sealed trait BetEvent extends CirceAkkaSerializable { (9)
      def betId: BetId
    }

    final case class BetPending(betId: BetId, betData: BetData) extends BetEvent
}

```

1. `Entity` protocols are defined in an object.
2. Commands are defined in a nested object.
3. Commands all extend from a base __`sealed trait`__ which itself extends from `CirceAkkaSerializable` in order to be serialized over the wire.
4. Each Command is then a __`case class`__ which extends from the base trait. It must define a `replyTo` property which allows the `Entity` to reply to the command.
5. Responses to the Commands are themselves defined in an object.
6. Again, Responses all extend from a `CirceAkkaSerializable` __`sealed trait`__
7. Responses can either be success...
8. ...or failure
9. Finally, we have Events that are created by the `Entity`, they follow the same pattern, __`sealed trait`__s defined in an encasing object.

This structure of nested objects allows us to make it clear in the Comand Handlers which responses are Success and which are Failure cases.

For instance:

```scala
private def getBetDetails(state: BetState, command: GetBetDetails, betId: BetId): Effect[BetEvent, BetState] = {
    val response = state match {
      case Uninitialized       => Failure.BetNotInitialized(betId)
      case hasData: HasBetData => Success.BetDetails(betId, state.getStatusString, hasData.betData)
      case other               => Failure.GetBetDetailsFailure(betId, s"Unknown state for bet $other")
    }
    
    Effect.reply(command.replyTo)(response)
}
```

In this case we can clearly see which `case`s result in success and which in failure.

### Command Handlers

A distinct __`private object`__ is defined (named `<entity name>CommandHandler`) which will encapsulate both the decision making (when to handle a particular command, depending on current state) and the logic for the actual command handling.

This snippet is based on the `phoenix.bets.BetEntity`

```scala {4,11,13-14,16,19}
private object BetCommandHandler {
  import BetState._

  type CommandHandler = EventSourcedBehavior.CommandHandler[BetCommand, BetEvent, BetState] (1)

  def apply(
      betId: BetId,
      validator: ActorBetValidatorAdapter,
      metrics: Metrics,
      context: ActorContext[BetCommand]): CommandHandler = {
    case (Uninitialized, command: PlaceBet)              => placeBet(command, betId, validator, metrics, context) (2)
    ...
    case (state: Pending, command: BetValidationSuccess) => open(state, command.reservationId, betId, metrics) (3)
    case (state: Pending, command: BetValidationFailure) => fail(state, command.reasons, betId, metrics)
    ...
    case (otherState, otherCommand)                      => ignoreCommand(otherState, otherCommand, context) (4)
  }

  private def placeBet( (5)
      command: PlaceBet,
      betId: BetId,
      validator: ActorBetValidatorAdapter,
      metrics: Metrics,
      context: ActorContext[BetCommand]): Effect[BetEvent, BetState] = {
    metrics.stopwatch.activate(PlaceBetMetricsKey)
    Effect
      .persist(BetPending(betId, command.betData))
      .thenRun((_: BetState) => updateMetricsCounter(BetState.Status.Pending, metrics, _.increment()))
      .thenRun((_: BetState) => validator.validateBet(betId, command.betData, context.self))
      .thenReply(command.replyTo)(_ => Success.BetAccepted(betId))
  }

  ...

  private def ignoreCommand( (6)
      state: BetState,
      command: BetCommand,
      context: ActorContext[_]): Effect[BetEvent, BetState] = {
    context.log.error(s"Ignoring market command $command in state $state") (7)
    Effect.none
  }
```

1. The `CommandHandler` helps simplify the type we're defining
2. The `CommandHandler` matches on both `State` and `Command` - in this way we can define the handling of each state/command pair.
3. Stacking the commands by state greatly improves readability.
4. The last `case` defines the catch-all mechanism for any command that falls through.
5. All command handlers are declared __`private`__
6. Unexpected commands are logged and no `Effect` occurs. We basically ignore the command.
7. These unexpected messages are logged at `ERROR` level - if they happen in production we should be responding to them!

### Event Handlers

Event handling mirrors Command handling in how the decision is made about _how_ a message should be handled. 

There are two differences between `Event` and `Command` handlers
 
1. An `Event` is being matched with `State` rather than a `Command`.
2. How the `State` is changed once a match has been recognised. Rather than a __private def__ within the handler we delegate the logic to the `State` object itself. 

As with `Command` handlers `Event` handlers are defined in a __`private object`__ (named `<entity name>EventHandler`). Again, we see an example from `BetEntity`

```scala
private object BetEventHandler {

  type EventHandler = EventSourcedBehavior.EventHandler[BetState, BetEvent] (1)

  def apply(): EventHandler = {
    case (Uninitialized, event: BetPending)          => Uninitialized.pending(event.betId, event.betData) (2)
    case (state: Pending, event: BetOpened)          => state.open(event.betData, event.reservationId) (3)
    case (state: Pending, event: BetFailed)          => state.fail(event.reasons)
    case (state: Open, event: BetCancelled)          => state.cancel(event.reason)
    case (state: Open, event: BetSettlingStarted)    => state.settling(event.isWinner)
    case (state: Settling, _: BetSettled)            => state.settled()
    case (state: Settling, event: BetSettlingFailed) => state.settlingFailed(event.reason)
    case (otherState, otherEvent) =>
      throw new IllegalStateException(s"unexpected event [$otherEvent] in state [$otherState]") (4)
  }
}

```

1. Again, an `EventHandler` type simplifies what we're actually building here.
2. Again, `State` is paired in the matcher (this time with the `Event`).
3. The logic for the changing of state is encapsulated within the state object. __We don't handle the logic in the `Actor`, but in the `State`.__
4. Again, we have a catch-all for fall-through events. In this case we return an `IllegalStateException`

### State

State objects are defined in an ADT structure - a __`sealed trait`__ defines the type that will be used in the `Entity` and we extend __`case classes`__ from this trait which define:

* The current in-memory data for the `Entity`
* The logic for moving from one state to another.

The `State` objects are defined in a separate file named `<entity name>State`

From `phoenix.bets.BetState`:

```sbt
sealed trait BetState extends CirceAkkaSerializable (1))

...

final case class Open(betId: BetId, betData: BetData, reservationId: ReservationId) extends BetState with HasBetData { (2)
  def cancel(reason: String): BetState = (3)
    Cancelled(betId, betData, reason)

  def settling(isWinner: Boolean): BetState =
    Settling(betId, betData, reservationId, isWinner)
}

```

1. The __`sealed trait`__ extends from `CirceAkkaSerializable` in order to allow Akka to serialise the event when reading/writing from/to the journal (and across the wire).
2. Each type of `State` the entity can be in is defined in a __`case class`__ with properties defining the current state.
3. Methods on the `State` classes define transformations to other states.
