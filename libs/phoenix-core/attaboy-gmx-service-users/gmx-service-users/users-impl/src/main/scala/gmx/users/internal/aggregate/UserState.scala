package gmx.users.internal.aggregate

import java.time.ZonedDateTime

import akka.cluster.sharding.typed.scaladsl.EntityTypeKey
import gmx.dataapi.internal.customer.{ DepositLimitScopeEnum, DepositPaymentMethodEnum, DepositStatusEnum }

/**
 * The current state of the Aggregate.
 */
//TODO userID+brandID should identify entity; remove brand from state objects | https://flipsports.atlassian.net/browse/GMV3-259
case class UserState(
    customerId: String,
    countryCode: String,
    currencyCode: String, //TODO implement other currencies | https://flipsports.atlassian.net/browse/GMV3-342
    depositLimits: Map[String, DepositLimit],
    timeOut: Option[TimeOut], //TODO clear timeout object on endTime | https://flipsports.atlassian.net/browse/GMV3-343
    session: CustomerSession, //TODO close user session | https://flipsports.atlassian.net/browse/GMV3-348
    transactions: Seq[Deposit], //TODO keep user balance | https://flipsports.atlassian.net/browse/GMV3-344
    bonusRequest: Option[BonusRequest],
    selfAssessment: Option[SelfAssessment],
    sportsBets: Set[SportsBet],
    casinoBets: Set[CasinoBet]) {

  def isDepositLimitChange(value: DepositLimit): Boolean =
    depositLimits.get(value.scope.toString).forall(_.businessEqual(value))

  def withDepositLimit(value: DepositLimit): UserState =
    this.copy(depositLimits = depositLimits + (value.scope.toString -> value))

  def isTimeoutChange(value: TimeOut): Boolean =
    timeOut.forall(_.businessEqual(value))

  def withTimeout(value: TimeOut): UserState =
    this.copy(timeOut = Some(value))

  def isDepositChange(value: Deposit): Boolean =
    !transactions.exists(_.businessEqual(value))

  def withDeposit(value: Deposit): UserState =
    this.copy(transactions = transactions :+ value)

}

object UserState {

  /**
   * The [[EventSourcedBehavior]] instances (aka Aggregates) run on sharded actors inside the Akka Cluster.
   * When sharding actors and distributing them across the cluster, each aggregate is
   * namespaced under a typekey that specifies a name and also the type of the commands
   * that sharded actor can receive.
   */
  val typeKey: EntityTypeKey[CommandEnvelope] =
    EntityTypeKey[CommandEnvelope]("UserAggregate")

  /**
   * The initial state. This is used if there is no snapshotted state to be found.
   */
  def initial(customerId: String): UserState = //FIXME load initial state on Login | https://flipsports.atlassian.net/browse/GMV3-345
    UserState(
      customerId,
      "GB",
      "GBP",
      Map(),
      None,
      LoggedOut(ZonedDateTime.now(), "", ""),
      Seq(),
      None,
      None,
      Set.empty,
      Set.empty
    )

}

case class SetBy(
    userId: String,
    setAt: ZonedDateTime)

case class DepositLimit(
    scope: DepositLimitScopeEnum, //TODO do not use data-api in internal model | https://flipsports.atlassian.net/browse/GMV3-346
    limit: BigDecimal,
    setBy: SetBy,
    brandId: String) {

  def businessEqual(other: DepositLimit): Boolean =
    limit.compareTo(other.limit) != 0
}

case class TimeOut(
    startTime: ZonedDateTime,
    endTime: ZonedDateTime,
    setBy: SetBy,
    brandId: String) {

  def businessEqual(other: TimeOut): Boolean =
    startTime.compareTo(other.startTime) != 0 || endTime.compareTo(other.endTime) != 0
}

sealed trait CustomerSession

case class LoggedIn(
    loggedInAt: ZonedDateTime,
    deviceType: String,
    brandId: String)
  extends CustomerSession

case class LoggedOut(
    loggedOutAt: ZonedDateTime,
    deviceType: String,
    brandId: String)
  extends CustomerSession

case class Deposit(
    transactionId: String,
    depositedAt: ZonedDateTime,
    amount: BigDecimal,
    paymentMethod: DepositPaymentMethodEnum,
    status: DepositStatusEnum,
    paymentAccountIdentifier: String,
    paymentDetails: String,
    gatewayCorrelationId: String,
    brandId: String) {

  def businessEqual(other: Deposit): Boolean =
    transactionId.equals(other.transactionId)
}

case class Withdrawal(
    amount: BigDecimal,
    withdrawnAt: ZonedDateTime,
    brandId: String)

case class BonusRequest(
    requestedAt: ZonedDateTime,
    brandId: String)

case class SelfAssessment(
    completedAt: ZonedDateTime,
    brandId: String)

case class SportsBet(
    betId: String,
    sport: String,
    event: String,
    market: String,
    selection: String,
    liability: BigDecimal,
    placedAt: ZonedDateTime,
    brandId: String)

case class CasinoBet(
    betId: String,
    gameId: String,
    liability: BigDecimal,
    placedAt: ZonedDateTime,
    brandId: String)

case class BetResult(
    betId: String,
    settledAt: ZonedDateTime,
    win: Boolean,
    value: BigDecimal)
