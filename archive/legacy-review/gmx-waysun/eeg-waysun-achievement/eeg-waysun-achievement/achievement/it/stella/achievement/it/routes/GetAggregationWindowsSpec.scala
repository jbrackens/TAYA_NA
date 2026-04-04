package stella.achievement.it.routes

import play.api.mvc.AnyContentAsEmpty
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.http.AggregationWindow
import stella.common.models.Ids.ProjectId

import stella.achievement.TestConstants.Endpoint.achievementEventsEndpointPath
import stella.achievement.TestConstants.Endpoint.achievementEventsQueryString
import stella.achievement.TestConstants.Endpoint.aggregationWindowsEndpointPath
import stella.achievement.it.utils.TestAuthContext
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId
import stella.achievement.models.OrderByDirection.Asc
import stella.achievement.models.OrderByFilter
import stella.achievement.models.OrderByFilters
import stella.achievement.models.OrderByType.FieldValue

trait GetAggregationWindowsSpec { self: AchievementRoutesSpecBase =>

  "getAggregationWindows" should {
    "return proper existing results" in {
      val authContextProject1 = TestAuthContext(primaryProjectId = testData.projectId1)
      val authContextProject2 = TestAuthContext(primaryProjectId = testData.projectId2)
      val aggregationWindowsPath = aggregationWindowsEndpointPath(testData.achievementRuleId1)
      val aggregationWindowsPath2 = aggregationWindowsEndpointPath(testData.achievementRuleId2)

      val requestForAggregationRule1 =
        FakeRequest(GET, aggregationWindowsPath, headersWithJwt, AnyContentAsEmpty)
      val requestForAggregationRule2 =
        FakeRequest(GET, aggregationWindowsPath2, headersWithJwt, AnyContentAsEmpty)

      val eventInAggregation4 = testData.project1AchievementRule1Events.achievementEventWithWebhookWithoutEventForRange4
      val eventInAggregation3 = testData.project1AchievementRule1Events.achievementEventWithWebhookWithEventForRange3
      val eventInAggregation2 = testData.project1AchievementRule1Events.achievementEventWithEventForRange2
      val eventInAggregation1 = testData.project1AchievementRule1Events.achievementEventWithWebhookWithoutEventForRange1

      sendRequestAndReturnAggregationWindows(requestForAggregationRule1, authContextProject1) mustBe Seq(
        AggregationWindow(elements = 1, eventInAggregation2.windowRangeStart, eventInAggregation2.windowRangeEnd),
        AggregationWindow(elements = 1, eventInAggregation3.windowRangeStart, eventInAggregation3.windowRangeEnd),
        AggregationWindow(elements = 1, eventInAggregation4.windowRangeStart, eventInAggregation4.windowRangeEnd),
        AggregationWindow(elements = 5, eventInAggregation1.windowRangeStart, eventInAggregation1.windowRangeEnd))

      val eventInAggregation1ForRule2 = testData.project1AchievementRule2Events.achievementEventWithEventForRange1
      sendRequestAndReturnAggregationWindows(requestForAggregationRule1, authContextProject2) mustBe Seq(
        AggregationWindow(
          elements = 1,
          eventInAggregation1ForRule2.windowRangeStart,
          eventInAggregation1ForRule2.windowRangeEnd))

      val eventInAggregation1ForProject2 =
        testData.project2AchievementRule1Events.achievementEventWithWebhookWithoutEventForRange1
      sendRequestAndReturnAggregationWindows(requestForAggregationRule2, authContextProject1) mustBe Seq(
        AggregationWindow(
          elements = 1,
          eventInAggregation1ForProject2.windowRangeStart,
          eventInAggregation1ForProject2.windowRangeEnd))
    }

    "return empty collection for project without the results stored" in {
      val otherProjectPublicId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = otherProjectPublicId)
      val aggregationWindowsPath = aggregationWindowsEndpointPath(testData.achievementRuleId1)
      val request = FakeRequest(GET, aggregationWindowsPath, headersWithJwt, AnyContentAsEmpty)
      sendRequestAndReturnAggregationWindows(request, authContext) mustBe Nil
    }

    "return empty collection for aggregation rule without the results stored" in {
      val authContextProject1 = TestAuthContext(primaryProjectId = testData.projectId1)
      val otherAchievementRuleId = AchievementConfigurationRulePublicId.random()
      val aggregationWindowsPath = aggregationWindowsEndpointPath(otherAchievementRuleId)
      val request = FakeRequest(GET, aggregationWindowsPath, headersWithJwt, AnyContentAsEmpty)
      sendRequestAndReturnAggregationWindows(request, authContextProject1) mustBe Nil
    }

    "return cached data" in {
      // GIVEN: one entry for an aggregation
      val projectId = ProjectId.random()
      val authContext = TestAuthContext(primaryProjectId = projectId)
      val event1 =
        testData.project1AchievementRule1Events.achievementEventWithEventForRange1.copy(projectId = projectId)
      testData.storeNewEvent(event1, achievementModule.achievementEventRepository, awaitTimeout)
      val path = aggregationWindowsEndpointPath(event1.achievementRuleId)
      val expectedWindows = Seq(AggregationWindow(1, event1.windowRangeStart, event1.windowRangeEnd))
      sendRequestAndReturnAggregationWindows(path, authContext) mustBe expectedWindows
      // WHEN: the second entry is stored
      val event2 =
        testData.project1AchievementRule1Events.achievementEventWithWebhookWithEventForRange1.copy(projectId =
          projectId)
      testData.storeNewEvent(event2, achievementModule.achievementEventRepository, awaitTimeout)
      // THEN: other request shows that there are two entries
      val resultsPath = achievementEventsEndpointPath(event2.achievementRuleId) + achievementEventsQueryString(
        groupByFieldValue = None,
        windowRangeStart = event1.windowRangeStart,
        orderBy = OrderByFilters(Seq(OrderByFilter(Asc, FieldValue))),
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
