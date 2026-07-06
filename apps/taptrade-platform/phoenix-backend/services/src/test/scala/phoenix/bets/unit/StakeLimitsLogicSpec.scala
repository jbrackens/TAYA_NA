package phoenix.bets.unit

import java.time.OffsetDateTime

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.bets.BetProtocol
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.Stake
import phoenix.bets.domain.PunterStake
import phoenix.bets.domain.StakeLimitsLogic
import phoenix.bets.domain.StakeLimitsLogic.calculateDateOfOldestApplicablePunterStake
import phoenix.bets.support.BetDataGenerator.generateBetRequest
import phoenix.bets.support.BetDataGenerator.generatePunterStake
import phoenix.core.Clock
import phoenix.core.TimeUtils.TimeUtilsOffsetDateTimeOps
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.core.odds.Odds
import phoenix.punters.PunterDataGenerator.Api
import phoenix.punters.domain.CurrentAndNextLimit
import phoenix.punters.domain.CurrentAndNextLimits
import phoenix.punters.domain.EffectiveLimit
import phoenix.punters.domain.Limit
import phoenix.punters.domain.StakeLimitAmount
import phoenix.support.DataGenerator
import phoenix.support.DataGenerator.generateOdds
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.TimeDataGenerator
import phoenix.support.UnsafeValueObjectExtensions.UnsafeStakeLimitAmountOps

final class StakeLimitsLogicSpec extends AnyWordSpec with Matchers {

  private val clock = Clock.utcClock
  private val now = DataGenerator.randomOffsetDateTime()
  private val inThePast = now.minusYears(10)
  private val punterId = Api.generatePunterId()

  "calculateDateOfOldestApplicablePunterStake" should {
    def at(year: Int, month: Int, day: Int): OffsetDateTime =
      randomOffsetDateTime().withYear(year).withMonth(month).withDayOfMonth(day)

    "return the first day of the month when it is previous to the first day of the month" in {
      val examples = List(
        at(2021, 4, 5),
        at(2021, 4, 11),
        at(2021, 4, 12),
        at(2021, 4, 19),
        at(2021, 4, 25),
        at(2021, 4, 26),
        at(2021, 4, 30),
        at(2021, 8, 2),
        at(2021, 8, 16),
        at(2021, 8, 31))

      examples.foreach { givenTime =>
        val expectedTime = givenTime.atBeginningOfMonth()
        calculateDateOfOldestApplicablePunterStake(givenTime) shouldBe expectedTime
      }
    }

    "return the first day of the week when it is previous to the first day of the week" in {
      val examples =
        List(
          at(2021, 4, 1),
          at(2021, 4, 2),
          at(2021, 4, 3),
          at(2021, 4, 4),
          at(2021, 6, 1),
          at(2021, 6, 6),
          at(2021, 8, 1))

      examples.foreach { givenTime =>
        val expectedTime = givenTime.atBeginningOfWeek()
        calculateDateOfOldestApplicablePunterStake(givenTime) shouldBe expectedTime
      }
    }
  }

  "haveLimitsBeenBreached" should {
    "return FALSE when no limits exist" in {
      val noLimits = limits()
      val punterStakes = generatePunterStakes()
      val betRequests = generateBetRequests()

      StakeLimitsLogic.haveLimitsBeenBreached(noLimits, punterStakes, betRequests, now, clock) shouldBe false
    }

    "when only daily limits are set" should {
      "return TRUE when the daily limit would be breached by little even if the user had no bets" in {
        val limitedDaily = limits(daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes = List.empty
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(101))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe true
      }

      "return FALSE when the daily limit would be reached exactly even if the user had no bets" in {
        val limitedDaily = limits(daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes = List.empty
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(100))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe false
      }

      "return FALSE when only bets outside of the current day are part of history" in {
        val limitedDaily = limits(daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val exactlyBeforeToday = now.atBeginningOfDay().minusSeconds(1)
        val punterStakes =
          List(openedStake(Stake.unsafe(DefaultCurrencyMoney(1000)), when = exactlyBeforeToday))
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(10))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe false
      }

      "return TRUE when the daily limit would be breached because the user has an OPENED bet the same day" in {
        val limitedDaily = limits(daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes = List(openedStake(Stake.unsafe(DefaultCurrencyMoney(99)), today()))
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(2))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe true
      }

      "return FALSE when the daily limit is NOT breached because VOIDED bets are ignored for the limit" in {
        val limitedDaily = limits(daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes = List(voidedStake(Stake.unsafe(DefaultCurrencyMoney(99)), today()))
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(2))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe false
      }

      "return FALSE when the daily limit is NOT breached because CANCELLED bets are ignored for the limit" in {
        val limitedDaily = limits(daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes = List(cancelledStake(Stake.unsafe(DefaultCurrencyMoney(99)), today()))
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(2))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe false
      }

      "return TRUE when the daily limit is breached because SETTLED LOST bets are counted in favour of the limit" in {
        val limitedDaily = limits(daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes =
          List(settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(99)), today(), odds = Odds(1.5)))
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(2))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe true
      }

      "return FALSE when the daily limit isn't breached because SETTLED WON bets are counted against the limit" in {
        val limitedDaily = limits(daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes =
          List(settledStake(BetOutcome.Won, Stake.unsafe(DefaultCurrencyMoney(100)), today(), odds = Odds(1.5)))
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(150))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe false
      }

      "return TRUE when the daily limit is breached even when SETTLED WON bets are counted against the limit" in {
        val limitedDaily = limits(daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes =
          List(settledStake(BetOutcome.Won, Stake.unsafe(DefaultCurrencyMoney(100)), today(), odds = Odds(1.5)))
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(151))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe true
      }

      "return TRUE for daily limit being breached with a combination of won and lost bets" in {
        val limitedDaily = limits(daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes = List(
            settledStake(BetOutcome.Won, Stake.unsafe(DefaultCurrencyMoney(10)), today(), odds = Odds(1.5)),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(15)), today()),
            settledStake(BetOutcome.Won, Stake.unsafe(DefaultCurrencyMoney(120)), today(), odds = Odds(1.5)),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(46)), today()),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(20)), today()),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(30)), today()),
            openedStake(Stake.unsafe(DefaultCurrencyMoney(30)), today()),
            openedStake(Stake.unsafe(DefaultCurrencyMoney(15)), today())) ++
          generatePunterStakes(placedBefore = now.atBeginningOfDay())

        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(10))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe true
      }
    }

    "when only weekly limits are set" should {
      "return TRUE for weekly limit being breached with a combination of won and lost bets" in {
        val limitedDaily = limits(weekly = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes = List(
            settledStake(BetOutcome.Won, Stake.unsafe(DefaultCurrencyMoney(10)), thisWeek(), odds = Odds(1.5)),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(15)), thisWeek()),
            settledStake(BetOutcome.Won, Stake.unsafe(DefaultCurrencyMoney(120)), thisWeek(), odds = Odds(1.5)),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(46)), thisWeek()),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(20)), thisWeek()),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(30)), thisWeek()),
            openedStake(Stake.unsafe(DefaultCurrencyMoney(30)), thisWeek()),
            openedStake(Stake.unsafe(DefaultCurrencyMoney(15)), thisWeek())) ++
          generatePunterStakes(placedBefore = now.atBeginningOfWeek())
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(10))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe true
      }
    }

    "when only monthly limits are set" should {
      "return TRUE for monthly limit being breached with a combination of won and lost bets" in {
        val limitedDaily = limits(monthly = Some(StakeLimitAmount.unsafe(MoneyAmount(100))))
        val punterStakes = List(
            settledStake(BetOutcome.Won, Stake.unsafe(DefaultCurrencyMoney(10)), thisMonth(), odds = Odds(1.5)),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(15)), thisMonth()),
            settledStake(BetOutcome.Won, Stake.unsafe(DefaultCurrencyMoney(120)), thisMonth(), odds = Odds(1.5)),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(46)), thisMonth()),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(20)), thisMonth()),
            settledStake(BetOutcome.Lost, Stake.unsafe(DefaultCurrencyMoney(30)), thisMonth()),
            openedStake(Stake.unsafe(DefaultCurrencyMoney(30)), thisMonth()),
            openedStake(Stake.unsafe(DefaultCurrencyMoney(15)), thisMonth())) ++
          generatePunterStakes(placedBefore = now.atBeginningOfMonth())
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(10))))

        StakeLimitsLogic.haveLimitsBeenBreached(limitedDaily, punterStakes, betRequests, now, clock) shouldBe true
      }
    }

    "when all limits are set" should {
      val allLimitsSet = limits(
        daily = Some(StakeLimitAmount.unsafe(MoneyAmount(100))),
        weekly = Some(StakeLimitAmount.unsafe(MoneyAmount(500))),
        monthly = Some(StakeLimitAmount.unsafe(MoneyAmount(1200))))

      "return FALSE for all limits when all bets are outside of any limit periods" in {
        val exactlyBeforeAnyLimit = StakeLimitsLogic.calculateDateOfOldestApplicablePunterStake(now).minusSeconds(1)
        val punterStakes =
          List(openedStake(Stake.unsafe(DefaultCurrencyMoney(10000)), when = exactlyBeforeAnyLimit))
        val betRequests = List(generateBetRequest().copy(stake = Stake.unsafe(DefaultCurrencyMoney(10))))

        StakeLimitsLogic.haveLimitsBeenBreached(allLimitsSet, punterStakes, betRequests, now, clock) shouldBe false
      }
    }
  }

  private def today(): OffsetDateTime = TimeDataGenerator.atSameDayAndBeforeAs(now)
  private def thisWeek(): OffsetDateTime = TimeDataGenerator.atSameWeekAndBeforeAs(now)
  private def thisMonth(): OffsetDateTime = TimeDataGenerator.atSameMonthAndBeforeAs(now)

  private def limits(
      daily: Option[StakeLimitAmount] = None,
      weekly: Option[StakeLimitAmount] = None,
      monthly: Option[StakeLimitAmount] = None): CurrentAndNextLimits[StakeLimitAmount] =
    CurrentAndNextLimits(
      CurrentAndNextLimit(current = EffectiveLimit(Limit.Daily(daily), since = inThePast), next = None),
      CurrentAndNextLimit(current = EffectiveLimit(Limit.Weekly(weekly), since = inThePast), next = None),
      CurrentAndNextLimit(current = EffectiveLimit(Limit.Monthly(monthly), since = inThePast), next = None))

  private def generateBetRequests(amount: Int = 10): List[BetProtocol.BetRequest] =
    List.fill(amount)(generateBetRequest())

  private def generatePunterStakes(amount: Int = 10, placedBefore: OffsetDateTime = now): List[PunterStake] =
    List.fill(amount)(
      generatePunterStake().copy(punterId = punterId, placedAt = TimeDataGenerator.before(placedBefore)))

  private def openedStake(stake: Stake, when: OffsetDateTime): PunterStake =
    generatePunterStake(betStatus = BetStatus.Open).copy(stake = stake, placedAt = when)

  private def settledStake(
      outcome: BetOutcome,
      stake: Stake,
      when: OffsetDateTime,
      odds: Odds = generateOdds()): PunterStake =
    generatePunterStake(betStatus = BetStatus.Settled)
      .copy(stake = stake, odds = odds, outcome = Some(outcome), placedAt = when)

  private def voidedStake(stake: Stake, when: OffsetDateTime): PunterStake =
    generatePunterStake(betStatus = BetStatus.Voided).copy(stake = stake, placedAt = when)

  private def cancelledStake(stake: Stake, when: OffsetDateTime): PunterStake =
    generatePunterStake(betStatus = BetStatus.Cancelled).copy(stake = stake, placedAt = when)
}
