package stella.achievement.it.routes

import play.api.mvc.AnyContentAsEmpty
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.http.AggregationWindow
import stella.common.http.PaginatedResult
import stella.common.models.Ids.ProjectId

import stella.achievement.TestConstants.Endpoint._
import stella.achievement.it.utils
import stella.achievement.it.utils.TestAuthContext
import stella.achievement.models.AchievementEvent
import stella.achievement.models.AchievementEventEntityWithActionDetails
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId
import stella.achievement.models.OrderByDirection
import stella.achievement.models.OrderByDirection.Asc
import stella.achievement.models.OrderByFilter
import stella.achievement.models.OrderByFilters
import stella.achievement.models.OrderByType
import stella.achievement.models.OrderByType.AchievementDate
import stella.achievement.models.OrderByType.FieldValue

trait GetAchievementEventsSpec { self: AchievementRoutesSpecBase =>

  private val testOrderBy: OrderByFilters = OrderByFilters(Seq(OrderByFilter(Asc, AchievementDate)))
  private lazy val testDataEvents1 = testData.project1AchievementRule1Events

  "getAchievementEvents" should {
    "don't return number of pages if not requested" in {
      val existingAchievementEvent = testDataEvents1.achievementEventWithEventForRange1
      val authContext = TestAuthContext(primaryProjectId = existingAchievementEvent.projectId)
      val pageSize = 10
      val pageNumber = 10
      val path =
        achievementEventsEndpointPath(existingAchievementEvent.achievementRuleId) + achievementEventsQueryString(
          existingAchievementEvent.windowRangeStart,
          testOrderBy,
          pageSize,
          pageNumber,
          countPages = Some(false))
      sendRequestAndReturnPage(path, authContext) mustBe PaginatedResult[AchievementEvent](
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

      def asPaginated(achievementEvent: AchievementEventEntityWithActionDetails): PaginatedResult[AchievementEvent] =
        this.asPaginated(
          pageNumber = pageNumber,
          numberOfPages = None,
          pageSize = pageSize,
          results = achievementEvent.toAchievementEvent)

      val result1 = testData.project1AchievementRule2Events.achievementEventWithEventForRange1
      val request1 = requestWithParamValuesBasedOnAchievementEvent(result1, pageSize, pageNumber)
      sendRequestAndReturnPage(request1, authContext) mustBe asPaginated(result1)

      val result2 = testData.project2AchievementRule1Events.achievementEventWithWebhookWithoutEventForRange1
      val request2 = requestWithParamValuesBasedOnAchievementEvent(result2, pageSize, pageNumber)
      sendRequestAndReturnPage(request2, authContext2) mustBe asPaginated(result2)
    }

    "properly return results for different windows" in {
      val authContext = TestAuthContext(primaryProjectId = testData.projectId1)
      val pageSize = 10
      val pageNumber = 1

      def sendRequestWithParamValuesBasedOnAchievementEvent(
          achievementEvent: AchievementEventEntityWithActionDetails): PaginatedResult[AchievementEvent] = {
        val request = requestWithParamValuesBasedOnAchievementEvent(achievementEvent, pageSize, pageNumber)
        sendRequestAndReturnPage(request, authContext)
      }

      def asPaginated(results: AchievementEvent*): PaginatedResult[AchievementEvent] =
        this.asPaginated(pageNumber = pageNumber, numberOfPages = None, pageSize = pageSize, results = results: _*)

      val resultForWindow1 = testDataEvents1.achievementEventWithEventForRange1
      sendRequestWithParamValuesBasedOnAchievementEvent(resultForWindow1) mustBe asPaginated(
        resultForWindow1.toAchievementEvent,
        testDataEvents1.achievementEventWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithoutEventForRange1.toAchievementEvent)

      val resultForWindow2 = testDataEvents1.achievementEventWithEventForRange2
      sendRequestWithParamValuesBasedOnAchievementEvent(resultForWindow2) mustBe asPaginated(
        resultForWindow2.toAchievementEvent)

      val resultForWindow3 = testDataEvents1.achievementEventWithWebhookWithEventForRange3
      sendRequestWithParamValuesBasedOnAchievementEvent(resultForWindow3) mustBe asPaginated(
        resultForWindow3.toAchievementEvent)

      val resultForWindow4 = testDataEvents1.achievementEventWithWebhookWithoutEventForRange4
      sendRequestWithParamValuesBasedOnAchievementEvent(resultForWindow4) mustBe asPaginated(
        resultForWindow4.toAchievementEvent)
    }

    "properly support pagination" in {
      val resultToTakeParamsFrom = testDataEvents1.achievementEventWithEventForRange1
      val authContext = TestAuthContext(primaryProjectId = resultToTakeParamsFrom.projectId)

      def sendRequestForPageNumberAndPageSize(pageNumber: Int, pageSize: Int): PaginatedResult[AchievementEvent] = {
        val path =
          achievementEventsEndpointPath(resultToTakeParamsFrom.achievementRuleId) + achievementEventsQueryString(
            resultToTakeParamsFrom.windowRangeStart,
            testOrderBy,
            pageSize,
            pageNumber,
            countPages = Some(true))
        sendRequestAndReturnPage(path, authContext)
      }

      sendRequestForPageNumberAndPageSize(pageNumber = 1, pageSize = 2) mustBe asPaginated(
        pageNumber = 1,
        pageSize = 2,
        numberOfPages = Some(3),
        testDataEvents1.achievementEventWithEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithEvent2ForRange1.toAchievementEvent)

      sendRequestForPageNumberAndPageSize(pageNumber = 2, pageSize = 2) mustBe asPaginated(
        pageNumber = 2,
        pageSize = 2,
        numberOfPages = Some(3),
        testDataEvents1.achievementEventWithWebhookWithEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEvent2ForRange1.toAchievementEvent)

      sendRequestForPageNumberAndPageSize(pageNumber = 3, pageSize = 2) mustBe asPaginated(
        pageNumber = 3,
        pageSize = 2,
        numberOfPages = Some(3),
        testDataEvents1.achievementEventWithWebhookWithoutEventForRange1.toAchievementEvent)

      sendRequestForPageNumberAndPageSize(pageNumber = 4, pageSize = 2) mustBe asPaginated(
        pageNumber = 4,
        pageSize = 2,
        numberOfPages = Some(3))

      sendRequestForPageNumberAndPageSize(pageNumber = 1, pageSize = 3) mustBe asPaginated(
        pageNumber = 1,
        pageSize = 3,
        numberOfPages = Some(2),
        testDataEvents1.achievementEventWithEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEventForRange1.toAchievementEvent)

      sendRequestForPageNumberAndPageSize(pageNumber = 2, pageSize = 3) mustBe asPaginated(
        pageNumber = 2,
        pageSize = 3,
        numberOfPages = Some(2),
        testDataEvents1.achievementEventWithWebhookWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithoutEventForRange1.toAchievementEvent)
    }

    "properly support filtering by group by field value" in {
      val existingAchievementEvent = testDataEvents1.achievementEventWithEvent2ForRange1
      val authContext = TestAuthContext(primaryProjectId = existingAchievementEvent.projectId)
      val pageSize = 10
      val pageNumber = 1
      val path =
        achievementEventsEndpointPath(existingAchievementEvent.achievementRuleId) + achievementEventsQueryString(
          existingAchievementEvent.windowRangeStart,
          testOrderBy,
          pageSize,
          pageNumber,
          groupByFieldValue = Some(existingAchievementEvent.groupByFieldValue))
      sendRequestAndReturnPage(path, authContext) mustBe PaginatedResult[AchievementEvent](
        pageNumber = pageNumber,
        numberOfPages = None,
        pageSize = pageSize,
        results = List(existingAchievementEvent.toAchievementEvent))
    }

    "properly support ordering by FieldValue ASC" in {
      testOrderByInGetAchievementEventsForProject1Rule1(
        OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, FieldValue))),
        testDataEvents1.achievementEventWithWebhookWithoutEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithEventForRange1.toAchievementEvent)
    }

    "properly support ordering by FieldValue DESC" in {
      testOrderByInGetAchievementEventsForProject1Rule1(
        OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.FieldValue))),
        testDataEvents1.achievementEventWithEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithoutEventForRange1.toAchievementEvent)
    }

    "properly support ordering by AchievementDate ASC" in {
      testOrderByInGetAchievementEventsForProject1Rule1(
        OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.AchievementDate))),
        testDataEvents1.achievementEventWithEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithoutEventForRange1.toAchievementEvent)
    }

    "properly support ordering by AchievementDate DESC" in {
      testOrderByInGetAchievementEventsForProject1Rule1(
        OrderByFilters(Seq(OrderByFilter(OrderByDirection.Desc, OrderByType.AchievementDate))),
        testDataEvents1.achievementEventWithWebhookWithoutEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithWebhookWithEventForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithEvent2ForRange1.toAchievementEvent,
        testDataEvents1.achievementEventWithEventForRange1.toAchievementEvent)
    }

    "return empty collection for project without the achievements stored" in {
      val existingAchievementEvent = testDataEvents1.achievementEventWithEventForRange1
      val otherProjectPublicId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = otherProjectPublicId)
      val pageSize = 3
      val pageNumber = 2
      val path =
        achievementEventsEndpointPath(existingAchievementEvent.achievementRuleId) + achievementEventsQueryString(
          existingAchievementEvent.windowRangeStart,
          testOrderBy,
          pageSize,
          pageNumber,
          countPages = Some(true))
      sendRequestAndReturnPage(path, authContext) mustBe PaginatedResult[AchievementEvent](
        pageNumber = pageNumber,
        numberOfPages = Some(0),
        pageSize = pageSize,
        results = Nil)
    }

    "return empty collection for achievement rule without the achievements stored" in {
      val existingAchievementEvent = testDataEvents1.achievementEventWithEventForRange1
      val pageSize = 3
      val pageNumber = 2
      val authContext = TestAuthContext(primaryProjectId = existingAchievementEvent.projectId)
      val otherAchievementConfigurationRulePublicId = AchievementConfigurationRulePublicId.random()
      val path =
        achievementEventsEndpointPath(otherAchievementConfigurationRulePublicId) + achievementEventsQueryString(
          existingAchievementEvent.windowRangeStart,
          testOrderBy,
          pageSize,
          pageNumber,
          countPages = Some(true))
      sendRequestAndReturnPage(path, authContext) mustBe PaginatedResult[AchievementEvent](
        pageNumber = pageNumber,
        numberOfPages = Some(0),
        pageSize = pageSize,
        results = Nil)
    }

    "return cached data" in {
      // GIVEN: one entry for an aggregation
      val projectId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = projectId)
      val event1 = testDataEvents1.achievementEventWithEventForRange1.copy(projectId = projectId)
      testData.storeNewEvent(event1, achievementModule.achievementEventRepository, awaitTimeout)
      val path = achievementEventsEndpointPath(event1.achievementRuleId) + achievementEventsQueryString(
        windowRangeStart = event1.windowRangeStart,
        orderBy = testOrderBy,
        pageSize = 10,
        pageNumber = 1)
      val expectedPage =
        PaginatedResult(pageNumber = 1, numberOfPages = None, pageSize = 10, results = Seq(event1.toAchievementEvent))
      sendRequestAndReturnPage(path, authContext) mustBe expectedPage
      // WHEN: the second entry is stored
      val event2 = testDataEvents1.achievementEventWithWebhookWithEventForRange1.copy(projectId = projectId)
      testData.storeNewEvent(event2, achievementModule.achievementEventRepository, awaitTimeout)
      // THEN: other request shows that there are two entries
      val windowsPath = aggregationWindowsEndpointPath(event1.achievementRuleId)
      sendRequestAndReturnAggregationWindows(windowsPath, authContext) mustBe Seq(
        AggregationWindow(2, event1.windowRangeStart, event1.windowRangeEnd))
      // WHEN: we send another GET request like the first one
      val newPage = sendRequestAndReturnPage(path, authContext)
      // THEN: we got an older, already cached result
      newPage mustBe expectedPage
    }
  }

  private def testOrderByInGetAchievementEventsForProject1Rule1(
      orderBy: OrderByFilters,
      res1: AchievementEvent,
      res2: AchievementEvent,
      res3: AchievementEvent,
      res4: AchievementEvent,
      res5: AchievementEvent) = {
    val resultToTakeParamsFrom = testDataEvents1.achievementEventWithEventForRange1
    val authContext = TestAuthContext(primaryProjectId = resultToTakeParamsFrom.projectId)
    val pageSize = 2
    val numberOfPages = 3

    val firstPageNumber = 1
    val firstPagePath =
      achievementEventsEndpointPath(resultToTakeParamsFrom.achievementRuleId) + achievementEventsQueryString(
        resultToTakeParamsFrom.windowRangeStart,
        orderBy,
        pageSize,
        firstPageNumber,
        countPages = Some(true))
    sendRequestAndReturnPage(firstPagePath, authContext) mustBe PaginatedResult[AchievementEvent](
      pageNumber = firstPageNumber,
      numberOfPages = Some(numberOfPages),
      pageSize = pageSize,
      results = Seq(res1, res2))

    val secondPageNumber = 2
    val secondPagePath =
      achievementEventsEndpointPath(resultToTakeParamsFrom.achievementRuleId) + achievementEventsQueryString(
        resultToTakeParamsFrom.windowRangeStart,
        orderBy,
        pageSize,
        secondPageNumber,
        countPages = Some(true))
    sendRequestAndReturnPage(secondPagePath, authContext) mustBe PaginatedResult[AchievementEvent](
      pageNumber = secondPageNumber,
      numberOfPages = Some(numberOfPages),
      pageSize = pageSize,
      results = Seq(res3, res4))

    val lastPageNumber = 3
    val lastPagePath =
      achievementEventsEndpointPath(resultToTakeParamsFrom.achievementRuleId) + achievementEventsQueryString(
        resultToTakeParamsFrom.windowRangeStart,
        orderBy,
        pageSize,
        lastPageNumber,
        countPages = Some(true))
    sendRequestAndReturnPage(lastPagePath, authContext) mustBe PaginatedResult[AchievementEvent](
      pageNumber = lastPageNumber,
      numberOfPages = Some(numberOfPages),
      pageSize = pageSize,
      results = Seq(res5))
  }

  private def requestWithParamValuesBasedOnAchievementEvent(
      achievementEvent: AchievementEventEntityWithActionDetails,
      pageSize: Int,
      pageNumber: Int): FakeRequest[AnyContentAsEmpty.type] = {
    val path =
      achievementEventsEndpointPath(achievementEvent.achievementRuleId) + achievementEventsQueryString(
        achievementEvent.windowRangeStart,
        testOrderBy,
        pageSize,
        pageNumber)
    FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
  }

  private def asPaginated(
      pageNumber: Int,
      pageSize: Int,
      numberOfPages: Option[Int],
      results: AchievementEvent*): PaginatedResult[AchievementEvent] =
    PaginatedResult[AchievementEvent](
      pageNumber = pageNumber,
      numberOfPages = numberOfPages,
      pageSize = pageSize,
      results = results)
}
