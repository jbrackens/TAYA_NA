package stella.leaderboard.server.it.routes

import play.api.mvc.AnyContentAsEmpty
import play.api.test.FakeRequest
import play.api.test.Helpers.GET
import play.api.test.Helpers.writeableOf_AnyContentAsEmpty

import stella.common.http.PaginatedResult
import stella.common.models.Ids.ProjectId

import stella.leaderboard.it.utils.TestAuthContext
import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationResultFromEvent
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.Ids.AggregationRuleId
import stella.leaderboard.models.OrderByDirection
import stella.leaderboard.models.OrderByFilter
import stella.leaderboard.models.OrderByFilters
import stella.leaderboard.models.OrderByType
import stella.leaderboard.models.PositionType
import stella.leaderboard.models._
import stella.leaderboard.server.routes.TestConstants.Endpoint.aggregationResultsEndpointPath
import stella.leaderboard.server.routes.TestConstants.Endpoint.aggregationResultsQueryString
import stella.leaderboard.server.routes.TestConstants.Endpoint.aggregationWindowsEndpointPath

trait GetAggregationResultsSpec { self: LeaderboardRoutesSpecBase =>

  "getAggregationResults" should {
    "don't return number of pages if not requested" in {
      val existingResult = testData.project1Rule1Results.aggregation1Result
      val authContext = TestAuthContext(primaryProjectId = existingResult.projectId)
      val pageSize = 10
      val pageNumber = 10
      val path =
        aggregationResultsEndpointPath(existingResult.aggregationRuleId) + aggregationResultsQueryString(
          existingResult.windowRangeStart,
          testOrderBy,
          PositionType.DenseRank,
          pageSize,
          pageNumber,
          countPages = Some(false))
      sendRequestAndReturnPage(path, authContext) mustBe PaginatedResult[AggregationResult](
        pageNumber = pageNumber,
        numberOfPages = None,
        pageSize = pageSize,
        results = Nil)
    }

    "properly return results for different projects and rules" in {
      val authContext = TestAuthContext(primaryProjectId = testData.projectId1)
      val authContext2 = TestAuthContext(primaryProjectId = testData.projectId2)
      val pageSize = 5
      val pageNumber = 1

      def requestWithParamValuesBasedOnResult(result: AggregationResultFromEvent) =
        this.requestWithParamValuesBasedOnResult(result, pageSize, pageNumber)

      def asPaginated(result: AggregationResultFromEvent): PaginatedResult[AggregationResult] =
        this.asPaginated(
          pageNumber = pageNumber,
          numberOfPages = None,
          pageSize = pageSize,
          results = result.toAggregationResult(position = 1))

      val result1 = testData.project1Rule2Results.aggregationResult
      val request1 = requestWithParamValuesBasedOnResult(result1)
      sendRequestAndReturnPage(request1, authContext) mustBe asPaginated(result1)

      val result2 = testData.project2Rule1Results.aggregationResult
      val request2 = requestWithParamValuesBasedOnResult(result2)
      sendRequestAndReturnPage(request2, authContext2) mustBe asPaginated(result2)

      val result3 = testData.project2Rule2Results.aggregationResult
      val request3 = requestWithParamValuesBasedOnResult(result3)
      sendRequestAndReturnPage(request3, authContext2) mustBe asPaginated(result3)
    }

    "properly return results for different windows" in {
      val authContext = TestAuthContext(primaryProjectId = testData.projectId1)
      val pageSize = 10
      val pageNumber = 1

      def sendRequestWithParamValuesBasedOnResult(
          result: AggregationResultFromEvent): PaginatedResult[AggregationResult] = {
        val request = requestWithParamValuesBasedOnResult(result, pageSize, pageNumber)
        sendRequestAndReturnPage(request, authContext)
      }

      def asPaginated(results: AggregationResult*): PaginatedResult[AggregationResult] =
        this.asPaginated(pageNumber = pageNumber, numberOfPages = None, pageSize = pageSize, results = results: _*)

      val resultsWrapper = testData.project1Rule1Results
      val resultForWindow1 = resultsWrapper.aggregation1Result
      sendRequestWithParamValuesBasedOnResult(resultForWindow1) mustBe asPaginated(
        resultForWindow1.toAggregationResult(position = 1),
        resultsWrapper.aggregation1Result2.toAggregationResult(position = 1), // it has the same values as above
        resultsWrapper.aggregation1Result3.toAggregationResult(position = 2),
        resultsWrapper.aggregation1Result4.toAggregationResult(position = 3),
        resultsWrapper.aggregation1Result5.toAggregationResult(position = 4))

      val resultForWindow2 = resultsWrapper.aggregation2Result
      sendRequestWithParamValuesBasedOnResult(resultForWindow2) mustBe asPaginated(
        resultForWindow2.toAggregationResult(position = 1))

      val resultForWindow3 = resultsWrapper.aggregation3Result
      sendRequestWithParamValuesBasedOnResult(resultForWindow3) mustBe asPaginated(
        resultForWindow3.toAggregationResult(position = 1))

      val resultForWindow4 = resultsWrapper.aggregation4Result
      sendRequestWithParamValuesBasedOnResult(resultForWindow4) mustBe asPaginated(
        resultForWindow4.toAggregationResult(position = 1))

      val resultForWindow5 = resultsWrapper.aggregation5Result
      sendRequestWithParamValuesBasedOnResult(resultForWindow5) mustBe asPaginated(
        resultForWindow5.toAggregationResult(position = 1))
    }

    "properly support pagination" in {
      val resultsWrapper = testData.project1Rule1Results
      val resultToTakeParamsFrom = resultsWrapper.aggregation1Result
      val authContext = TestAuthContext(primaryProjectId = resultToTakeParamsFrom.projectId)

      def sendRequestForPageNumberAndPageSize(pageNumber: Int, pageSize: Int): PaginatedResult[AggregationResult] = {
        val path =
          aggregationResultsEndpointPath(resultToTakeParamsFrom.aggregationRuleId) + aggregationResultsQueryString(
            resultToTakeParamsFrom.windowRangeStart,
            testOrderBy,
            PositionType.DenseRank,
            pageSize,
            pageNumber,
            countPages = Some(true))
        sendRequestAndReturnPage(path, authContext)
      }

      sendRequestForPageNumberAndPageSize(pageNumber = 1, pageSize = 2) mustBe asPaginated(
        pageNumber = 1,
        pageSize = 2,
        numberOfPages = Some(3),
        resultsWrapper.aggregation1Result.toAggregationResult(position = 1),
        resultsWrapper.aggregation1Result2.toAggregationResult(position = 1))

      sendRequestForPageNumberAndPageSize(pageNumber = 2, pageSize = 2) mustBe asPaginated(
        pageNumber = 2,
        pageSize = 2,
        numberOfPages = Some(3),
        resultsWrapper.aggregation1Result3.toAggregationResult(position = 2),
        resultsWrapper.aggregation1Result4.toAggregationResult(position = 3))

      sendRequestForPageNumberAndPageSize(pageNumber = 3, pageSize = 2) mustBe asPaginated(
        pageNumber = 3,
        pageSize = 2,
        numberOfPages = Some(3),
        resultsWrapper.aggregation1Result5.toAggregationResult(position = 4))

      sendRequestForPageNumberAndPageSize(pageNumber = 4, pageSize = 2) mustBe asPaginated(
        pageNumber = 4,
        pageSize = 2,
        numberOfPages = Some(3))

      sendRequestForPageNumberAndPageSize(pageNumber = 1, pageSize = 3) mustBe asPaginated(
        pageNumber = 1,
        pageSize = 3,
        numberOfPages = Some(2),
        resultsWrapper.aggregation1Result.toAggregationResult(position = 1),
        resultsWrapper.aggregation1Result2.toAggregationResult(position = 1),
        resultsWrapper.aggregation1Result3.toAggregationResult(position = 2))

      sendRequestForPageNumberAndPageSize(pageNumber = 2, pageSize = 3) mustBe asPaginated(
        pageNumber = 2,
        pageSize = 3,
        numberOfPages = Some(2),
        resultsWrapper.aggregation1Result4.toAggregationResult(position = 3),
        resultsWrapper.aggregation1Result5.toAggregationResult(position = 4))
    }

    "properly support ordering by Min ASC for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 2),
        res4 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 3),
        res5 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 4))
    }

    "properly support ordering by Min DESC for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Min))),
        res1 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 4))
    }

    "properly support ordering by Max ASC for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Max))),
        res1 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 4))
    }

    "properly support ordering by Max DESC for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Max))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 2),
        res4 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 3),
        res5 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 4))
    }

    "properly support ordering by Count ASC for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        res1 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 5))
    }

    "properly support ordering by Count DESC for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Count))),
        res1 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 5))
    }

    "properly support ordering by Sum ASC for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum))),
        res1 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 4))
    }

    "properly support ordering by Sum DESC for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Sum))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res3 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 2),
        res4 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 3),
        res5 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 4))
    }

    "properly support ordering by field value ASC for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.FieldValue))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 5))
    }

    "properly support ordering by field value DESC for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.FieldValue))),
        res1 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 5))
    }

    "properly support compound ordering for DenseRank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(
          Seq(
            OrderByFilter(OrderByDirection.Desc, OrderByType.Sum),
            OrderByFilter(OrderByDirection.Desc, OrderByType.Min),
            OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        res1 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 5))
    }

    "properly support ordering by Min ASC for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Min DESC for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Min))),
        res1 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 4),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Max ASC for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Max))),
        res1 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 4),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Max DESC for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Max))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Count ASC for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        res1 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Count DESC for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Count))),
        res1 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Sum ASC for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum))),
        res1 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 4),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Sum DESC for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Sum))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res3 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by field value ASC for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.FieldValue))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by field value DESC for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.FieldValue))),
        res1 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 5),
        positionType = PositionType.Rank)
    }

    "properly support compound ordering for Rank" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(
          Seq(
            OrderByFilter(OrderByDirection.Desc, OrderByType.Sum),
            OrderByFilter(OrderByDirection.Desc, OrderByType.Min),
            OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        res1 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Min ASC for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Min DESC for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Min))),
        res1 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Max ASC for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Max))),
        res1 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Max DESC for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Max))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Count ASC for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        res1 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Count DESC for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Count))),
        res1 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Sum ASC for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum))),
        res1 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Sum DESC for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Sum))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by field value ASC for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.FieldValue))),
        res1 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by field value DESC for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.FieldValue))),
        res1 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "properly support compound ordering for RowNumber" in {
      testOrderByInGetAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(
          Seq(
            OrderByFilter(OrderByDirection.Desc, OrderByType.Sum),
            OrderByFilter(OrderByDirection.Desc, OrderByType.Min),
            OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        res1 = testData.project1Rule1Results.aggregation1Result2.toAggregationResult(position = 1),
        res2 = testData.project1Rule1Results.aggregation1Result.toAggregationResult(position = 2),
        res3 = testData.project1Rule1Results.aggregation1Result4.toAggregationResult(position = 3),
        res4 = testData.project1Rule1Results.aggregation1Result5.toAggregationResult(position = 4),
        res5 = testData.project1Rule1Results.aggregation1Result3.toAggregationResult(position = 5),
        positionType = PositionType.RowNumber)
    }

    "return empty collection for project without the results stored" in {
      val existingResult = testData.project1Rule1Results.aggregation1Result
      val otherProjectId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = otherProjectId)
      val pageSize = 3
      val pageNumber = 2
      val path =
        aggregationResultsEndpointPath(existingResult.aggregationRuleId) + aggregationResultsQueryString(
          existingResult.windowRangeStart,
          testOrderBy,
          PositionType.DenseRank,
          pageSize,
          pageNumber,
          countPages = Some(true))
      sendRequestAndReturnPage(path, authContext) mustBe PaginatedResult[AggregationResult](
        pageNumber = pageNumber,
        numberOfPages = Some(0),
        pageSize = pageSize,
        results = Nil)
    }

    "return empty collection for aggregation rule without the results stored" in {
      val existingResult = testData.project1Rule1Results.aggregation1Result
      val pageSize = 3
      val pageNumber = 2
      val authContext = TestAuthContext(primaryProjectId = existingResult.projectId)
      val otherAggregationRuleId = AggregationRuleId.random()
      val path =
        aggregationResultsEndpointPath(otherAggregationRuleId) + aggregationResultsQueryString(
          existingResult.windowRangeStart,
          testOrderBy,
          PositionType.DenseRank,
          pageSize,
          pageNumber,
          countPages = Some(true))
      sendRequestAndReturnPage(path, authContext) mustBe PaginatedResult[AggregationResult](
        pageNumber = pageNumber,
        numberOfPages = Some(0),
        pageSize = pageSize,
        results = Nil)
    }

    "return cached data" in {
      // GIVEN: one entry for an aggregation
      val projectId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = projectId)
      val res1 =
        testData.storeNewResult1ForProject(projectId, leaderboardModule.aggregationResultRepository, awaitTimeout)
      val path = aggregationResultsEndpointPath(res1.aggregationRuleId) + aggregationResultsQueryString(
        windowRangeStart = res1.windowRangeStart,
        positionType = PositionType.DenseRank,
        orderBy = testOrderBy,
        pageSize = 10,
        pageNumber = 1)
      val expectedPage = PaginatedResult(
        pageNumber = 1,
        numberOfPages = None,
        pageSize = 10,
        results = Seq(res1.toAggregationResult(position = 1)))
      sendRequestAndReturnPage(path, authContext) mustBe expectedPage
      // WHEN: the second entry is stored
      val _ = testData.storeNewResult2ForProject(projectId, leaderboardModule.aggregationResultRepository, awaitTimeout)
      // THEN: other request shows that there are two entries
      val windowsPath = aggregationWindowsEndpointPath(res1.aggregationRuleId)
      sendRequestAndReturnAggregationWindows(windowsPath, authContext) mustBe Seq(
        AggregationWindow(2, res1.windowRangeStart, res1.windowRangeEnd))
      // WHEN: we send another GET request like the first one
      val newPage = sendRequestAndReturnPage(path, authContext)
      // THEN: we got an older, already cached result
      newPage mustBe expectedPage
    }
  }

  private def testOrderByInGetAggregationResultsForProject1Rule1(
      orderBy: OrderByFilters,
      res1: AggregationResult,
      res2: AggregationResult,
      res3: AggregationResult,
      res4: AggregationResult,
      res5: AggregationResult,
      positionType: PositionType = PositionType.DenseRank) = {
    val resultToTakeParamsFrom = testData.project1Rule1Results.aggregation1Result
    val authContext = TestAuthContext(primaryProjectId = resultToTakeParamsFrom.projectId)
    val pageSize = 2
    val numberOfPages = 3

    val firstPageNumber = 1
    val firstPagePath =
      aggregationResultsEndpointPath(resultToTakeParamsFrom.aggregationRuleId) + aggregationResultsQueryString(
        resultToTakeParamsFrom.windowRangeStart,
        orderBy,
        positionType,
        pageSize,
        firstPageNumber,
        countPages = Some(true))
    sendRequestAndReturnPage(firstPagePath, authContext) mustBe PaginatedResult[AggregationResult](
      pageNumber = firstPageNumber,
      numberOfPages = Some(numberOfPages),
      pageSize = pageSize,
      results = Seq(res1, res2))

    val secondPageNumber = 2
    val secondPagePath =
      aggregationResultsEndpointPath(resultToTakeParamsFrom.aggregationRuleId) + aggregationResultsQueryString(
        resultToTakeParamsFrom.windowRangeStart,
        orderBy,
        positionType,
        pageSize,
        secondPageNumber,
        countPages = Some(true))
    sendRequestAndReturnPage(secondPagePath, authContext) mustBe PaginatedResult[AggregationResult](
      pageNumber = secondPageNumber,
      numberOfPages = Some(numberOfPages),
      pageSize = pageSize,
      results = Seq(res3, res4))

    val lastPageNumber = 3
    val lastPagePath =
      aggregationResultsEndpointPath(resultToTakeParamsFrom.aggregationRuleId) + aggregationResultsQueryString(
        resultToTakeParamsFrom.windowRangeStart,
        orderBy,
        positionType,
        pageSize,
        lastPageNumber,
        countPages = Some(true))
    sendRequestAndReturnPage(lastPagePath, authContext) mustBe PaginatedResult[AggregationResult](
      pageNumber = lastPageNumber,
      numberOfPages = Some(numberOfPages),
      pageSize = pageSize,
      results = Seq(res5))
  }

  private def requestWithParamValuesBasedOnResult(
      result: AggregationResultFromEvent,
      pageSize: Int,
      pageNumber: Int): FakeRequest[AnyContentAsEmpty.type] = {
    val path =
      aggregationResultsEndpointPath(result.aggregationRuleId) + aggregationResultsQueryString(
        result.windowRangeStart,
        testOrderBy,
        PositionType.DenseRank,
        pageSize,
        pageNumber)
    FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
  }

  private def asPaginated(
      pageNumber: Int,
      pageSize: Int,
      numberOfPages: Option[Int],
      results: AggregationResult*): PaginatedResult[AggregationResult] =
    PaginatedResult[AggregationResult](
      pageNumber = pageNumber,
      numberOfPages = numberOfPages,
      pageSize = pageSize,
      results = results)
}
