package gmx.users.internal.logic

import gmx.users.internal.aggregate._

object EventHandlers {

  def applyEvent(
      evt: UserEvent,
      state: UserState
    ): UserState =
    evt match {
      case e: DepositLimitSet         => updateState(e, state)
      case e: TimeOutSet              => updateState(e, state)
      case e: CustomerLoggedIn        => updateState(e, state)
      case e: CustomerLoggedOut       => updateState(e, state)
      case e: FundsDeposited          => updateState(e, state)
      case e: FundsWithdrawn          => updateState(e, state)
      case e: BonusRequested          => updateState(e, state)
      case e: SportsBetPlaced         => updateState(e, state)
      case e: CasinoBetPlaced         => updateState(e, state)
      case e: BetSettled              => updateState(e, state)
      case e: SelfAssessmentCompleted => updateState(e, state)
    }

  def updateState(
      evt: DepositLimitSet,
      state: UserState
    ): UserState =
    state.withDepositLimit(evt.limit)

  def updateState(
      evt: TimeOutSet,
      state: UserState
    ): UserState =
    state.withTimeout(evt.timeout)

  def updateState(
      evt: CustomerLoggedIn,
      state: UserState
    ): UserState =
    state.copy(session = evt.loggedIn)

  def updateState(
      evt: CustomerLoggedOut,
      state: UserState
    ): UserState =
    state.copy(session = evt.loggedOut)

  def updateState(
      evt: FundsDeposited,
      state: UserState
    ): UserState =
    state.withDeposit(evt.deposit)

  def updateState(
      evt: FundsWithdrawn,
      state: UserState
    ): UserState =
    state.copy()

  def updateState(
      evt: BonusRequested,
      state: UserState
    ): UserState =
    state.copy(bonusRequest = Some(BonusRequest(evt.requestedAt, evt.customerHeader.brandId)))

  def updateState(
      evt: SportsBetPlaced,
      state: UserState
    ): UserState =
    state.copy(sportsBets = state.sportsBets + evt.bet)

  def updateState(
      evt: CasinoBetPlaced,
      state: UserState
    ): UserState =
    state.copy(casinoBets = state.casinoBets + evt.bet)

  def updateState(
      evt: BetSettled,
      state: UserState
    ): UserState =
    state.copy()

  def updateState(
      evt: SelfAssessmentCompleted,
      state: UserState
    ): UserState =
    state.copy(selfAssessment = Some(SelfAssessment(evt.completedAt, evt.customerHeader.brandId)))

}
