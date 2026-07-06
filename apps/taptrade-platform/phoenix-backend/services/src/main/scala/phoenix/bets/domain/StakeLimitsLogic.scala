package phoenix.bets.domain

import java.time.OffsetDateTime

import cats.kernel.Monoid

import phoenix.bets.BetProtocol.BetRequest
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.core.Clock
import phoenix.core.TimeUtils._
import phoenix.core.currency.MoneyAmount
import phoenix.punters.domain.CurrentAndNextLimits
import phoenix.punters.domain.Limit
import phoenix.punters.domain.LimitPeriod
import phoenix.punters.domain.LimitPeriodType
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week
import phoenix.punters.domain.StakeLimitAmount
import phoenix.wallets.domain.EnclosingLimitPeriod

object StakeLimitsLogic {

  /**
   * We don't need more data than the current month OR the exception in which the first day of the current week
   * is outside of the actual month (eg: now = 1st of September, being a Wednesday. Monday would be outside of the month).
   */
  def calculateDateOfOldestApplicablePunterStake(now: OffsetDateTime): OffsetDateTime = {
    List(now.atBeginningOfMonth(), now.atBeginningOfWeek()).min
  }

  def haveLimitsBeenBreached(
      limits: CurrentAndNextLimits[StakeLimitAmount],
      history: List[PunterStake],
      newBets: List[BetRequest],
      now: OffsetDateTime,
      clock: Clock): Boolean = {

    val periodStakes = calculatePeriodStakes(history, now, clock)

    val totalAmountStake = Monoid.combineAll(newBets.map(betRequest => MoneyAmount(betRequest.stake.value.amount)))
    !canBet(limits.daily.current.limit, periodStakes.daily.value + totalAmountStake) ||
    !canBet(limits.weekly.current.limit, periodStakes.weekly.value + totalAmountStake) ||
    !canBet(limits.monthly.current.limit, periodStakes.monthly.value + totalAmountStake)
  }

  private def calculatePeriodStakes(history: List[PunterStake], now: OffsetDateTime, clock: Clock): PeriodStakes = {

    def stakesDuring[LT <: LimitPeriodType](
        history: List[PunterStake],
        enclosingPeriod: EnclosingLimitPeriod[LT]): PeriodStake[LT] = {
      val punterStakesDuringPeriod =
        history.filter(punterStake => enclosingPeriod.happensDuringPeriod(punterStake.placedAt))
      val calculatedStakeAmount = punterStakesDuringPeriod.foldLeft(MoneyAmount.zero.get) {
        case (accumulated, punterStake) =>
          val stakeAmount = MoneyAmount(punterStake.stake.value.amount)
          val outcomeBasedStakeAmount = punterStake.betStatus match {
            case BetStatus.Open                                            => stakeAmount
            case BetStatus.Settled | BetStatus.Resettled                   => stakeAmount - betReturn(punterStake)
            case BetStatus.Voided | BetStatus.Pushed | BetStatus.Cancelled => MoneyAmount.zero.get
          }
          accumulated + outcomeBasedStakeAmount
      }

      PeriodStake(enclosingPeriod.period, calculatedStakeAmount)
    }

    PeriodStakes(
      daily = stakesDuring(history, EnclosingLimitPeriod(LimitPeriod.enclosingDay(now, clock), now)),
      weekly = stakesDuring(history, EnclosingLimitPeriod(LimitPeriod.enclosingWeek(now, clock), now)),
      monthly = stakesDuring(history, EnclosingLimitPeriod(LimitPeriod.enclosingMonth(now, clock), now)))
  }

  private def betReturn(punterStake: PunterStake): MoneyAmount =
    punterStake.unsafeGetOutcome() match {
      case BetOutcome.Won  => punterStake.potentialReturn()
      case BetOutcome.Lost => MoneyAmount.zero.get
    }

  private def canBet(limit: Limit[StakeLimitAmount, _], amountIfOperationWouldBeApplied: MoneyAmount): Boolean =
    limit.value match {
      case Some(definedLimit) => amountIfOperationWouldBeApplied.amount <= definedLimit.value.amount
      case None               => true
    }
}

private final case class PeriodStakes(
    daily: PeriodStake[Day.type],
    weekly: PeriodStake[Week.type],
    monthly: PeriodStake[Month.type])

private final case class PeriodStake[+LT <: LimitPeriodType](period: LimitPeriod[LT], value: MoneyAmount)
