package gmx.users.internal.aggregate

import java.time.ZonedDateTime

import akka.actor.typed.ActorRef
import gmx.users.internal.aggregate.Metadata.{ CustomerHeader, ProcessingHeader }

/**
 * This is a marker trait for commands.
 * We will serialize them using Akka's Jackson support that is able to deal with the replyTo field.
 * (see application.conf)
 */
trait UserCommandSerializable

/**
 * This interface defines all the commands that the UserAggregate supports.
 */
sealed trait UserCommand extends UserCommandSerializable

case class SetDepositLimit(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    limit: DepositLimit)
  extends UserCommand

case class SetTimeout(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    timeout: TimeOut)
  extends UserCommand

case class LogCustomerIn(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    loggedIn: LoggedIn)
  extends UserCommand

case class LogCustomerOut(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    loggedOut: LoggedOut)
  extends UserCommand

case class DepositFunds(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    deposit: Deposit)
  extends UserCommand

case class WithdrawFunds(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    amount: BigDecimal,
    withdrawnAt: ZonedDateTime)
  extends UserCommand

case class RequestBonus(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    requestedAt: ZonedDateTime)
  extends UserCommand

case class PlaceSportsBet(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    bet: SportsBet)
  extends UserCommand

case class PlaceCasinoBet(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    bet: CasinoBet)
  extends UserCommand

case class SettleBet(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    result: BetResult)
  extends UserCommand

case class CompleteSelfAssessment(
    processingHeader: ProcessingHeader,
    customerHeader: CustomerHeader,
    completedAt: ZonedDateTime)
  extends UserCommand

case class CommandEnvelope(
    command: UserCommand,
    replyTo: ActorRef[Confirmation])
  extends UserCommandSerializable
