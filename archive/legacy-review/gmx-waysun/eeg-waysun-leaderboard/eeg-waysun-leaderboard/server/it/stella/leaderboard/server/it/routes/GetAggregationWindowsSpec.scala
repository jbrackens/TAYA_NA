package stella.leaderboard.server.it.routes

import play.api.mvc.AnyContentAsEmpty
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.models.Ids.ProjectId

import stella.leaderboard.it.utils.TestAuthContext
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.Ids.AggregationRuleId
import stella.leaderboard.models.OrderByDirection
import stella.leaderboard.models.OrderByFilter
import stella.leaderboard.models.OrderByFilters
import stella.leaderboard.models.OrderByType
import stella.leaderboard.models.PositionType
import stella.leaderboard.models._
import stella.leaderboard.server.routes.TestConstants.Endpoint._

trait GetAggregationWindowsSpec { self: LeaderboardRoutesSpecBase =>

  "getAggregationWindows" should {
    "return proper existing results" in {
      val authContextProject1 = TestAuthContext(primaryProjectId = testData.projectId1)
      val authContextProject2 = TestAuthContext(primaryProjectId = testData.projectId2)
      val aggregationWindowsPath = aggregationWindowsEndpointPath(testData.aggregationRuleId1)
      val aggregationWindowsPath2 = aggregationWindowsEndpointPath(testData.aggregationRuleId2)

      val requestForAggregationRule1 =
        FakeRequest(GET, aggregationWindowsPath, headersWithJwt, AnyContentAsEmpty)
      val requestForAggregationRule2 =
        FakeRequest(GET, aggregationWindowsPath2, headersWithJwt, AnyContentAsEmpty)

      sendRequestAndReturnAggregationWindows(requestForAggregationRule1, authContextProject1) mustBe Seq(
        AggregationWindow(
          elements = 1,
          testData.project1Rule1Results.aggregation2Result.windowRangeStart,
          testData.project1Rule1Results.aggregation2Result.windowRangeEnd),
        AggregationWindow(
          elements = 1,
          testData.project1Rule1Results.aggregation3Result.windowRangeStart,
          testData.project1Rule1Results.aggregation3Result.windowRangeEnd),
        AggregationWindow(
          elements = 1,
          testData.project1Rule1Results.aggregation4Result.windowRangeStart,
          testData.project1Rule1Results.aggregation4Result.windowRangeEnd),
        AggregationWindow(
          elements = 1,
          testData.project1Rule1Results.aggregation5Result.windowRangeStart,
          testData.project1Rule1Results.aggregation5Result.windowRangeEnd),
        AggregationWindow(
          elements = 5,
          testData.project1Rule1Results.aggregation1Result.windowRangeStart,
          testData.project1Rule1Results.aggregation1Result.windowRangeEnd))

      sendRequestAndReturnAggregationWindows(requestForAggregationRule1, authContextProject2) mustBe Seq(
        AggregationWindow(
          elements = 1,
          testData.project2Rule1Results.aggregationResult.windowRangeStart,
          testData.project2Rule1Results.aggregationResult.windowRangeEnd))

      sendRequestAndReturnAggregationWindows(requestForAggregationRule2, authContextProject1) mustBe Seq(
        AggregationWindow(
          elements = 1,
          testData.project1Rule2Results.aggregationResult.windowRangeStart,
          testData.project1Rule2Results.aggregationResult.windowRangeEnd))

      sendRequestAndReturnAggregationWindows(requestForAggregationRule2, authContextProject2) mustBe Seq(
        AggregationWindow(
          elements = 1,
          testData.project2Rule2Results.aggregationResult.windowRangeStart,
          testData.project2Rule2Results.aggregationResult.windowRangeEnd))
    }

    "return empty collection for project without the results stored" in {
      val otherProjectId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = otherProjectId)
      val aggregationWindowsPath = aggregationWindowsEndpointPath(testData.aggregationRuleId1)
      val request = FakeRequest(GET, aggregationWindowsPath, headersWithJwt, AnyContentAsEmpty)
      sendRequestAndReturnAggregationWindows(request, authContext) mustBe Nil
    }

    "return empty collection for aggregation rule without the results stored" in {
      val authContextProject1 = TestAuthContext(primaryProjectId = testData.projectId1)
      val otherAggregationRuleId = AggregationRuleId.random()
      val aggregationWindowsPath = aggregationWindowsEndpointPath(otherAggregationRuleId)
      val request = FakeRequest(GET, aggregationWindowsPath, headersWithJwt, AnyContentAsEmpty)
      sendRequestAndReturnAggregationWindows(request, authContextProject1) mustBe Nil
    }

    "return cached data" in {
      // GIVEN: one entry for an aggregation
      val projectId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = projectId)
      val res1 =
        testData.storeNewResult1ForProject(projectId, leaderboardModule.aggregationResultRepository, awaitTimeout)
      val path = aggregationWindowsEndpointPath(res1.aggregationRuleId)
      val expectedWindows = Seq(AggregationWindow(1, res1.windowRangeStart, res1.windowRangeEnd))
      sendRequestAndReturnAggregationWindows(path, authContext) mustBe expectedWindows
      // WHEN: the second entry is stored
      val _ = testData.storeNewResult2ForProject(projectId, leaderboardModule.aggregationResultRepository, awaitTimeout)
      // THEN: other request shows that there are two entries
      val resultsPath = aggregationResultsEndpointPath(res1.aggregationRuleId) + aggregationResultsQueryString(
        windowRangeStart = res1.windowRangeStart,
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min))),
        positionType = PositionType.DenseRank,
        pageSize = 10,
        pageNumber = 1)
      sendRequestAndReturnPage(resultsPath, authContext).results must have size 2
      // WHEN: we send another GET request like the first one
      val newWindows = sendRequestAndReturnAggregationWindows(path, authContext)
      // THEN: we got an older, already cached result
      newWindows mustBe expectedWindows
    }
  }
}
