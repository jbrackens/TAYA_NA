package stella.leaderboard.services

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Random

import org.scalamock.scalatest.AsyncMockFactory
import org.scalatest.OptionValues
import org.scalatest.flatspec.AsyncFlatSpec
import org.scalatest.matchers.should
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

import stella.common.http.PaginatedResult
import stella.common.models.Ids.ProjectId

import stella.leaderboard.SampleObjectFactory._
import stella.leaderboard.db.AggregationResultRepository
import stella.leaderboard.db.AggregationResultRepository.IdAndCreatedAtPair
import stella.leaderboard.gen.Generators._
import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationResultEntity
import stella.leaderboard.models.AggregationResultFromEvent
import stella.leaderboard.models.BaseFetchAggregationResultsParams
import stella.leaderboard.models.Ids.AggregationResultId
import stella.leaderboard.models.Ids.AggregationRuleId

// Note in these tests we use .sample on generators because AsyncFlatSpec doesn't integrate well with property based tests
class LeaderboardBoundedContextImplSpec
    extends AsyncFlatSpec
    with should.Matchers
    with ScalaCheckDrivenPropertyChecks
    with AsyncMockFactory
    with OptionValues {

  private val baseParams = baseFetchAggregationResultsParamsGen(testProjectId, testAggregationRuleId).sample.value
  private val pageSize = pageSizeGen.sample.value
  private val pageNumber = pageNumberGen.sample.value

  "getAggregationWindows" should "properly call repository" in {
    val repository = mock[AggregationResultRepository]
    val boundedContext = new LeaderboardBoundedContextImpl(repository)
    val aggregationWindows = Seq(aggregationResultWindow, aggregationResultWindow2)
    (repository
      .getAggregationWindows(_: ProjectId, _: AggregationRuleId)(_: ExecutionContext))
      .expects(testProjectId, testAggregationRuleId, *)
      .returning(Future.successful(aggregationWindows))
      .once()
    for {
      windows <- boundedContext.getAggregationWindows(testProjectId, testAggregationRuleId)
    } yield {
      windows shouldBe aggregationWindows
    }
  }

  "getAggregationResultsPage" should "properly call repository" in {
    val repository = mock[AggregationResultRepository]
    val boundedContext = new LeaderboardBoundedContextImpl(repository)
    val countPages = false
    val aggregationResults = Seq(aggregationResult, aggregationResult2)
    (repository
      .countAggregationResults(_: ProjectId, _: AggregationRuleId, _: Option[OffsetDateTime])(_: ExecutionContext))
      .expects(*, *, *, *)
      .never()
    (repository
      .getAggregationResults(_: BaseFetchAggregationResultsParams, _: Int, _: Int)(_: ExecutionContext))
      .expects(baseParams, pageSize, pageNumber, *)
      .returning(Future.successful(aggregationResults))
      .once()
    for {
      page <- boundedContext.getAggregationResultsPage(baseParams, pageSize, pageNumber, countPages)
    } yield {
      val numberOfPages = None
      page shouldBe PaginatedResult[AggregationResult](pageNumber, numberOfPages, pageSize, aggregationResults)
    }
  }

  it should "properly call repository when expecting also number of pages" in {
    val repository = mock[AggregationResultRepository]
    val boundedContext = new LeaderboardBoundedContextImpl(repository)
    val countPages = true
    // a current page is expected to be not higher than a number of pages
    val numberOfPages = Integer.max(pageNumberGen.sample.value, pageNumber)
    val numberOfResults = (numberOfPages - 1) * pageSize + Random.nextInt(pageSize) + 1
    val aggregationResults = Seq(aggregationResult, aggregationResult2)
    (repository
      .countAggregationResults(_: ProjectId, _: AggregationRuleId, _: Option[OffsetDateTime])(_: ExecutionContext))
      .expects(testProjectId, testAggregationRuleId, baseParams.windowRangeStart, *)
      .returning(Future.successful(numberOfResults))
      .once()
    (repository
      .getAggregationResults(_: BaseFetchAggregationResultsParams, _: Int, _: Int)(_: ExecutionContext))
      .expects(baseParams, pageSize, pageNumber, *)
      .returning(Future.successful(aggregationResults))
      .once()
    for {
      page <- boundedContext.getAggregationResultsPage(baseParams, pageSize, pageNumber, countPages)
    } yield {
      page shouldBe PaginatedResult[AggregationResult](pageNumber, Some(numberOfPages), pageSize, aggregationResults)
    }
  }

  it should "properly call repository when expecting also number of pages and page number is higher than number of pages" in {
    val repository = mock[AggregationResultRepository]
    val boundedContext = new LeaderboardBoundedContextImpl(repository)
    val countPages = true
    val numberOfPages = pageNumber - 1
    (repository
      .countAggregationResults(_: ProjectId, _: AggregationRuleId, _: Option[OffsetDateTime])(_: ExecutionContext))
      .expects(testProjectId, testAggregationRuleId, baseParams.windowRangeStart, *)
      .returning(Future.successful(numberOfPages * pageSize))
      .once()
    // when we know the page doesn't exist, we don't look for the results as there's no point to do so
    (repository
      .getAggregationResults(_: BaseFetchAggregationResultsParams, _: Int, _: Int)(_: ExecutionContext))
      .expects(*, *, *, *)
      .never()
    for {
      page <- boundedContext.getAggregationResultsPage(baseParams, pageSize, pageNumber, countPages)
    } yield {
      page shouldBe PaginatedResult[AggregationResult](pageNumber, Some(numberOfPages), pageSize, Nil)
    }
  }

  "getAggregationResultsNeighbors" should "properly call repository" in {
    val repository = mock[AggregationResultRepository]
    val boundedContext = new LeaderboardBoundedContextImpl(repository)
    val neighborsSize = neighborsSizeGen.sample.value
    val fieldValue = "foo"
    val aggregationResults = Seq(aggregationResult, aggregationResult2)
    (repository
      .getAggregationResultNeighbors(_: BaseFetchAggregationResultsParams, _: Int, _: String)(_: ExecutionContext))
      .expects(baseParams, neighborsSize, fieldValue, *)
      .returning(Future.successful(aggregationResults))
      .once()
    for {
      results <- boundedContext.getAggregationResultNeighbors(baseParams, neighborsSize, fieldValue)
    } yield {
      results shouldBe aggregationResults
    }
  }

  "getAggregationResultsForValues" should "properly call repository" in {
    val repository = mock[AggregationResultRepository]
    val boundedContext = new LeaderboardBoundedContextImpl(repository)
    val fieldValues = List("foo", "bar", "baz")
    val aggregationResults = Seq(aggregationResult, aggregationResult2)
    (repository
      .getAggregationResultsForValues(_: BaseFetchAggregationResultsParams, _: Seq[String])(_: ExecutionContext))
      .expects(baseParams, fieldValues, *)
      .returning(Future.successful(aggregationResults))
      .once()
    for {
      results <- boundedContext.getAggregationResultsForValues(baseParams, fieldValues)
    } yield {
      results shouldBe aggregationResults
    }
  }

  "storeAggregationResults" should "properly call repository" in {
    // GIVEN: several aggregation results where some have the previous versions in the repository and some don't have
    val repository = mock[AggregationResultRepository]
    val newAggregationResult1 = aggregationResultFromEventGen.sample.value
    val newAggregationResult1b = aggregationResultFromEventGen.sample.value.copy(
      projectId = newAggregationResult1.projectId,
      aggregationRuleId = newAggregationResult1.aggregationRuleId,
      groupByFieldValue = newAggregationResult1.groupByFieldValue,
      windowRangeStart = newAggregationResult1.windowRangeStart,
      windowRangeEnd = newAggregationResult1.windowRangeEnd)
    val newAggregationResult2 =
      aggregationResultFromEventGen.filter(hasDifferentProjectIdThan(newAggregationResult1)).sample.value
    val updatedAggregationResult3 =
      aggregationResultFromEventGen
        .filter(hasDifferentProjectIdThan(newAggregationResult1, newAggregationResult2))
        .sample
        .value
    val updatedAggregationResult3b = aggregationResultFromEventGen.sample.value.copy(
      projectId = updatedAggregationResult3.projectId,
      aggregationRuleId = updatedAggregationResult3.aggregationRuleId,
      groupByFieldValue = updatedAggregationResult3.groupByFieldValue,
      windowRangeStart = updatedAggregationResult3.windowRangeStart,
      windowRangeEnd = updatedAggregationResult3.windowRangeEnd)
    val updatedAggregationResult4 = aggregationResultFromEventGen
      .filter(hasDifferentProjectIdThan(newAggregationResult1, newAggregationResult2, updatedAggregationResult3))
      .sample
      .value

    val aggregationResult3Id = AggregationResultId(1)
    val aggregationResult3CreatedAt = updatedAggregationResult3b.createdAt.minusDays(1)
    val aggregationResult4Id = AggregationResultId(2)
    val aggregationResult4CreatedAt = updatedAggregationResult4.createdAt.minusDays(2)

    expectGetAggregationResultInfoCall(repository, newAggregationResult1b, expectedResult = None)
    expectGetAggregationResultInfoCall(repository, newAggregationResult2, expectedResult = None)
    expectGetAggregationResultInfoCall(
      repository,
      updatedAggregationResult3b,
      expectedResult = Some((aggregationResult3Id, aggregationResult3CreatedAt)))
    expectGetAggregationResultInfoCall(
      repository,
      updatedAggregationResult4,
      expectedResult = Some((aggregationResult4Id, aggregationResult4CreatedAt)))

    val newAggregationResults = Seq(newAggregationResult1b, newAggregationResult2)
    val aggregationResultsToUpdate = Seq(
      updatedAggregationResult3b.toAggregationResultEntity(aggregationResult3Id, Some(aggregationResult3CreatedAt)),
      updatedAggregationResult4.toAggregationResultEntity(aggregationResult4Id, Some(aggregationResult4CreatedAt)))
    expectCreateAggregationResultsCall(repository, newAggregationResults, aggregationResultsToUpdate)
    val boundedContext = new LeaderboardBoundedContextImpl(repository)

    val aggregationResults =
      Seq(
        newAggregationResult1,
        newAggregationResult1b,
        newAggregationResult2,
        updatedAggregationResult3,
        updatedAggregationResult3b,
        updatedAggregationResult4)
    // WHEN: we store aggregation results
    for {
      storedEntities <- boundedContext.storeAggregationResults(aggregationResults)
    } yield {
      // THEN: proper number of the newest results is stored, the updated ones have the same creationAt and id as
      // the previous versions and there were no calls to database for the skipped results
      storedEntities shouldBe 4
    }
  }

  private def hasDifferentProjectIdThan(otherResults: AggregationResultFromEvent*)(
      aggregationResult: AggregationResultFromEvent) =
    !otherResults.map(_.projectId).contains(aggregationResult.projectId)

  private def expectGetAggregationResultInfoCall(
      repository: AggregationResultRepository,
      aggregationResult: AggregationResultFromEvent,
      expectedResult: Option[IdAndCreatedAtPair]): Unit = {
    val _ = (repository
      .getAggregationResultInfo(
        _: ProjectId,
        _: AggregationRuleId,
        _: String,
        _: Option[OffsetDateTime],
        _: Option[OffsetDateTime])(_: ExecutionContext))
      .expects(
        aggregationResult.projectId,
        aggregationResult.aggregationRuleId,
        aggregationResult.groupByFieldValue,
        aggregationResult.windowRangeStart,
        aggregationResult.windowRangeEnd,
        *)
      .returning(Future.successful(expectedResult))
      .once()
  }

  private def expectCreateAggregationResultsCall(
      repository: AggregationResultRepository,
      newAggregationResults: Seq[AggregationResultFromEvent],
      aggregationResultsToUpdate: Seq[AggregationResultEntity]): Unit = {
    val _ = (repository
      .createAggregationResults(_: Seq[AggregationResultFromEvent], _: Seq[AggregationResultEntity])(
        _: ExecutionContext))
      .expects(newAggregationResults, aggregationResultsToUpdate, *)
      .returning(Future.successful(()))
      .once()
  }
}
