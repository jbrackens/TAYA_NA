package stella.leaderboard.server.it.routes

import java.util.UUID

import stella.common.models.Ids.ProjectId

import stella.leaderboard.it.utils.TestAuthContext
import stella.leaderboard.models.AggregationResultFromEvent
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.Ids.AggregationRuleId
import stella.leaderboard.models.OrderByDirection
import stella.leaderboard.models.OrderByFilter
import stella.leaderboard.models.OrderByFilters
import stella.leaderboard.models.OrderByType
import stella.leaderboard.models.PositionType
import stella.leaderboard.models._
import stella.leaderboard.server.routes.TestConstants.Endpoint.aggregationWindowsEndpointPath
import stella.leaderboard.server.routes.TestConstants.Endpoint.compareAggregationResultsEndpointPath
import stella.leaderboard.server.routes.TestConstants.Endpoint.compareAggregationResultsQueryString

trait CompareAggregationResultsSpec { self: LeaderboardRoutesSpecBase =>

  "compareAggregationResults" should {
    "properly support ordering by Min ASC for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result5))
    }

    "properly support ordering by Min DESC for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Min))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2))
    }

    "properly support ordering by Max ASC for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Max))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2))
    }

    "properly support ordering by Max DESC for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Max))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result5))
    }

    "properly support ordering by Count ASC for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result2,
        pos2 = testData.project1Rule1Results.aggregation1Result,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result4,
        positionType = PositionType.DenseRank)
    }

    "properly support ordering by Count DESC for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result4,
        pos2 = testData.project1Rule1Results.aggregation1Result5,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.DenseRank)
    }

    "properly support ordering by Sum ASC for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2))
    }

    "properly support ordering by Sum DESC for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Sum))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result3))
    }

    "properly support ordering by field value ASC for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result4,
        pos5 = testData.project1Rule1Results.aggregation1Result5,
        positionType = PositionType.DenseRank)
    }

    "properly support ordering by field value DESC for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result5,
        pos2 = testData.project1Rule1Results.aggregation1Result4,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result2,
        pos5 = testData.project1Rule1Results.aggregation1Result,
        positionType = PositionType.DenseRank)
    }

    "properly support compound ordering for DenseRank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
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
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos5 = Seq(testData.project1Rule1Results.aggregation1Result5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Min DESC for Rank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Min))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Max ASC for Rank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Max))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Max DESC for Rank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Max))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos5 = Seq(testData.project1Rule1Results.aggregation1Result5),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Count ASC for Rank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result2,
        pos2 = testData.project1Rule1Results.aggregation1Result,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result4,
        positionType = PositionType.Rank)
    }

    "properly support ordering by Count DESC for Rank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result4,
        pos2 = testData.project1Rule1Results.aggregation1Result5,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.Rank)
    }

    "properly support ordering by Sum ASC for Rank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result3),
        pos2 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        positionType = PositionType.Rank)
    }

    "properly support ordering by Sum DESC for Rank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Sum))),
        pos1 = Seq(testData.project1Rule1Results.aggregation1Result, testData.project1Rule1Results.aggregation1Result2),
        pos3 = Seq(testData.project1Rule1Results.aggregation1Result4),
        pos4 = Seq(testData.project1Rule1Results.aggregation1Result5),
        pos5 = Seq(testData.project1Rule1Results.aggregation1Result3),
        positionType = PositionType.Rank)
    }

    "properly support ordering by field value ASC for Rank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result4,
        pos5 = testData.project1Rule1Results.aggregation1Result5,
        positionType = PositionType.Rank)
    }

    "properly support ordering by field value DESC for Rank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result5,
        pos2 = testData.project1Rule1Results.aggregation1Result4,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result2,
        pos5 = testData.project1Rule1Results.aggregation1Result,
        positionType = PositionType.Rank)
    }

    "properly support compound ordering for Rank" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
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
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result4,
        pos5 = testData.project1Rule1Results.aggregation1Result5,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Min DESC for RowNumber" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Min))),
        pos1 = testData.project1Rule1Results.aggregation1Result5,
        pos2 = testData.project1Rule1Results.aggregation1Result4,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Max ASC for RowNumber" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Max))),
        pos1 = testData.project1Rule1Results.aggregation1Result5,
        pos2 = testData.project1Rule1Results.aggregation1Result4,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Max DESC for RowNumber" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Max))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result4,
        pos5 = testData.project1Rule1Results.aggregation1Result5,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Count ASC for RowNumber" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result2,
        pos2 = testData.project1Rule1Results.aggregation1Result,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result4,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Count DESC for RowNumber" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Count))),
        pos1 = testData.project1Rule1Results.aggregation1Result4,
        pos2 = testData.project1Rule1Results.aggregation1Result5,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Sum ASC for RowNumber" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum))),
        pos1 = testData.project1Rule1Results.aggregation1Result3,
        pos2 = testData.project1Rule1Results.aggregation1Result5,
        pos3 = testData.project1Rule1Results.aggregation1Result4,
        pos4 = testData.project1Rule1Results.aggregation1Result,
        pos5 = testData.project1Rule1Results.aggregation1Result2,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by Sum DESC for RowNumber" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.Sum))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result4,
        pos4 = testData.project1Rule1Results.aggregation1Result5,
        pos5 = testData.project1Rule1Results.aggregation1Result3,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by field value ASC for RowNumber" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result,
        pos2 = testData.project1Rule1Results.aggregation1Result2,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result4,
        pos5 = testData.project1Rule1Results.aggregation1Result5,
        positionType = PositionType.RowNumber)
    }

    "properly support ordering by field value DESC for RowNumber" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
        orderBy = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.FieldValue))),
        pos1 = testData.project1Rule1Results.aggregation1Result5,
        pos2 = testData.project1Rule1Results.aggregation1Result4,
        pos3 = testData.project1Rule1Results.aggregation1Result3,
        pos4 = testData.project1Rule1Results.aggregation1Result2,
        pos5 = testData.project1Rule1Results.aggregation1Result,
        positionType = PositionType.RowNumber)
    }

    "properly support compound ordering for RowNumber" in {
      testOrderByInCompareAggregationResultsForProject1Rule1(
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

    "return empty collection for only non-existing field values" in {
      val existingResult = testData.project1Rule1Results.aggregation1Result
      val authContext = TestAuthContext(primaryProjectId = existingResult.projectId)
      val path =
        compareAggregationResultsEndpointPath(existingResult.aggregationRuleId) + compareAggregationResultsQueryString(
          existingResult.windowRangeStart,
          orderBy = testOrderBy,
          positionType = PositionType.DenseRank,
          fieldValues = Seq(UUID.randomUUID().toString, UUID.randomUUID().toString))
      sendRequestToCompareValues(path, authContext) mustBe Nil
    }

    "return empty collection for project without the results stored" in {
      val existingResultForSomeProject = testData.project1Rule1Results.aggregation1Result
      val otherProjectId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = otherProjectId)
      val path =
        compareAggregationResultsEndpointPath(
          existingResultForSomeProject.aggregationRuleId) + compareAggregationResultsQueryString(
          existingResultForSomeProject.windowRangeStart,
          orderBy = testOrderBy,
          positionType = PositionType.DenseRank,
          fieldValues = Seq(existingResultForSomeProject.groupByFieldValue))
      sendRequestToCompareValues(path, authContext) mustBe Nil
    }

    "return empty collection for aggregation rule without the results stored" in {
      val existingResultForSomeAggregationRule = testData.project1Rule1Results.aggregation1Result
      val authContext = TestAuthContext(primaryProjectId = existingResultForSomeAggregationRule.projectId)
      val otherAggregationRuleId = AggregationRuleId.random()
      val path =
        compareAggregationResultsEndpointPath(otherAggregationRuleId) + compareAggregationResultsQueryString(
          existingResultForSomeAggregationRule.windowRangeStart,
          orderBy = testOrderBy,
          positionType = PositionType.DenseRank,
          fieldValues = Seq(existingResultForSomeAggregationRule.groupByFieldValue))
      sendRequestToCompareValues(path, authContext) mustBe Nil
    }

    "return cached data" in {
      // GIVEN: one entry for an aggregation
      val projectId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = projectId)
      val res1 =
        testData.storeNewResult1ForProject(projectId, leaderboardModule.aggregationResultRepository, awaitTimeout)
      val path = compareAggregationResultsEndpointPath(res1.aggregationRuleId) + compareAggregationResultsQueryString(
        windowRangeStart = res1.windowRangeStart,
        orderBy = testOrderBy,
        positionType = PositionType.DenseRank,
        fieldValues = Seq(res1.groupByFieldValue, testData.project1Rule1Results.aggregation1Result2.groupByFieldValue))
      val expectedResults = Seq(res1.toAggregationResult(position = 1))
      sendRequestToCompareValues(path, authContext) mustBe expectedResults
      // WHEN: the second entry is stored
      val _ = testData.storeNewResult2ForProject(projectId, leaderboardModule.aggregationResultRepository, awaitTimeout)
      // THEN: other request shows that there are two entries
      val windowsPath = aggregationWindowsEndpointPath(res1.aggregationRuleId)
      sendRequestAndReturnAggregationWindows(windowsPath, authContext) mustBe Seq(
        AggregationWindow(2, res1.windowRangeStart, res1.windowRangeEnd))
      // WHEN: we send another GET request like the first one
      val newResults = sendRequestToCompareValues(path, authContext)
      // THEN: we got an older, already cached result
      newResults mustBe expectedResults
    }
  }

  private def testOrderByInCompareAggregationResultsForProject1Rule1(
      orderBy: OrderByFilters,
      pos1: AggregationResultFromEvent,
      pos2: AggregationResultFromEvent,
      pos3: AggregationResultFromEvent,
      pos4: AggregationResultFromEvent,
      pos5: AggregationResultFromEvent,
      positionType: PositionType): Unit =
    testOrderByInCompareAggregationResultsForProject1Rule1(
      orderBy,
      Seq(pos1),
      Seq(pos2),
      Seq(pos3),
      Seq(pos4),
      Seq(pos5),
      positionType)

  private def testOrderByInCompareAggregationResultsForProject1Rule1(
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

    val path1 =
      compareAggregationResultsEndpointPath(
        resultToTakeParamsFrom.aggregationRuleId) + compareAggregationResultsQueryString(
        resultToTakeParamsFrom.windowRangeStart,
        orderBy,
        positionType,
        fieldValues = (pos1 ++ pos3 ++ pos5).map(_.groupByFieldValue))
    val expectedResult1 = resultsForPosition1 ++ resultsForPosition3 ++ resultsForPosition5
    sendRequestToCompareValues(path1, authContext) mustBe expectedResult1

    val nonExistingField1 = UUID.randomUUID().toString
    val nonExistingField2 = UUID.randomUUID().toString
    val path2 =
      compareAggregationResultsEndpointPath(
        resultToTakeParamsFrom.aggregationRuleId) + compareAggregationResultsQueryString(
        resultToTakeParamsFrom.windowRangeStart,
        orderBy,
        positionType,
        fieldValues = nonExistingField1 +: (pos2 ++ pos4).map(_.groupByFieldValue) :+ nonExistingField2)
    val expectedResult2 = resultsForPosition2 ++ resultsForPosition4
    sendRequestToCompareValues(path2, authContext) mustBe expectedResult2
    ()
  }
}
