package stella.leaderboard.gen

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.Date

import org.scalacheck.Arbitrary
import org.scalacheck.Gen

import stella.common.models.Ids.ProjectId

import stella.leaderboard.TestConstants
import stella.leaderboard.models
import stella.leaderboard.models.AggregationResultFromEvent
import stella.leaderboard.models.BaseFetchAggregationResultsParams
import stella.leaderboard.models.Ids.AggregationRuleId
import stella.leaderboard.models.OrderByDirection
import stella.leaderboard.models.OrderByFilter
import stella.leaderboard.models.OrderByFilters
import stella.leaderboard.models.OrderByType
import stella.leaderboard.models.PositionType

object Generators {

  lazy val aggregationResultFromEventGen: Gen[AggregationResultFromEvent] = for {
    projectId <- projectIdGen
    aggregationRuleId <- aggregationRuleIdGen
    groupByFieldValue <- stringGen()
    windowRangeStart <- Gen.option(offsetDateTimeGen)
    windowRangeEnd <- Gen.option(offsetDateTimeGen)
    min <- Arbitrary.arbFloat.arbitrary
    max <- Arbitrary.arbFloat.arbitrary
    count <- Arbitrary.arbInt.arbitrary
    sum <- Arbitrary.arbFloat.arbitrary
    custom <- stringGen()
    createdAt <- offsetDateTimeGen
    updatedAt <- offsetDateTimeGen
  } yield AggregationResultFromEvent(
    projectId,
    aggregationRuleId,
    groupByFieldValue,
    windowRangeStart,
    windowRangeEnd,
    min,
    max,
    count,
    sum,
    custom,
    createdAt,
    updatedAt)

  lazy val projectIdGen: Gen[ProjectId] = Arbitrary.arbUuid.arbitrary.map(ProjectId.apply)
  lazy val aggregationRuleIdGen: Gen[AggregationRuleId] = Arbitrary.arbUuid.arbitrary.map(AggregationRuleId.apply)

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
