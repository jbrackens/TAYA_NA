package stella.leaderboard.server.gen

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Date

import org.scalacheck.Gen

import stella.common.models.Ids.ProjectId

import stella.leaderboard.models
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.BaseFetchAggregationResultsParams
import stella.leaderboard.models.Ids.AggregationRuleId
import stella.leaderboard.models.OrderByDirection
import stella.leaderboard.models.OrderByFilter
import stella.leaderboard.models.OrderByFilters
import stella.leaderboard.models.OrderByType
import stella.leaderboard.models.PositionType
import stella.leaderboard.models._
import stella.leaderboard.server.routes.TestConstants

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
    } yield models.OrderByFilter(direction, orderByType)

  lazy val orderByDirectionGen: Gen[OrderByDirection] = Gen.oneOf(OrderByDirection.values)

  lazy val orderByTypeGen: Gen[OrderByType] = Gen.oneOf(OrderByType.values)

  lazy val pageSizeGen: Gen[Int] = Gen.posNum[Int].suchThat(_ <= TestConstants.maxPageSize)

  lazy val pageNumberGen: Gen[Int] = Gen
    .posNum[Int]
    .suchThat(i => i >= TestConstants.minPageNumber && i <= Integer.MAX_VALUE / TestConstants.maxPageSize)

  lazy val neighborsSizeGen: Gen[Int] = Gen.posNum[Int].suchThat(_ <= TestConstants.maxNeighborsSize)

  lazy val positionTypeGen: Gen[PositionType] = Gen.oneOf(PositionType.values)

  lazy val fieldValuesGen: Gen[List[String]] = Gen.nonEmptyListOf(fieldValueGen)

  lazy val fieldValueGen: Gen[String] = stringGen(maxSize = 300)

  def baseFetchAggregationResultsParamsGen(
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId = AggregationRuleId.random()): Gen[BaseFetchAggregationResultsParams] =
    for {
      windowRangeStart <- Gen.option(offsetDateTimeGen)
      orderBy <- orderByFiltersGen
      positionType <- positionTypeGen
    } yield models.BaseFetchAggregationResultsParams(
      projectId,
      aggregationRuleId,
      windowRangeStart,
      orderBy,
      positionType)

  def stringGen(maxSize: Int = 32, minSize: Int = 0): Gen[String] =
    Gen.choose(min = minSize, max = maxSize).flatMap { size =>
      Gen.stringOfN(size, Gen.alphaNumChar)
    }
}
