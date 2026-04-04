package phoenix.punters.integration

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.Clock
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.domain.LimitChange
import phoenix.punters.domain.LimitPeriodType.Day
import phoenix.punters.domain.LimitPeriodType.Month
import phoenix.punters.domain.LimitPeriodType.Week
import phoenix.punters.domain.ResponsibleGamblingLimitType.DepositAmount
import phoenix.punters.domain.ResponsibleGamblingLimitType.SessionTime
import phoenix.punters.domain.ResponsibleGamblingLimitType.StakeAmount
import phoenix.punters.infrastructure.SlickPunterLimitsHistoryRepository
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext

final class SlickPunterLimitsHistoryRepositorySpec
    extends AnyWordSpecLike
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext {

  private val objectUnderTest = new SlickPunterLimitsHistoryRepository(dbConfig)
  private val now = Clock.utcClock.currentOffsetDateTime()

  "Punter limits repository" should {
    val pagination = Pagination(1, 100)
    val punterId = generatePunterId()

    val dailySessionLimitChanged =
      LimitChange(punterId, SessionTime, Day, "1hr", now, now)
    val weeklySessionLimitChanged =
      LimitChange(punterId, SessionTime, Week, "1hr", now, now)
    val monthlySessionLimitChanged =
      LimitChange(punterId, SessionTime, Month, "1hr", now, now)
    val dailyDepositLimitsChanged =
      LimitChange(punterId, DepositAmount, Day, "1USD", now, now)
    val weeklyDepositLimitsChanged =
      LimitChange(punterId, DepositAmount, Week, "1USD", now, now)
    val monthlyDepositLimitsChanged =
      LimitChange(punterId, DepositAmount, Month, "1USD", now, now)
    val dailyStakeLimitsChanged =
      LimitChange(punterId, StakeAmount, Day, "1USD", now, now)
    val weeklyStakeLimitsChanged =
      LimitChange(punterId, StakeAmount, Week, "1USD", now, now)
    val monthlyStakeLimitsChanged =
      LimitChange(punterId, StakeAmount, Month, "1USD", now, now)
    def createSessions =
      for {
        _ <- objectUnderTest.insert(dailySessionLimitChanged)
        _ <- objectUnderTest.insert(weeklySessionLimitChanged)
        _ <- objectUnderTest.insert(monthlySessionLimitChanged)
        _ <- objectUnderTest.insert(dailyDepositLimitsChanged)
        _ <- objectUnderTest.insert(weeklyDepositLimitsChanged)
        _ <- objectUnderTest.insert(monthlyDepositLimitsChanged)
        _ <- objectUnderTest.insert(dailyStakeLimitsChanged)
        _ <- objectUnderTest.insert(weeklyStakeLimitsChanged)
        _ <- objectUnderTest.insert(monthlyStakeLimitsChanged)
      } yield ()

    "list all types of Limit changes" in {
      await(createSessions)

      // when
      val listOfLimits = await(objectUnderTest.findLimits(pagination, punterId))

      // then
      listOfLimits shouldBe PaginatedResult(
        data = Vector(
          dailySessionLimitChanged.copy(id = Some(1)),
          weeklySessionLimitChanged.copy(id = Some(2)),
          monthlySessionLimitChanged.copy(id = Some(3)),
          dailyDepositLimitsChanged.copy(id = Some(4)),
          weeklyDepositLimitsChanged.copy(id = Some(5)),
          monthlyDepositLimitsChanged.copy(id = Some(6)),
          dailyStakeLimitsChanged.copy(id = Some(7)),
          weeklyStakeLimitsChanged.copy(id = Some(8)),
          monthlyStakeLimitsChanged.copy(id = Some(9))),
        totalCount = 9,
        currentPage = 1,
        itemsPerPage = 100,
        hasNextPage = false)
    }
  }
}
