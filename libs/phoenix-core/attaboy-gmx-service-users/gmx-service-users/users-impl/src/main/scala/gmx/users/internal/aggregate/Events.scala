package gmx.users.internal.aggregate

import java.time.ZonedDateTime

import com.lightbend.lagom.scaladsl.persistence.{ AggregateEvent, AggregateEventTag }
import gmx.users.internal.aggregate.Metadata.{ CustomerHeader, ProcessingHeader }

/**
 * This interface defines all the events that the UserAggregate supports.
 */
sealed trait UserEvent extends AggregateEvent[UserEvent] {
  def aggregateTag: AggregateEventTag[UserEvent] = UserEvent.Tag
}

object UserEvent {
  val Tag: AggregateEventTag[UserEvent] = AggregateEventTag[UserEvent]()
}

case class DepositLimitSet(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    limit: DepositLimit,
    currencyCode: String)
  extends UserEvent

case class TimeOutSet(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    timeout: TimeOut)
  extends UserEvent

case class CustomerLoggedIn(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    loggedIn: LoggedIn,
    timeZoneOffset: Int)
  extends UserEvent

case class CustomerLoggedOut(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    loggedOut: LoggedOut)
  extends UserEvent

case class FundsDeposited(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    deposit: Deposit,
    currencyCode: String)
  extends UserEvent

case class FundsWithdrawn(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    amount: BigDecimal,
    withdrawnAt: ZonedDateTime)
  extends UserEvent

case class BonusRequested(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    requestedAt: ZonedDateTime)
  extends UserEvent

case class SportsBetPlaced(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    bet: SportsBet)
  extends UserEvent

case class CasinoBetPlaced(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    bet: CasinoBet)
  extends UserEvent

case class BetSettled(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    result: BetResult)
  extends UserEvent

case class SelfAssessmentCompleted(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    completedAt: ZonedDateTime)
  extends UserEvent
