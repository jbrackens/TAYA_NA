package phoenix.punters.domain

import java.time.Month.APRIL
import java.time.Month.FEBRUARY
import java.time.Month.JANUARY
import java.time.OffsetDateTime

import scala.concurrent.duration.DurationInt

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.TimeUtils._
import phoenix.core.deployment.DeploymentClock
import phoenix.punters.PunterDataGenerator.Api.generateSessionId
import phoenix.punters.PunterState
import phoenix.punters.domain.LimitPeriod.enclosingDay
import phoenix.punters.domain.LimitPeriod.enclosingMonth
import phoenix.punters.domain.LimitPeriod.enclosingWeek
import phoenix.punters.domain.SessionDuration._
import phoenix.punters.domain.SessionLimitation.Limited
import phoenix.punters.domain.SessionLimitation.Unlimited
import phoenix.shared.support.TimeSupport.deploymentConfig
import phoenix.shared.support.TimeSupport.deploymentTime

final class PunterSessionsSpec extends AnyWordSpecLike with Matchers {

  val clock: Clock = DeploymentClock.fromConfig(deploymentConfig)
  def dateInTheFuture = clock.currentOffsetDateTime().plusMonths(10)

  "Punter session should" should {
    "return current session limits" in {
      // given
      val sessionLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(3.hours))),
        Limit.Weekly(Some(SessionDuration(10.hours))),
        Limit.Monthly(Some(SessionDuration(30.hours))))
      val sessions = PunterSessions.withLimits(sessionLimits)

      // when
      val anyDate = deploymentTime(2018, FEBRUARY, 2, 19, 15)
      val limits = sessions.limits(asOf = anyDate, clock)

      // then
      limits.daily.current.limit shouldBe sessionLimits.daily
      limits.daily.next shouldBe None

      limits.weekly.current.limit shouldBe sessionLimits.weekly
      limits.weekly.next shouldBe None

      limits.monthly.current.limit shouldBe sessionLimits.monthly
      limits.monthly.next shouldBe None
    }

    "decrease session limits immediately" in {
      // given
      val sessionLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(3.hours))),
        Limit.Weekly(Some(SessionDuration(10.hours))),
        Limit.Monthly(Some(SessionDuration(30.hours))))

      var sessions = PunterSessions.withLimits(sessionLimits)

      // when
      val wednesday = deploymentTime(2021, FEBRUARY, 24, 21, 37)
      val decreasedWeeklyLimit = Limit.Weekly(Some(SessionDuration(5.hours)))
      val limitChange =
        sessions.estimateLimitsChange(sessionLimits.copy(weekly = decreasedWeeklyLimit), asOf = wednesday, clock)
      sessions = sessions.changeLimits(limitChange)

      // then
      val previousWeek = wednesday.minusDays(3)
      val lastWeekLimits = sessions.limits(asOf = previousWeek, clock)
      lastWeekLimits.weekly.current.limit shouldBe sessionLimits.weekly
      lastWeekLimits.weekly.next.map(_.limit) shouldBe Some(decreasedWeeklyLimit)

      // and
      val thisWeek = wednesday.plusDays(2)
      val thisWeekLimits = sessions.limits(asOf = thisWeek, clock)
      thisWeekLimits.weekly.current.limit shouldBe decreasedWeeklyLimit
      thisWeekLimits.weekly.next shouldBe None

      // and
      val nextWeek = wednesday.plusDays(5)
      val nextWeekLimits = sessions.limits(asOf = nextWeek, clock)
      nextWeekLimits.weekly.current.limit shouldBe decreasedWeeklyLimit
      nextWeekLimits.weekly.next shouldBe None
    }

    "decrease session limits immediately when starting with no limits" in {
      // given
      val sessionLimits: Limits[SessionDuration] =
        Limits.unsafe(Limit.Daily(None), Limit.Weekly(None), Limit.Monthly(None))

      var sessions = PunterSessions.withLimits(sessionLimits)

      // when
      val limitChangeDate = deploymentTime(2021, FEBRUARY, 24, 21, 37)
      val decreasedLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(3.hours))),
        Limit.Weekly(Some(SessionDuration(10.hours))),
        Limit.Monthly(Some(SessionDuration(30.hours))))
      val limitChange =
        sessions.estimateLimitsChange(decreasedLimits, asOf = limitChangeDate, clock)
      sessions = sessions.changeLimits(limitChange)

      // then
      val limits = sessions.limits(asOf = limitChangeDate, clock)
      limits.daily.current.limit shouldBe decreasedLimits.daily
      limits.daily.next shouldBe None

      // and
      limits.weekly.current.limit shouldBe decreasedLimits.weekly
      limits.weekly.next shouldBe None

      // and
      limits.monthly.current.limit shouldBe decreasedLimits.monthly
      limits.monthly.next shouldBe None
    }

    "increase limits only as of next limit period" in {
      // given
      val sessionLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(3.hours))),
        Limit.Weekly(Some(SessionDuration(10.hours))),
        Limit.Monthly(Some(SessionDuration(30.hours))))

      var sessions = PunterSessions.withLimits(sessionLimits)

      // when
      val february = deploymentTime(2021, FEBRUARY, 2, 21, 37)
      val increasedMonthlyLimit = Limit.Monthly(Some(SessionDuration(31.hours)))
      val limitChange =
        sessions.estimateLimitsChange(sessionLimits.copy(monthly = increasedMonthlyLimit), asOf = february, clock)
      sessions = sessions.changeLimits(limitChange)

      // then
      val previousMonth = february.minusMonths(1)
      val limitsPreviousMonth = sessions.limits(asOf = previousMonth, clock)
      limitsPreviousMonth.monthly.current.limit shouldBe sessionLimits.monthly
      limitsPreviousMonth.monthly.next shouldBe None

      // and
      val thisMonth = february.plusDays(7)
      val limitsThisMonth = sessions.limits(asOf = thisMonth, clock)
      limitsThisMonth.monthly.current.limit shouldBe sessionLimits.monthly
      limitsThisMonth.monthly.next.map(_.limit) shouldBe Some(increasedMonthlyLimit)

      // and
      val nextMonth = february.plusMonths(1)
      val limitsNextMonth = sessions.limits(asOf = nextMonth, clock)
      limitsNextMonth.monthly.current.limit shouldBe increasedMonthlyLimit
      limitsNextMonth.monthly.next shouldBe None
    }

    "no limits should take place as of next period" in {
      // given
      val initialLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(3.hours))),
        Limit.Weekly(Some(SessionDuration(10.hours))),
        Limit.Monthly(Some(SessionDuration(30.hours))))

      var sessions = PunterSessions.withLimits(initialLimits)

      // when
      val momentOfChange = deploymentTime(2021, APRIL, 8, 21, 37)
      val noLimits: Limits[SessionDuration] = Limits.unsafe(Limit.Daily(None), Limit.Weekly(None), Limit.Monthly(None))
      val limitChange = sessions.estimateLimitsChange(noLimits, asOf = momentOfChange, clock)
      sessions = sessions.changeLimits(limitChange)

      // then
      val limits = sessions.limits(asOf = momentOfChange, clock)
      limits.daily.current.limit shouldBe initialLimits.daily
      limits.daily.next.map(_.limit) shouldBe Some(noLimits.daily)

      // and
      limits.weekly.current.limit shouldBe initialLimits.weekly
      limits.weekly.next.map(_.limit) shouldBe Some(noLimits.weekly)

      // and
      limits.monthly.current.limit shouldBe initialLimits.monthly
      limits.monthly.next.map(_.limit) shouldBe Some(noLimits.monthly)
    }

    "correctly calculate session stats in case there's no way to reach session limits in current period" in {
      // given
      val sessionLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(3.hours))),
        Limit.Weekly(Some(SessionDuration(10.hours))),
        Limit.Monthly(Some(SessionDuration(30.hours))))

      var sessions = PunterSessions.withLimits(sessionLimits)

      // 15.01.2018 Monday, 16:00-17:00 (1h session)
      sessions = sessions
        .startSession(activePunterSession(deploymentTime(2018, JANUARY, 15, 16, 0)))
        .endCurrentSession(deploymentTime(2018, JANUARY, 15, 17, 0))

      // when
      val almostEndOfTheDay = deploymentTime(2018, JANUARY, 15, 23, 0)
      val sessionStats = sessions.sessionStats(asOf = almostEndOfTheDay, clock)

      // then
      val startOfNextDay = deploymentTime(2018, JANUARY, 16, 0, 0)
      sessionStats.estimateLimitExcess.get.exceedsAt shouldBe startOfNextDay + sessionLimits.daily.value.get
      sessionStats.estimateLimitExcess.get.exceededPeriod shouldBe enclosingDay(startOfNextDay, clock)
    }

    "correctly calculate session usage, when daily limit is likely to be reached" in {
      // given
      val sessionLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(3.hours))),
        Limit.Weekly(Some(SessionDuration(20.hours))),
        Limit.Monthly(Some(SessionDuration(80.hours))))
      var sessions = PunterSessions.withLimits(sessionLimits)

      // 31.01.2018 Wednesday, 16:00-18:00 (2h)
      val sessionOneStart = deploymentTime(2018, JANUARY, 31, 16, 0)
      val sessionOneEnd = sessionOneStart.plusHours(2)
      sessions = sessions.startSession(activePunterSession(sessionOneStart)).endCurrentSession(sessionOneEnd)

      // then
      val atTheSameDay = sessionOneEnd.plusHours(1) // 31.01.2018 Wednesday, 19:00
      val statsAsOfSameDay = sessions.sessionStats(atTheSameDay, clock)
      statsAsOfSameDay.sessionUsage.daily.value shouldBe SessionDuration(2.hours)
      statsAsOfSameDay.estimateLimitExcess.get.exceedsAt shouldBe atTheSameDay + 1.hour
      statsAsOfSameDay.estimateLimitExcess.get.exceededPeriod shouldBe enclosingDay(atTheSameDay, clock)

      // and
      val nextDay = atTheSameDay.plusDays(1) // 01.02.2018 Thursday, 19:00
      val statsAsOfNextDay = sessions.sessionStats(nextDay, clock)
      statsAsOfNextDay.sessionUsage.daily.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextDay.estimateLimitExcess.get.exceedsAt shouldBe nextDay + sessionLimits.daily.value.get
      statsAsOfNextDay.estimateLimitExcess.get.exceededPeriod shouldBe enclosingDay(nextDay, clock)
    }

    "correctly calculate session usage, when daily limit is beyond the day end" in {
      // given
      val sessionLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(20.hours))),
        Limit.Weekly(Some(SessionDuration(40.hours))),
        Limit.Monthly(Some(SessionDuration(80.hours))))
      var sessions = PunterSessions.withLimits(sessionLimits)

      // 31.01.2018 Wednesday, 16:00-18:00 (2h)
      val sessionOneStart = deploymentTime(2018, JANUARY, 31, 16, 0)
      val sessionOneEnd = sessionOneStart.plusHours(2)
      sessions = sessions.startSession(activePunterSession(sessionOneStart)).endCurrentSession(sessionOneEnd)

      // then
      val atTheSameDay = sessionOneEnd.plusHours(1) // 31.01.2018 Wednesday, 19:00
      val beginningOfNextDay = enclosingDay(sessionOneEnd, clock).endExclusive
      val statsAsOfSameDay = sessions.sessionStats(atTheSameDay, clock)
      statsAsOfSameDay.sessionUsage.daily.value shouldBe SessionDuration(2.hours)
      statsAsOfSameDay.estimateLimitExcess.get.exceedsAt shouldBe beginningOfNextDay + sessionLimits.daily.value.get
      statsAsOfSameDay.estimateLimitExcess.get.exceededPeriod shouldBe enclosingDay(atTheSameDay.plusDays(1), clock)

      // and
      val nextDay = atTheSameDay.plusDays(1) // 01.02.2018 Thursday, 19:00
      val beginningOfNextNextDay = enclosingDay(nextDay, clock).endExclusive
      val statsAsOfNextDay = sessions.sessionStats(nextDay, clock)
      statsAsOfNextDay.sessionUsage.daily.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextDay.estimateLimitExcess.get.exceedsAt shouldBe beginningOfNextNextDay + sessionLimits.daily.value.get
      statsAsOfNextDay.estimateLimitExcess.get.exceededPeriod shouldBe enclosingDay(nextDay.plusDays(1), clock)
    }

    "correctly calculate session usage, when weekly limit is likely to be reached" in {
      // given
      val sessionLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(3.hours))),
        Limit.Weekly(Some(SessionDuration(6.hours))),
        Limit.Monthly(Some(SessionDuration(20.hours))))
      var sessions = PunterSessions.withLimits(sessionLimits)

      // 01.02.2018 Thursday, 15:30-18:30 (3h)
      val sessionOneStart = deploymentTime(2018, FEBRUARY, 1, 15, 30)
      val sessionOneEnd = sessionOneStart.plusHours(3)
      sessions = sessions.startSession(activePunterSession(sessionOneStart)).endCurrentSession(sessionOneEnd)

      // 02.02.2018 Friday, 15:30-17:30 (2h)
      val sessionTwoStart = sessionOneStart.plusDays(1)
      val sessionTwoEnd = sessionTwoStart.plusHours(2)
      sessions = sessions.startSession(activePunterSession(sessionTwoStart)).endCurrentSession(sessionTwoEnd)

      // then
      val nextDaySameWeek = sessionTwoEnd.plusDays(1) // 03.02.2018 Saturday, 17:30
      val statsAsOfNextDay = sessions.sessionStats(nextDaySameWeek, clock)
      statsAsOfNextDay.sessionUsage.daily.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextDay.sessionUsage.weekly.value shouldBe SessionDuration(5.hours)
      statsAsOfNextDay.estimateLimitExcess.get.exceedsAt shouldBe nextDaySameWeek + 1.hour
      statsAsOfNextDay.estimateLimitExcess.get.exceededPeriod shouldBe enclosingWeek(nextDaySameWeek, clock)

      // and
      val twoDaysAfterSameWeek = nextDaySameWeek.plusDays(1) // 04.02.2018 Sunday, 17:30
      val statsAsOfTwoDaysAfter = sessions.sessionStats(twoDaysAfterSameWeek, clock)
      statsAsOfTwoDaysAfter.sessionUsage.daily.value shouldBe SessionDuration.monoid.empty
      statsAsOfTwoDaysAfter.sessionUsage.weekly.value shouldBe SessionDuration(5.hours)
      statsAsOfTwoDaysAfter.estimateLimitExcess.get.exceedsAt shouldBe twoDaysAfterSameWeek + 1.hour
      statsAsOfTwoDaysAfter.estimateLimitExcess.get.exceededPeriod shouldBe enclosingWeek(nextDaySameWeek, clock)

      // and
      val mondayNextWeek = twoDaysAfterSameWeek.plusDays(1) // 05.02.2018 Monday, 17:30
      val statsAsOfNextWeek = sessions.sessionStats(mondayNextWeek, clock)
      statsAsOfNextWeek.sessionUsage.daily.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextWeek.sessionUsage.weekly.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextWeek.estimateLimitExcess.get.exceedsAt shouldBe mondayNextWeek + sessionLimits.daily.value.get
      statsAsOfNextWeek.estimateLimitExcess.get.exceededPeriod shouldBe enclosingDay(mondayNextWeek, clock)
    }

    "correctly calculate session usage, when monthly limit is likely to be reached" in {
      // given
      val sessionLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(5.hours))),
        Limit.Weekly(Some(SessionDuration(10.hours))),
        Limit.Monthly(Some(SessionDuration(15.hours))))
      var sessions = PunterSessions.withLimits(sessionLimits)

      // 01.02.2018 Thursday, 15:30-20:30 (5h)
      val sessionOneStart = deploymentTime(2018, FEBRUARY, 1, 15, 30)
      val sessionOneEnd = sessionOneStart.plusHours(5)
      sessions = sessions.startSession(activePunterSession(sessionOneStart)).endCurrentSession(sessionOneEnd)

      // 02.02.2018 Friday, 15:30-20:30 (5h)
      val sessionTwoStart = sessionOneStart.plusDays(1)
      val sessionTwoEnd = sessionTwoStart.plusHours(5)
      sessions = sessions.startSession(activePunterSession(sessionTwoStart)).endCurrentSession(sessionTwoEnd)

      // 09.02.2018 Friday, 15:30-19:30 (4h)
      val sessionThreeStart = sessionTwoStart.plusWeeks(1)
      val sessionThreeEnd = sessionThreeStart.plusHours(4)
      sessions = sessions.startSession(activePunterSession(sessionThreeStart)).endCurrentSession(sessionThreeEnd)

      // then
      val nextDaySameWeek = sessionThreeEnd.plusDays(1) // 10.02.2018 Saturday, 19:30
      val statsAsOfNextDay = sessions.sessionStats(nextDaySameWeek, clock)
      statsAsOfNextDay.sessionUsage.daily.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextDay.sessionUsage.weekly.value shouldBe SessionDuration(4.hours)
      statsAsOfNextDay.sessionUsage.monthly.value shouldBe SessionDuration(14.hours)
      statsAsOfNextDay.estimateLimitExcess.get.exceedsAt shouldBe nextDaySameWeek + 1.hour
      statsAsOfNextDay.estimateLimitExcess.get.exceededPeriod shouldBe enclosingMonth(nextDaySameWeek, clock)

      // and
      val nextWeek = nextDaySameWeek.plusWeeks(1) // 17.02.2018 Saturday, 19:30
      val statsAsOfNextWeek = sessions.sessionStats(nextWeek, clock)
      statsAsOfNextWeek.sessionUsage.daily.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextWeek.sessionUsage.weekly.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextWeek.sessionUsage.monthly.value shouldBe SessionDuration(14.hours)
      statsAsOfNextWeek.estimateLimitExcess.get.exceedsAt shouldBe nextWeek + 1.hour
      statsAsOfNextWeek.estimateLimitExcess.get.exceededPeriod shouldBe enclosingMonth(nextDaySameWeek, clock)

      // and
      val nextMonth = sessionOneStart.plusMonths(1) // 01.03.2018 Wednesday, 15:30
      val statsAsOfNextMonth = sessions.sessionStats(nextMonth, clock)
      statsAsOfNextMonth.sessionUsage.daily.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextMonth.sessionUsage.weekly.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextMonth.sessionUsage.monthly.value shouldBe SessionDuration.monoid.empty
      statsAsOfNextMonth.estimateLimitExcess.get.exceedsAt shouldBe nextMonth + sessionLimits.daily.value.get
      statsAsOfNextMonth.estimateLimitExcess.get.exceededPeriod shouldBe enclosingDay(nextMonth, clock)
    }

    "correctly calculate session usage for an ongoing session" in {
      // given
      val sessionLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(10.hours))),
        Limit.Weekly(Some(SessionDuration(30.hours))),
        Limit.Monthly(Some(SessionDuration(90.hours))))
      var sessions = PunterSessions.withLimits(sessionLimits)

      // 01.02.2018 Thursday, 15:30 ongoing session
      val sessionStart = deploymentTime(2018, FEBRUARY, 1, 15, 30)
      sessions = sessions.startSession(activePunterSession(sessionStart))

      // then
      val beforeSessionStarts = sessionStart.minusHours(1)
      sessions.sessionStats(beforeSessionStarts, clock).sessionUsage.daily.value shouldBe SessionDuration.monoid.empty

      // and
      val twoHoursAfterSessionStarted = sessionStart.plusHours(2)
      sessions.sessionStats(twoHoursAfterSessionStarted, clock).sessionUsage.daily.value shouldBe SessionDuration(
        2.hours)
    }

    "sessions originated from excluded punters does not count to the usage limits" in {
      // given
      val initialLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(1.hours))),
        Limit.Weekly(Some(SessionDuration(30.hours))),
        Limit.Monthly(Some(SessionDuration(90.hours))))
      var sessions = PunterSessions.withLimits(initialLimits)

      // when
      val sessionStart = deploymentTime(2018, FEBRUARY, 1, 15, 30)
      sessions = sessions.startSession(excludedPunterSession(sessionStart)).endCurrentSession(sessionStart.plusHours(2))

      // then
      val sameDay = sessionStart.plusHours(5)
      sessions.sessionStats(asOf = sameDay, clock).sessionUsage.daily.value shouldBe SessionDuration.monoid.empty
    }

    "correctly calculate session usage in case limits changed" in {
      // given
      val initialLimits = Limits.unsafe(
        Limit.Daily(Some(SessionDuration(10.hours))),
        Limit.Weekly(Some(SessionDuration(30.hours))),
        Limit.Monthly(Some(SessionDuration(90.hours))))
      var sessions = PunterSessions.withLimits(initialLimits)

      // 01.02.2018 Thursday, 10:30-12:30 (2h)
      val sessionOneStart = deploymentTime(2018, FEBRUARY, 1, 10, 30)
      val sessionOneEnd = sessionOneStart.plusHours(2)
      sessions = sessions.startSession(activePunterSession(sessionOneStart)).endCurrentSession(sessionOneEnd)

      // when
      val limitsChangeDate = sessionOneEnd.plusHours(2)
      val changedSameDay = initialLimits.copy(daily = Limit.Daily(Some(SessionDuration(3.hours))))
      sessions = sessions.changeLimits(sessions.estimateLimitsChange(changedSameDay, asOf = limitsChangeDate, clock))

      // then
      val sameDayAsLimitChange = limitsChangeDate.plusHours(1)
      val statsAsOfSameDay = sessions.sessionStats(asOf = sameDayAsLimitChange, clock)
      val usageLeftAccordingToNewLimit = 1.hour
      statsAsOfSameDay.estimateLimitExcess.get.exceedsAt shouldBe sameDayAsLimitChange + usageLeftAccordingToNewLimit

      // and
      val nextDayAfterLimitChange = limitsChangeDate.plusDays(1)
      val statsAsOfNextDay = sessions.sessionStats(asOf = nextDayAfterLimitChange, clock)
      statsAsOfNextDay.estimateLimitExcess.get.exceedsAt shouldBe nextDayAfterLimitChange + changedSameDay.daily.value.get
    }

    "correctly estimate limit excess when there's no session limits at all" in {
      // given
      val noLimits: Limits[SessionDuration] = Limits.unsafe(Limit.Daily(None), Limit.Weekly(None), Limit.Monthly(None))
      var sessions = PunterSessions.withLimits(noLimits)

      // 01.02.2018 Thursday, 10:30-12:30 (2h)
      val sessionStart = deploymentTime(2018, FEBRUARY, 1, 10, 30)
      val sessionEnd = sessionStart.plusHours(2)
      sessions = sessions.startSession(activePunterSession(sessionStart)).endCurrentSession(sessionEnd)

      // when
      val sameDay = sessionEnd.plusHours(1)
      val sessionStats = sessions.sessionStats(asOf = sameDay, clock)

      // then
      sessionStats.estimateLimitExcess shouldBe None
    }
  }

  private def activePunterSession(startedAt: OffsetDateTime): PunterState.StartedSession = {
    val sessionDetails =
      Limited(canBeActiveUntil = OffsetDateTime.MAX, coolOffUntil = OffsetDateTime.MAX, dateInTheFuture)
    PunterState.StartedSession(generateSessionId(), startedAt, sessionDetails, ipAddress = None)
  }

  private def excludedPunterSession(startedAt: OffsetDateTime): PunterState.StartedSession =
    PunterState.StartedSession(generateSessionId(), startedAt, Unlimited(dateInTheFuture), ipAddress = None)
}
