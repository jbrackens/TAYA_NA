package phoenix.punters.unit

import scala.concurrent.Future

import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.currency.MoneyAmount
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.Events.DailyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.DailySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.DailyStakeLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.MonthlyStakeLimitChanged
import phoenix.punters.PunterProtocol.Events.PunterEvent
import phoenix.punters.PunterProtocol.Events.WeeklyDepositLimitChanged
import phoenix.punters.PunterProtocol.Events.WeeklySessionLimitChanged
import phoenix.punters.PunterProtocol.Events.WeeklyStakeLimitChanged
import phoenix.punters.application.es.LimitsHistoryHandler
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.EffectiveLimit
import phoenix.punters.domain.Limit
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.domain.SessionDuration
import phoenix.punters.domain.StakeLimitAmount
import phoenix.punters.support.InMemoryPunterLimitsHistoryRepository
import phoenix.support.FutureSupport

final class LimitsHistoryHandlerSpec extends AnyWordSpecLike with BeforeAndAfterAll with FutureSupport with Matchers {

  private val clock = Clock.utcClock
  private val now = clock.currentOffsetDateTime()
  private val REMOVED = "REMOVED"

  "LimitsHistoryHandler" should {
    "handle SessionLimitsChanged event" in new EventHandlerScope {
      // given
      val punterId = PunterId("123")

      val dailyLimitEvent =
        DailySessionLimitChanged(punterId, EffectiveLimit(Limit.Daily(Some(SessionDuration(3600000000000L))), now))
      val weeklyLimitEvent =
        WeeklySessionLimitChanged(punterId, EffectiveLimit(Limit.Weekly(Some(SessionDuration(36000000000000L))), now))
      val monthlyLimitEvent =
        MonthlySessionLimitChanged(
          punterId,
          EffectiveLimit(Limit.Monthly(Some(SessionDuration(360000000000000L))), now))
      val dailyLimitRemovedEvent =
        DailySessionLimitChanged(punterId, EffectiveLimit(Limit.Daily(None), now))

      // when
      await(handle(dailyLimitEvent))
      await(handle(weeklyLimitEvent))
      await(handle(monthlyLimitEvent))
      await(handle(dailyLimitRemovedEvent))

      // then
      val limits = await(limitsRepo.findLimits(Pagination(1, 10), punterId))
      limits.data should have size 4

      // and
      (limits.data.map(_.limit) should contain)
        .theSameElementsInOrderAs(List(REMOVED, "100 hours", "10 hours", "1 hour"))
    }

    "handle DepositLimitsChanged event" in new EventHandlerScope {
      // given
      val punterId = PunterId("123")

      val dailyLimitEvent =
        DailyDepositLimitChanged(punterId, EffectiveLimit(Limit.Daily(Some(DepositLimitAmount(MoneyAmount(1)))), now))
      val weeklyLimitEvent =
        WeeklyDepositLimitChanged(
          punterId,
          EffectiveLimit(Limit.Weekly(Some(DepositLimitAmount(MoneyAmount(10)))), now))
      val monthlyLimitEvent = MonthlyDepositLimitChanged(
        punterId,
        EffectiveLimit(Limit.Monthly(Some(DepositLimitAmount(MoneyAmount(100)))), now))
      val weeklyLimitRemovedEvent =
        WeeklyDepositLimitChanged(punterId, EffectiveLimit(Limit.Weekly(None), now))

      // when
      await(handle(dailyLimitEvent))
      await(handle(weeklyLimitEvent))
      await(handle(monthlyLimitEvent))
      await(handle(weeklyLimitRemovedEvent))

      // then
      val limits = await(limitsRepo.findLimits(Pagination(1, 10), punterId))
      limits.data should have size 4

      // and
      (limits.data.map(_.limit) should contain)
        .theSameElementsInOrderAs(List(REMOVED, "100.00USD", "10.00USD", "1.00USD"))
    }

    "handle StakeLimitsChanged event" in new EventHandlerScope {
      // given
      val punterId = PunterId("123")

      val dailyLimitEvent =
        DailyStakeLimitChanged(punterId, EffectiveLimit(Limit.Daily(Some(StakeLimitAmount(MoneyAmount(1)))), now))
      val weeklyLimitEvent =
        WeeklyStakeLimitChanged(punterId, EffectiveLimit(Limit.Weekly(Some(StakeLimitAmount(MoneyAmount(10)))), now))
      val monthlyLimitEvent =
        MonthlyStakeLimitChanged(punterId, EffectiveLimit(Limit.Monthly(Some(StakeLimitAmount(MoneyAmount(100)))), now))
      val monthlyLimitRemovedEvent = MonthlyStakeLimitChanged(punterId, EffectiveLimit(Limit.Monthly(None), now))
      // when
      await(handle(dailyLimitEvent))
      await(handle(weeklyLimitEvent))
      await(handle(monthlyLimitEvent))
      await(handle(monthlyLimitRemovedEvent))

      // then
      val limits = await(limitsRepo.findLimits(Pagination(1, 10), punterId))
      limits.data should have size 4

      // and
      (limits.data.map(_.limit) should contain)
        .theSameElementsInOrderAs(List(REMOVED, "100.00USD", "10.00USD", "1.00USD"))
    }
  }

  private abstract class EventHandlerScope {
    val limitsRepo: PunterLimitsHistoryRepository = new InMemoryPunterLimitsHistoryRepository()

    def handle(event: PunterEvent): Future[Unit] =
      LimitsHistoryHandler.handle(limitsRepo)(event, clock.currentOffsetDateTime())
  }
}
