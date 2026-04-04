package stella.achievement.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import org.scalacheck.Arbitrary
import play.api.mvc.AnyContentAsEmpty
import play.api.test.Helpers._
import play.api.test._

import stella.common.http.AggregationWindow
import stella.common.http.PaginatedResult
import stella.common.http.Response
import stella.common.models.Ids.ProjectId

import stella.achievement.SampleObjectFactory._
import stella.achievement.TestConstants.Endpoint._
import stella.achievement.config.CacheConfig
import stella.achievement.models.AchievementEvent
import stella.achievement.models.BaseFetchAchievementEventsParams
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId
import stella.achievement.routes.ResponseFormats._
import stella.achievement.routes.ResponseFormats.errorOutputFormats._
import stella.achievement.routes.gen.Generators._
import stella.achievement.services.AchievementBoundedContext.AchievementEventsReadPermission
import stella.achievement.services.AchievementBoundedContext.AggregationWindowsReadPermission

class AchievementEventsWithMockedBoundedContextAndOutdatedCacheSpec extends RoutesWithMockedBoundedContextSpecBase {

  override protected lazy val cacheConfigOverride: Option[CacheConfig] = Some(
    CacheConfig(windowsTimeout = 0.seconds, achievementEventsTimeout = 0.seconds))

  "getAggregationWindows" should {
    "properly return results when cache timed out" in {
      forAll(aggregationWindowsGen) { aggregationWindows =>
        checkExpectedPermission(AggregationWindowsReadPermission)
        val achievementRuleId = AchievementConfigurationRulePublicId.random()
        (boundedContext
          .getAggregationWindows(_: ProjectId, _: AchievementConfigurationRulePublicId)(_: ExecutionContext))
          .expects(testProjectId, achievementRuleId, *)
          .returning(Future.successful(aggregationWindows))
          .once()
        val aggregationWindowsPath = aggregationWindowsEndpointPath(achievementRuleId)
        val request = FakeRequest(GET, aggregationWindowsPath, headersWithFakeJwt, AnyContentAsEmpty)
        val res1 = route(app, request).value
        val aggregationWindowsFromRes1 = withOkStatusAndJsonContentAs[Response[Seq[AggregationWindow]]](res1)
        checkExpectedPermission(AggregationWindowsReadPermission)
        // WHEN: we repeat a request and time moved further than cache timeout
        testClock.moveTime()
        (boundedContext
          .getAggregationWindows(_: ProjectId, _: AchievementConfigurationRulePublicId)(_: ExecutionContext))
          .expects(testProjectId, achievementRuleId, *)
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

  "getAchievementEvents" should {
    "properly return page content when cache timed out" in {
      forAll(
        baseFetchAchievementEventsParamsGen(testProjectId),
        pageSizeGen,
        pageNumberGen,
        Arbitrary.arbBool.arbitrary) { (baseParams, pageSize, pageNumber, countPages) =>
        val achievementEventsPath = achievementEventsEndpointPath(baseParams.achievementRuleId)
        val queryString = achievementEventsQueryString(baseParams, pageSize, pageNumber, Some(countPages))
        val path = achievementEventsPath + queryString
        checkExpectedPermission(AchievementEventsReadPermission)
        val expectedBaseParams = baseParams.withRemovedOverriddenFilters
        (boundedContext
          .getAchievementEventsPage(_: BaseFetchAchievementEventsParams, _: Int, _: Int, _: Boolean)(
            _: ExecutionContext))
          .expects(expectedBaseParams, pageSize, pageNumber, countPages, *)
          .returning(Future.successful(achievementEventsPage))
          .once()
        val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
        val res1 = route(app, request).value
        val pageFromRes1 = withOkStatusAndJsonContentAs[Response[PaginatedResult[AchievementEvent]]](res1)
        checkExpectedPermission(AchievementEventsReadPermission)
        // WHEN: we repeat a request and time moved further than cache timeout
        testClock.moveTime()
        (boundedContext
          .getAchievementEventsPage(_: BaseFetchAchievementEventsParams, _: Int, _: Int, _: Boolean)(
            _: ExecutionContext))
          .expects(expectedBaseParams, pageSize, pageNumber, countPages, *)
          .returning(Future.successful(achievementEventsPage))
          .once()
        val res2 = route(app, request).value
        // THEN: getAchievementEventsPage is called once again
        val pageFromRes2 = withOkStatusAndJsonContentAs[Response[PaginatedResult[AchievementEvent]]](res2)
        pageFromRes2 mustBe Response.asSuccess(achievementEventsPage)
        pageFromRes2 mustBe pageFromRes1
      }
    }
  }
}
