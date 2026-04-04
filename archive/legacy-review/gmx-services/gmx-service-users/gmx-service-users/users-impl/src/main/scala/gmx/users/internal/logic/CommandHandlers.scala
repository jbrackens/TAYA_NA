package gmx.users.internal.logic

import akka.actor.typed.ActorRef
import akka.persistence.typed.scaladsl.{ Effect, ReplyEffect }
import gmx.common.internal.scala.core.time.TimeUtils.calculateOffset
import gmx.users.internal.aggregate._

object CommandHandlers {

  def applyCommand(
      envelope: CommandEnvelope,
      state: UserState
    ): ReplyEffect[UserEvent, UserState] =
    envelope.command match {
      case x: SetDepositLimit        => handleCommand(x, state, envelope.replyTo)
      case x: SetTimeout             => handleCommand(x, state, envelope.replyTo)
      case x: LogCustomerIn          => handleCommand(x, state, envelope.replyTo)
      case x: LogCustomerOut         => handleCommand(x, state, envelope.replyTo)
      case x: DepositFunds           => handleCommand(x, state, envelope.replyTo)
      case x: WithdrawFunds          => handleCommand(x, state, envelope.replyTo)
      case x: RequestBonus           => handleCommand(x, state, envelope.replyTo)
      case x: PlaceSportsBet         => handleCommand(x, state, envelope.replyTo)
      case x: PlaceCasinoBet         => handleCommand(x, state, envelope.replyTo)
      case x: SettleBet              => handleCommand(x, state, envelope.replyTo)
      case x: CompleteSelfAssessment => handleCommand(x, state, envelope.replyTo)
    }

  def handleCommand(
      cmd: SetDepositLimit,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] = {
    val change = state.isDepositLimitChange(cmd.limit)
    if (change)
      persistAndAccepted(DepositLimitSet(cmd.processingHeader, cmd.customerHeader, cmd.limit, state.currencyCode), replyTo)
    else
      unhandledAndRejected("Deposit limit not changed", replyTo)
  }

  def handleCommand(
      cmd: SetTimeout,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] = {
    val change = state.isTimeoutChange(cmd.timeout)
    if (change)
      persistAndAccepted(TimeOutSet(cmd.processingHeader, cmd.customerHeader, cmd.timeout), replyTo)
    else
      unhandledAndRejected("Timeout not not changed", replyTo)
  }

  def handleCommand(
      cmd: LogCustomerIn,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] =
    persistAndAccepted(
      CustomerLoggedIn(cmd.processingHeader, cmd.customerHeader, cmd.loggedIn, calculateOffset(cmd.loggedIn.loggedInAt, state.countryCode)),
      replyTo
    )

  def handleCommand(
      cmd: LogCustomerOut,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] =
    persistAndAccepted(CustomerLoggedOut(cmd.processingHeader, cmd.customerHeader, cmd.loggedOut), replyTo)

  def handleCommand(
      cmd: DepositFunds,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] = {
    val change = state.isDepositChange(cmd.deposit)
    if (change)
      persistAndAccepted(FundsDeposited(cmd.processingHeader, cmd.customerHeader, cmd.deposit, state.currencyCode), replyTo)
    else
      unhandledAndRejected("Deposit not changed", replyTo)

  }

  def handleCommand(
      cmd: WithdrawFunds,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] =
    persistAndAccepted(FundsWithdrawn(cmd.processingHeader, cmd.customerHeader, cmd.amount, cmd.withdrawnAt), replyTo)

  def handleCommand(
      cmd: RequestBonus,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] =
    persistAndAccepted(BonusRequested(cmd.processingHeader, cmd.customerHeader, cmd.requestedAt), replyTo)

  def handleCommand(
      cmd: PlaceSportsBet,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] =
    persistAndAccepted(SportsBetPlaced(cmd.processingHeader, cmd.customerHeader, cmd.bet), replyTo)

  def handleCommand(
      cmd: PlaceCasinoBet,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] =
    persistAndAccepted(CasinoBetPlaced(cmd.processingHeader, cmd.customerHeader, cmd.bet), replyTo)

  def handleCommand(
      cmd: SettleBet,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] =
    persistAndAccepted(BetSettled(cmd.processingHeader, cmd.customerHeader, cmd.result), replyTo)

  def handleCommand(
      cmd: CompleteSelfAssessment,
      state: UserState,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] =
    persistAndAccepted(SelfAssessmentCompleted(cmd.processingHeader, cmd.customerHeader, cmd.completedAt), replyTo)

  private def persistAndAccepted(
      event: UserEvent,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] =
    Effect
      .persist(event)
      .thenReply(replyTo)(_ => Accepted)

  private def unhandledAndRejected(
      reason: String,
      replyTo: ActorRef[Confirmation]
    ): ReplyEffect[UserEvent, UserState] =
    Effect.unhandled
      .thenReply(replyTo)(_ => Rejected(reason))
}
