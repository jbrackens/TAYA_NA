package stella.achievement.routes.gen

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Date

import org.scalacheck.Gen

import stella.common.http.AggregationWindow
import stella.common.models.Ids.ProjectId

import stella.achievement.TestConstants
import stella.achievement.models.BaseFetchAchievementEventsParams
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId
import stella.achievement.models.OrderByDirection
import stella.achievement.models.OrderByFilter
import stella.achievement.models.OrderByFilters
import stella.achievement.models.OrderByType

object Generators {

  lazy val aggregationWindowsGen: Gen[List[AggregationWindow]] = Gen.listOf(aggregationWindowGen)

  lazy val aggregationWindowGen: Gen[AggregationWindow] =
    for {
      elements <- Gen.posNum[Int]
      windowRangeStart <- Gen.option(offsetDateTimeGen)
      windowRangeEnd <- Gen.option(offsetDateTimeGen)
    } yield AggregationWindow(elements, windowRangeStart, windowRangeEnd)

  lazy val offsetDateTimeGen: Gen[OffsetDateTime] =
    Gen.choose(min = 1, max = System.currentTimeMillis()).flatMap { timestamp =>
      OffsetDateTime.ofInstant(new Date(timestamp).toInstant, ZoneOffset.UTC)
    }

  lazy val orderByFiltersGen: Gen[OrderByFilters] = Gen.nonEmptyListOf(orderByFilterGen).map(OrderByFilters.apply)

  lazy val orderByFilterGen: Gen[OrderByFilter] =
    for {
      direction <- orderByDirectionGen
      orderByType <- orderByTypeGen
    } yield OrderByFilter(direction, orderByType)

  lazy val orderByDirectionGen: Gen[OrderByDirection] = Gen.oneOf(OrderByDirection.values)

  lazy val orderByTypeGen: Gen[OrderByType] = Gen.oneOf(OrderByType.values)

  lazy val pageSizeGen: Gen[Int] = Gen.posNum[Int].suchThat(_ <= TestConstants.maxPageSize)

  lazy val pageNumberGen: Gen[Int] = Gen
    .posNum[Int]
    .suchThat(i => i >= TestConstants.minPageNumber && i <= Integer.MAX_VALUE / TestConstants.maxPageSize)

  lazy val fieldValueGen: Gen[String] = stringGen(maxSize = 250)

  def baseFetchAchievementEventsParamsGen(
      projectId: ProjectId,
      achievementRuleId: AchievementConfigurationRulePublicId = AchievementConfigurationRulePublicId.random())
      : Gen[BaseFetchAchievementEventsParams] =
    for {
      groupByFieldValue <- Gen.option(fieldValueGen)
      windowRangeStart <- Gen.option(offsetDateTimeGen)
      orderBy <- orderByFiltersGen
    } yield BaseFetchAchievementEventsParams(projectId, achievementRuleId, groupByFieldValue, windowRangeStart, orderBy)

  def stringGen(maxSize: Int = 32, minSize: Int = 0): Gen[String] =
    Gen.choose(min = minSize, max = maxSize).flatMap { size =>
      Gen.stringOfN(size, Gen.alphaNumChar)
    }
}
