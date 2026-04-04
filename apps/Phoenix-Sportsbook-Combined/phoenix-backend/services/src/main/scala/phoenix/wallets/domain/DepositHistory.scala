package phoenix.wallets.domain

import java.time.OffsetDateTime

import scala.math.Ordering.Implicits.infixOrderingOps

import cats.kernel.Monoid

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.punters.domain.LimitPeriod
import phoenix.punters.domain.LimitPeriodType
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week

final case class Deposit(amount: MoneyAmount, depositedAt: OffsetDateTime)

final case class Deposits(
    daily: PeriodDeposits[Day.type],
    weekly: PeriodDeposits[Week.type],
    monthly: PeriodDeposits[Month.type])

final case class PeriodDeposits[+LT <: LimitPeriodType](period: LimitPeriod[LT], value: MoneyAmount)

final case class EnclosingLimitPeriod[+LT <: LimitPeriodType](period: LimitPeriod[LT], periodTime: OffsetDateTime) {

  def periodStart: OffsetDateTime = period.startInclusive
  def periodEnd: OffsetDateTime = period.endExclusive

  def happensDuringPeriod(reference: OffsetDateTime): Boolean =
    reference >= periodStart && reference < periodEnd
}

final case class DepositHistory(deposits: List[Deposit], totalDeposited: MoneyAmount) {

  def withDeposit(deposit: Deposit): DepositHistory =
    copy(deposits = deposits :+ deposit, totalDeposited = totalDeposited + deposit.amount)

  def calculateDeposits(asOf: OffsetDateTime, clock: Clock): Deposits =
    Deposits(
      daily = depositsDuring(EnclosingLimitPeriod(LimitPeriod.enclosingDay(asOf, clock), asOf)),
      weekly = depositsDuring(EnclosingLimitPeriod(LimitPeriod.enclosingWeek(asOf, clock), asOf)),
      monthly = depositsDuring(EnclosingLimitPeriod(LimitPeriod.enclosingMonth(asOf, clock), asOf)))

  private def depositsDuring[LT <: LimitPeriodType](enclosingPeriod: EnclosingLimitPeriod[LT]): PeriodDeposits[LT] =
    PeriodDeposits(
      enclosingPeriod.period,
      Monoid.combineAll(deposits.filter(depositedDuringPeriod(enclosingPeriod, _)).map(_.amount)))

  private def depositedDuringPeriod(period: EnclosingLimitPeriod[_], deposit: Deposit): Boolean =
    deposit.depositedAt >= period.periodStart && deposit.depositedAt < period.periodEnd
}

object DepositHistory {
  val empty: DepositHistory = DepositHistory(deposits = List.empty, totalDeposited = MoneyAmount.zero.get)
}
