package stella.leaderboard.server.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import org.scalacheck.Arbitrary
import play.api.mvc.AnyContentAsEmpty
import play.api.test.Helpers._
import play.api.test._

import stella.common.http.PaginatedResult
import stella.common.http.Response
import stella.common.models.Ids.ProjectId

import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.BaseFetchAggregationResultsParams
import stella.leaderboard.models.Ids.AggregationRuleId
import stella.leaderboard.models._
import stella.leaderboard.server.config.CacheConfig
import stella.leaderboard.server.gen.Generators._
import stella.leaderboard.server.routes.ResponseFormats._
import stella.leaderboard.server.routes.SampleObjectFactory._
import stella.leaderboard.server.routes.TestConstants.Endpoint._
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationResultComparisonReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationResultNeighborsReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationResultsReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationWindowsReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext._

class LeaderboardRoutesWithMockedBoundedContextAndOutdatedCacheSpec extends RoutesWithMockedBoundedContextSpecBase {

  override protected lazy val cacheConfigOverride: Option[CacheConfig] = Some(
    CacheConfig(
      windowsTimeout = 0.seconds,
      aggregationResultsTimeout = 0.seconds,
      neighborsTimeout = 0.seconds,
      compareResultsTimeout = 0.seconds))

  "getAggregationWindows" should {
    "properly return results when cache timed out" in {
      forAll(aggregationWindowsGen) { aggregationWindows =>
        checkExpectedPermission(AggregationWindowsReadPermission)
        val ruleId = AggregationRuleId.random()
        (boundedContext
          .getAggregationWindows(_: ProjectId, _: AggregationRuleId)(_: ExecutionContext))
          .expects(testProjectId, ruleId, *)
          .returning(Future.successful(aggregationWindows))
          .once()
        val aggregationWindowsPath = aggregationWindowsEndpointPath(ruleId)
        val request = FakeRequest(GET, aggregationWindowsPath, headersWithFakeJwt, AnyContentAsEmpty)
        val res1 = route(app, request).value
        val aggregationWindowsFromRes1 = withOkStatusAndJsonContentAs[Response[Seq[AggregationWindow]]](res1)
        checkExpectedPermission(AggregationWindowsReadPermission)
        // WHEN: we repeat a request and time moved further than cache timeout
        testClock.moveTime()
        (boundedContext
          .getAggregationWindows(_: ProjectId, _: AggregationRuleId)(_: ExecutionContext))
          .expects(testProjectId, ruleId, *)
          .returning(Future.successful(aggregationWindows))
          .once()
        val res2 = route(app, request).value
        // THEN: getAggregationWindows is called once again
        val aggregationWindowsFromRes2 = withOkStatusAndJsonContentAs[Response[Seq[AggregationWindow]]](res2)
        aggregationWindowsFromRes2 mustBe Response.asSuccess(aggregationWindows)
        aggregationWindowsFromRes2 mustBe aggregationWindowsFromRes1
      }
    }
  }

  "getAggregationResults" should {
    "properly return page content when cache timed out" in {
      forAll(
        baseFetchAggregationResultsParamsGen(testProjectId),
        pageSizeGen,
        pageNumberGen,
        Arbitrary.arbBool.arbitrary) { (baseParams, pageSize, pageNumber, countPages) =>
        val aggregationResultsPath = aggregationResultsEndpointPath(baseParams.aggregationRuleId)
        val queryString = aggregationResultsQueryString(baseParams, pageSize, pageNumber, Some(countPages))
        val path = aggregationResultsPath + queryString
        checkExpectedPermission(AggregationResultsReadPermission)
        val expectedBaseParams = baseParams.withRemovedOverriddenFilters
        (boundedContext
          .getAggregationResultsPage(_: BaseFetchAggregationResultsParams, _: Int, _: Int, _: Boolean)(
            _: ExecutionContext))
          .expects(expectedBaseParams, pageSize, pageNumber, countPages, *)
          .returning(Future.successful(aggregationResultsPage))
          .once()
        val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
        val res1 = route(app, request).value
        val pageFromRes1 = withOkStatusAndJsonContentAs[Response[PaginatedResult[AggregationResult]]](res1)
        checkExpectedPermission(AggregationResultsReadPermission)
        // WHEN: we repeat a request and time moved further than cache timeout
        testClock.moveTime()
        (boundedContext
          .getAggregationResultsPage(_: BaseFetchAggregationResultsParams, _: Int, _: Int, _: Boolean)(
            _: ExecutionContext))
          .expects(expectedBaseParams, pageSize, pageNumber, countPages, *)
          .returning(Future.successful(aggregationResultsPage))
          .once()
        val res2 = route(app, request).value
        // THEN: getAggregationResultsPage is called once again
        val pageFromRes2 = withOkStatusAndJsonContentAs[Response[PaginatedResult[AggregationResult]]](res2)
        pageFromRes2 mustBe Response.asSuccess(aggregationResultsPage)
        pageFromRes2 mustBe pageFromRes1
      }
    }
  }

  "getAggregationResultNeighbors" should {
    "properly return results when cache timed out" in {
      val aggregationResults = Seq(aggregationResult, aggregationResult2)
      forAll(baseFetchAggregationResultsParamsGen(testProjectId), neighborsSizeGen, fieldValueGen) {
        (baseParams, neighborsSize, fieldValue) =>
          val aggregationResultNeighborsPath = aggregationResultNeighborsEndpointPath(baseParams.aggregationRuleId)
          val queryString = aggregationResultNeighborsQueryString(baseParams, neighborsSize, fieldValue)
          val path = aggregationResultNeighborsPath + queryString
          checkExpectedPermission(AggregationResultNeighborsReadPermission)
          val expectedBaseParams = baseParams.withRemovedOverriddenFilters
          (boundedContext
            .getAggregationResultNeighbors(_: BaseFetchAggregationResultsParams, _: Int, _: String)(
              _: ExecutionContext))
            .expects(expectedBaseParams, neighborsSize, fieldValue, *)
            .returning(Future.successful(aggregationResults))
            .once()
          val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
          val res1 = route(app, request).value
          val neighborsFromRes1 = withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res1)
          checkExpectedPermission(AggregationResultNeighborsReadPermission)
          // WHEN: we repeat a request and time moved further than cache timeout
          testClock.moveTime()
          (boundedContext
            .getAggregationResultNeighbors(_: BaseFetchAggregationResultsParams, _: Int, _: String)(
              _: ExecutionContext))
            .expects(expectedBaseParams, neighborsSize, fieldValue, *)
            .returning(Future.successful(aggregationResults))
            .once()
          val res2 = route(app, request).value
          // THEN: getAggregationResultNeighbors is called once again
          val neighborsFromRes2 = withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res2)
          neighborsFromRes2 mustBe Response.asSuccess(aggregationResults)
          neighborsFromRes2 mustBe neighborsFromRes1
      }
    }
  }

  "compareAggregationResults" should {
    "properly return results when cache timed out" in {
      val aggregationResults = Seq(aggregationResult, aggregationResult2)
      forAll(baseFetchAggregationResultsParamsGen(testProjectId), fieldValuesGen) { (baseParams, fieldValues) =>
        val duplicatedFieldValues = fieldValues ++ fieldValues
        val uniqueSortedFieldValues = fieldValues.distinct.sorted
        val compareAggregationResultsPath = compareAggregationResultsEndpointPath(baseParams.aggregationRuleId)
        val queryString =
          compareAggregationResultsQueryString(baseParams, duplicatedFieldValues)
        val path = compareAggregationResultsPath + queryString
        checkExpectedPermission(AggregationResultComparisonReadPermission)
        val expectedBaseParams = baseParams.withRemovedOverriddenFilters
        (boundedContext
          .getAggregationResultsForValues(_: BaseFetchAggregationResultsParams, _: List[String])(_: ExecutionContext))
          .expects(expectedBaseParams, uniqueSortedFieldValues, *)
          .returning(Future.successful(aggregationResults))
          .once()
        val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
        val res1 = route(app, request).value
        val comparisonResults1 = withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res1)
        checkExpectedPermission(AggregationResultComparisonReadPermission)
        // WHEN: we repeat a request and time moved further than cache timeout
        testClock.moveTime()
        (boundedContext
          .getAggregationResultsForValues(_: BaseFetchAggregationResultsParams, _: List[String])(_: ExecutionContext))
          .expects(expectedBaseParams, uniqueSortedFieldValues, *)
          .returning(Future.successful(aggregationResults))
          .once()
        val res2 = route(app, request).value
        // THEN: getAggregationResultsForValues is called once again
        val comparisonResults2 = withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res2)
        comparisonResults2 mustBe Response.asSuccess(aggregationResults)
        comparisonResults2 mustBe comparisonResults1
      }
    }
  }
}
