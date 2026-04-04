package stella.leaderboard.server.it.routes

import java.util.UUID

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
import stella.leaderboard.server.routes.TestConstants.Endpoint.aggregationResultNeighborsEndpointPath
import stella.leaderboard.server.routes.TestConstants.Endpoint.aggregationResultNeighborsQueryString
import stella.leaderboard.server.routes.TestConstants.Endpoint.aggregationWindowsEndpointPath

trait GetAggregationResultNeighborsSpec { self: LeaderboardRoutesSpecBase =>

  "getAggregationResultNeighbors" should {
    "return proper number of neighbors" in {
      val resultsWrapper = testData.project1Rule1Results
      val resultToTakeParamsFrom = resultsWrapper.aggregation1Result
      val authContext = TestAuthContext(primaryProjectId = resultToTakeParamsFrom.projectId)

      def sendRequest(neighborsSize: Int, fieldValue: String): Seq[AggregationResult] = {
        val path =
          aggregationResultNeighborsEndpointPath(
            resultToTakeParamsFrom.aggregationRuleId) + aggregationResultNeighborsQueryString(
            resultToTakeParamsFrom.windowRangeStart,
            testOrderBy,
            PositionType.DenseRank,
            neighborsSize,
            fieldValue)
        sendRequestAndReturnNeighbors(path, authContext)
      }

      val res1 = resultsWrapper.aggregation1Result.toAggregationResult(position = 1)
      val res2 = resultsWrapper.aggregation1Result2.toAggregationResult(position = 1)
      val res3 = resultsWrapper.aggregation1Result3.toAggregationResult(position = 2)
      val res4 = resultsWrapper.aggregation1Result4.toAggregationResult(position = 3)
      val res5 = resultsWrapper.aggregation1Result5.toAggregationResult(position = 4)

      sendRequest(neighborsSize = 1, fieldValue = res1.groupByFieldValue) mustBe Seq(res1, res2, res3)
      sendRequest(neighborsSize = 2, fieldValue = res1.groupByFieldValue) mustBe Seq(res1, res2, res3, res4)
      sendRequest(neighborsSize = 1, fieldValue = res2.groupByFieldValue) mustBe Seq(res1, res2, res3)
      sendRequest(neighborsSize = 2, fieldValue = res2.groupByFieldValue) mustBe Seq(res1, res2, res3, res4)
      sendRequest(neighborsSize = 2, fieldValue = res3.groupByFieldValue) mustBe Seq(res1, res2, res3, res4, res5)
      sendRequest(neighborsSize = 10, fieldValue = res3.groupByFieldValue) mustBe Seq(res1, res2, res3, res4, res5)
      sendRequest(neighborsSize = 2, fieldValue = res5.groupByFieldValue) mustBe Seq(res3, res4, res5)
    }

    "properly support ordering by Min ASC for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result5))
    }

    "properly support ordering by Min DESC for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Min))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2))
    }

    "properly support ordering by Max ASC for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Max))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2))
    }

    "properly support ordering by Max DESC for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Max))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result5))
    }

    "properly support ordering by Count ASC for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result2,
        pos2 = testData.project1Rule1Results.aggregation1Result,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result4,
        positionType = PositionType.DenseRank)
    }

    "properly support ordering by Count DESC for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result4,
        pos2 = testData.project1Rule1Results.aggregation1Result5,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.DenseRank)
    }

    "properly support ordering by Sum ASC for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2))
    }

    "properly support ordering by Sum DESC for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Sum))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result3))
    }

    "properly support ordering by field value ASC for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result4,
        pos5 = testData.project1Rule1Results.aggregation1Result5,
        positionType = PositionType.DenseRank)
    }

    "properly support ordering by field value DESC for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result5,
        pos2 = testData.project1Rule1Results.aggregation1Result4,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result2,
        pos5 = testData.project1Rule1Results.aggregation1Result,
        positionType = PositionType.DenseRank)
    }

    "properly support compound ordering for DenseRank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(
          Seq(
            OrderByFilter(OrderByDirection.Desc, OrderByType.Sum),
            OrderByFilter(OrderByDirection.Desc, OrderByType.Min),
            OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result2,
        pos2 = testData.project1Rule1Results.aggregation1Result,
        pos3 = testData.project1Rule1Results.aggregation1Result4,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result3,
        positionType = PositionType.DenseRank)
    }

    "properly support ordering by Min ASC for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos5 = Seq(testData.project1Rule1Results.aggregation1Result5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Min DESC for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Min))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Max ASC for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Max))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Max DESC for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Max))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos5 = Seq(testData.project1Rule1Results.aggregation1Result5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Count ASC for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result2,
        pos2 = testData.project1Rule1Results.aggregation1Result,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result4,
        positionType = PositionType.Rank)
    }

    "properly support ordering by Count DESC for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result4,
        pos2 = testData.project1Rule1Results.aggregation1Result5,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.Rank)
    }

    "properly support ordering by Sum ASC for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Sum DESC for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Sum))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos5 = Seq(testData.project1Rule1Results.aggregation1Result3),
        positionType = PositionType.Rank)
    }

    "properly support ordering by field value ASC for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result4,
        pos5 = testData.project1Rule1Results.aggregation1Result5,
        positionType = PositionType.Rank)
    }

    "properly support ordering by field value DESC for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result5,
        pos2 = testData.project1Rule1Results.aggregation1Result4,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result2,
        pos5 = testData.project1Rule1Results.aggregation1Result,
        positionType = PositionType.Rank)
    }

    "properly support compound ordering for Rank" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(
          Seq(
            OrderByFilter(OrderByDirection.Desc, OrderByType.Sum),
            OrderByFilter(OrderByDirection.Desc, OrderByType.Min),
            OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result2,
        pos2 = testData.project1Rule1Results.aggregation1Result,
        pos3 = testData.project1Rule1Results.aggregation1Result4,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result3,
        positionType = PositionType.Rank)
    }

    "properly support ordering by Min ASC for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result4,
        pos5 = testData.project1Rule1Results.aggregation1Result5,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Min DESC for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Min))),
        pos1 = testData.project1Rule1Results.aggregation1Result5,
        pos2 = testData.project1Rule1Results.aggregation1Result4,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Max ASC for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Max))),
        pos1 = testData.project1Rule1Results.aggregation1Result5,
        pos2 = testData.project1Rule1Results.aggregation1Result4,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Max DESC for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Max))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result4,
        pos5 = testData.project1Rule1Results.aggregation1Result5,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Count ASC for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result2,
        pos2 = testData.project1Rule1Results.aggregation1Result,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result4,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Count DESC for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result4,
        pos2 = testData.project1Rule1Results.aggregation1Result5,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Sum ASC for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum))),
        pos1 = testData.project1Rule1Results.aggregation1Result3,
        pos2 = testData.project1Rule1Results.aggregation1Result5,
        pos3 = testData.project1Rule1Results.aggregation1Result4,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Sum DESC for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Sum))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result4,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result3,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by field value ASC for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result4,
        pos5 = testData.project1Rule1Results.aggregation1Result5,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by field value DESC for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result5,
        pos2 = testData.project1Rule1Results.aggregation1Result4,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result2,
        pos5 = testData.project1Rule1Results.aggregation1Result,
        positionType = PositionType.RowNumber)
    }

    "properly support compound ordering for RowNumber" in {
      testOrderByInGetAggregationResultNeighborsForProject1Rule1(
        orderBy = OrderByFilters(
          Seq(
            OrderByFilter(OrderByDirection.Desc, OrderByType.Sum),
            OrderByFilter(OrderByDirection.Desc, OrderByType.Min),
            OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result2,
        pos2 = testData.project1Rule1Results.aggregation1Result,
        pos3 = testData.project1Rule1Results.aggregation1Result4,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result3,
        positionType = PositionType.RowNumber)
    }

    "return empty collection for non-existing field value" in {
      val existingResult = testData.project1Rule1Results.aggregation1Result
      val authContext = TestAuthContext(primaryProjectId = existingResult.projectId)
      val path =
        aggregationResultNeighborsEndpointPath(
          existingResult.aggregationRuleId) + aggregationResultNeighborsQueryString(
          existingResult.windowRangeStart,
          orderBy = testOrderBy,
          positionType = PositionType.DenseRank,
          neighborsSize = 10,
          fieldValue = UUID.randomUUID().toString)
      sendRequestAndReturnNeighbors(path, authContext) mustBe Nil
    }

    "return empty collection for project without the results stored" in {
      val existingResult = testData.project1Rule1Results.aggregation1Result
      val otherProjectId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = otherProjectId)
      val path =
        aggregationResultNeighborsEndpointPath(
          existingResult.aggregationRuleId) + aggregationResultNeighborsQueryString(
          existingResult.windowRangeStart,
          orderBy = testOrderBy,
          positionType = PositionType.DenseRank,
          neighborsSize = 10,
          fieldValue = existingResult.groupByFieldValue)
      sendRequestAndReturnNeighbors(path, authContext) mustBe Nil
    }

    "return empty collection for aggregation rule without the results stored" in {
      val existingResult = testData.project1Rule1Results.aggregation1Result
      val authContext = TestAuthContext(primaryProjectId = existingResult.projectId)
      val otherAggregationRuleId = AggregationRuleId.random()
      val path =
        aggregationResultNeighborsEndpointPath(otherAggregationRuleId) + aggregationResultNeighborsQueryString(
          existingResult.windowRangeStart,
          orderBy = testOrderBy,
          positionType = PositionType.DenseRank,
          neighborsSize = 10,
          fieldValue = existingResult.groupByFieldValue)
      sendRequestAndReturnNeighbors(path, authContext) mustBe Nil
    }

    "return cached data" in {
      // GIVEN: one entry for an aggregation
      val projectId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = projectId)
      val res1 =
        testData.storeNewResult1ForProject(projectId, leaderboardModule.aggregationResultRepository, awaitTimeout)
      val path = aggregationResultNeighborsEndpointPath(res1.aggregationRuleId) + aggregationResultNeighborsQueryString(
        windowRangeStart = res1.windowRangeStart,
        orderBy = testOrderBy,
        positionType = PositionType.DenseRank,
        neighborsSize = 10,
        fieldValue = res1.groupByFieldValue)
      val expectedResults = Seq(res1.toAggregationResult(position = 1))
      sendRequestAndReturnNeighbors(path, authContext) mustBe expectedResults
      // WHEN: the second entry is stored
      val _ = testData.storeNewResult2ForProject(projectId, leaderboardModule.aggregationResultRepository, awaitTimeout)
      // THEN: other request shows that there are two entries
      val windowsPath = aggregationWindowsEndpointPath(res1.aggregationRuleId)
      sendRequestAndReturnAggregationWindows(windowsPath, authContext) mustBe Seq(
        AggregationWindow(2, res1.windowRangeStart, res1.windowRangeEnd))
      // WHEN: we send another GET request like the first one
      val newResults = sendRequestAndReturnNeighbors(path, authContext)
      // THEN: we got an older, already cached result
      newResults mustBe expectedResults
    }
  }

  private def testOrderByInGetAggregationResultNeighborsForProject1Rule1(
      orderBy: OrderByFilters,
      pos1: AggregationResultFromEvent,
      pos2: AggregationResultFromEvent,
      pos3: AggregationResultFromEvent,
      pos4: AggregationResultFromEvent,
      pos5: AggregationResultFromEvent,
      positionType: PositionType): Unit =
    testOrderByInGetAggregationResultNeighborsForProject1Rule1(
      orderBy,
      Seq(pos1),
      Seq(pos2),
      Seq(pos3),
      Seq(pos4),
      Seq(pos5),
      positionType)

  private def testOrderByInGetAggregationResultNeighborsForProject1Rule1(
      orderBy: OrderByFilters,
      pos1: Seq[AggregationResultFromEvent],
      pos2: Seq[AggregationResultFromEvent] = Nil,
      pos3: Seq[AggregationResultFromEvent] = Nil,
      pos4: Seq[AggregationResultFromEvent] = Nil,
      pos5: Seq[AggregationResultFromEvent] = Nil,
      positionType: PositionType = PositionType.DenseRank): Unit = {
    val resultToTakeParamsFrom = testData.project1Rule1Results.aggregation1Result
    val authContext = TestAuthContext(primaryProjectId = resultToTakeParamsFrom.projectId)

    val resultsForPosition1 = pos1.map(_.toAggregationResult(position = 1))
    val resultsForPosition2 = pos2.map(_.toAggregationResult(position = 2))
    val resultsForPosition3 = pos3.map(_.toAggregationResult(position = 3))
    val resultsForPosition4 = pos4.map(_.toAggregationResult(position = 4))
    val resultsForPosition5 = pos5.map(_.toAggregationResult(position = 5))

    pos3.foreach { res =>
      val path =
        aggregationResultNeighborsEndpointPath(
          resultToTakeParamsFrom.aggregationRuleId) + aggregationResultNeighborsQueryString(
          resultToTakeParamsFrom.windowRangeStart,
          orderBy,
          positionType,
          neighborsSize = 1,
          fieldValue = res.groupByFieldValue)
      val expectedResult = resultsForPosition2 ++ resultsForPosition3 ++ resultsForPosition4
      sendRequestAndReturnNeighbors(path, authContext) mustBe expectedResult
    }

    pos3.foreach { res =>
      val path =
        aggregationResultNeighborsEndpointPath(
          resultToTakeParamsFrom.aggregationRuleId) + aggregationResultNeighborsQueryString(
          resultToTakeParamsFrom.windowRangeStart,
          orderBy,
          positionType,
          neighborsSize = 2,
          fieldValue = res.groupByFieldValue)
      val expectedResult =
        resultsForPosition1 ++ resultsForPosition2 ++ resultsForPosition3 ++ resultsForPosition4 ++ resultsForPosition5
      sendRequestAndReturnNeighbors(path, authContext) mustBe expectedResult
    }
  }
}
