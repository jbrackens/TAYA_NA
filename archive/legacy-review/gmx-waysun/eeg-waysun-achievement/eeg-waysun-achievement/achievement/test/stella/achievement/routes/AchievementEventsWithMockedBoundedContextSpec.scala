package stella.achievement.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.scalacheck.Arbitrary
import org.scalamock.matchers.ArgCapture.CaptureOne
import play.api.http.MimeTypes
import play.api.mvc.AnyContentAsEmpty
import play.api.test.Helpers._
import play.api.test._

import stella.common.http.AggregationWindow
import stella.common.http.PaginatedResult
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.models.Ids.ProjectId

import stella.achievement.SampleObjectFactory._
import stella.achievement.TestConstants.Endpoint._
import stella.achievement.TestConstants._
import stella.achievement.models.AchievementEvent
import stella.achievement.models.BaseFetchAchievementEventsParams
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId
import stella.achievement.models.OrderByDirection.Asc
import stella.achievement.models.OrderByDirection.Desc
import stella.achievement.models.OrderByFilter
import stella.achievement.models.OrderByFilters
import stella.achievement.models.OrderByType.AchievementDate
import stella.achievement.models.OrderByType.FieldValue
import stella.achievement.routes.ResponseFormats._
import stella.achievement.routes.ResponseFormats.errorOutputFormats._
import stella.achievement.routes.gen.Generators._
import stella.achievement.services.AchievementBoundedContext.AchievementEventsReadPermission
import stella.achievement.services.AchievementBoundedContext.AggregationWindowsReadPermission

class AchievementEventsWithMockedBoundedContextSpec extends RoutesWithMockedBoundedContextSpecBase {

  private val achievementRuleId = AchievementConfigurationRulePublicId.random()
  private val testOrderBy = OrderByFilters(Seq(OrderByFilter(Asc, AchievementDate)))
  private val achievementEventsPathWithOrderBy =
    s"${achievementEventsEndpointPath(achievementRuleId)}?${QueryParam.orderBy}=${testOrderBy.toQueryParam}"

  "getAggregationWindows" should {
    "return NotFound when aggregation rule id is not UUID" in {
      val request = FakeRequest(GET, s"$achievementBasePath/foo/windows")
      testRequestWithNotFoundResponse(request)
    }

    "properly return results" in {
      forAll(aggregationWindowsGen) { aggregationWindows =>
        checkExpectedPermission(AggregationWindowsReadPermission)
        val ruleId = AchievementConfigurationRulePublicId.random()
        (boundedContext
          .getAggregationWindows(_: ProjectId, _: AchievementConfigurationRulePublicId)(_: ExecutionContext))
          .expects(testProjectId, ruleId, *)
          .returning(Future.successful(aggregationWindows))
          .once()
        val aggregationWindowsPath = aggregationWindowsEndpointPath(ruleId)
        val request = FakeRequest(GET, aggregationWindowsPath, headersWithFakeJwt, AnyContentAsEmpty)
        val res = route(app, request).value
        withOkStatusAndJsonContentAs[Response[Seq[AggregationWindow]]](res) mustBe Response.asSuccess(
          aggregationWindows)
      }
    }

    "properly return cached results" in {
      forAll(aggregationWindowsGen) { aggregationWindows =>
        checkExpectedPermission(AggregationWindowsReadPermission)
        val ruleId = AchievementConfigurationRulePublicId.random()
        (boundedContext
          .getAggregationWindows(_: ProjectId, _: AchievementConfigurationRulePublicId)(_: ExecutionContext))
          .expects(testProjectId, ruleId, *)
          .returning(Future.successful(aggregationWindows))
          .once()
        val aggregationWindowsPath = aggregationWindowsEndpointPath(ruleId)
        val request = FakeRequest(GET, aggregationWindowsPath, headersWithFakeJwt, AnyContentAsEmpty)
        val res1 = route(app, request).value
        val aggregationWindowsFromRes1 = withOkStatusAndJsonContentAs[Response[Seq[AggregationWindow]]](res1)
        checkExpectedPermission(AggregationWindowsReadPermission)
        // WHEN: we repeat a request
        val res2 = route(app, request).value
        // THEN: we get a correct result and getAggregationWindows is not called once again
        val aggregationWindowsFromRes2 = withOkStatusAndJsonContentAs[Response[Seq[AggregationWindow]]](res2)
        aggregationWindowsFromRes2 mustBe Response.asSuccess(aggregationWindows)
        aggregationWindowsFromRes2 mustBe aggregationWindowsFromRes1
      }
    }

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(AggregationWindowsReadPermission)
      (boundedContext
        .getAggregationWindows(_: ProjectId, _: AchievementConfigurationRulePublicId)(_: ExecutionContext))
        .expects(testProjectId, achievementRuleId, *)
        .returning(Future.failed(new Exception("Kaboom!")))
        .once()
      val aggregationWindowsPath = aggregationWindowsEndpointPath(achievementRuleId)
      val request =
        FakeRequest(GET, aggregationWindowsPath, headersWithFakeJwt, AnyContentAsEmpty)
      sendAndExpectInternalError(request)
    }
  }

  "getAchievementEvents" should {
    "return NotFound when achievement configuration rule id is not UUID" in {
      val request = FakeRequest(GET, s"$achievementBasePath/foo")
      testRequestWithNotFoundResponse(request)
    }

    "return BadRequest when order by is not specified" in {
      val achievementEventsPath = achievementEventsEndpointPath(achievementRuleId)
      val request = FakeRequest(GET, achievementEventsPath)
      val expectedErrorMessage =
        s"Invalid value for: query parameter ${QueryParam.orderBy} (missing)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when page size is too low" in {
      val tooLowValue = minPageSize - 1
      val request = FakeRequest(GET, s"$achievementEventsPathWithOrderBy&${QueryParam.pageSize}=$tooLowValue")
      val expectedErrorMessage =
        s"Invalid value for: query parameter ${QueryParam.pageSize} (expected value to be greater than or equal to $minPageSize, but was $tooLowValue)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when page size is too high" in {
      val tooHighValue = maxPageSize + 1
      val request = FakeRequest(GET, s"$achievementEventsPathWithOrderBy&${QueryParam.pageSize}=$tooHighValue")
      val expectedErrorMessage =
        s"Invalid value for: query parameter ${QueryParam.pageSize} (expected value to be less than or equal to $maxPageSize, but was $tooHighValue)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when page number is too low" in {
      val tooLowValue = minPageNumber - 1
      val request = FakeRequest(GET, s"$achievementEventsPathWithOrderBy&${QueryParam.pageNumber}=$tooLowValue")
      val expectedErrorMessage =
        s"Invalid value for: query parameter ${QueryParam.pageNumber} (expected value to be greater than or equal to $minPageNumber, but was $tooLowValue)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when window range start is not date" in {
      val request = FakeRequest(GET, s"$achievementEventsPathWithOrderBy&${QueryParam.windowRangeStart}=1")
      val expectedErrorMessage = s"Invalid value for: query parameter ${QueryParam.windowRangeStart}"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "properly apply default values" in {
      checkExpectedPermission(AchievementEventsReadPermission)
      (boundedContext
        .getAchievementEventsPage(_: BaseFetchAchievementEventsParams, _: Int, _: Int, _: Boolean)(_: ExecutionContext))
        .expects(
          BaseFetchAchievementEventsParams(testProjectId, achievementRuleId, None, None, testOrderBy),
          defaultPageSize,
          defaultPageNumber,
          defaultCountPages,
          *)
        .returning(Future.successful(achievementEventsPage))
        .once()
      val request = FakeRequest(GET, achievementEventsPathWithOrderBy, headersWithFakeJwt, AnyContentAsEmpty)
      val res = route(app, request).value
      withOkStatusAndJsonContentAs[Response[PaginatedResult[AchievementEvent]]](res) mustBe Response.asSuccess(
        achievementEventsPage)
    }

    "properly get rid of overridden filters" in {
      checkExpectedPermission(AchievementEventsReadPermission)
      val filtersQueryParamValue =
        "asc_field_value,desc_achievement_date,asc_achievement_date,desc_field_value"
      val achievementEventsPath = achievementEventsEndpointPath(achievementRuleId)
      val path = s"$achievementEventsPath?${QueryParam.orderBy}=$filtersQueryParamValue"
      val expectedFilters = OrderByFilters(Seq(OrderByFilter(Asc, AchievementDate), OrderByFilter(Desc, FieldValue)))
      val baseParamsCapture = CaptureOne[BaseFetchAchievementEventsParams]()
      (boundedContext
        .getAchievementEventsPage(_: BaseFetchAchievementEventsParams, _: Int, _: Int, _: Boolean)(_: ExecutionContext))
        .expects(capture(baseParamsCapture), *, *, *, *)
        .returning(Future.successful(achievementEventsPage))
        .once()
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      val res = route(app, request).value
      withOkStatusAndJsonContentAs[Response[PaginatedResult[AchievementEvent]]](res) mustBe Response.asSuccess(
        achievementEventsPage)
      baseParamsCapture.value.orderBy mustBe expectedFilters
    }

    "don't allow to specify incorrect filters" in {
      val filtersQueryParamValue =
        "desc_field_value,asc_achievement_date,this-should-cause-an-error,desc_achievement_date"
      val achievementEventsPath = achievementEventsEndpointPath(achievementRuleId)
      val path = s"$achievementEventsPath?${QueryParam.orderBy}=$filtersQueryParamValue"
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      val expectedErrorMessage = s"Invalid value for: query parameter ${QueryParam.orderBy}"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "properly return page content" in {
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
        val res = route(app, request).value
        withOkStatusAndJsonContentAs[Response[PaginatedResult[AchievementEvent]]](res) mustBe Response.asSuccess(
          achievementEventsPage)
      }
    }

    "properly return cached page content" in {
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
        val res2 = route(app, request).value
        val pageFromRes2 = withOkStatusAndJsonContentAs[Response[PaginatedResult[AchievementEvent]]](res2)
        pageFromRes2 mustBe Response.asSuccess(achievementEventsPage)
        pageFromRes2 mustBe pageFromRes1
      }
    }

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(AchievementEventsReadPermission)
      (boundedContext
        .getAchievementEventsPage(_: BaseFetchAchievementEventsParams, _: Int, _: Int, _: Boolean)(_: ExecutionContext))
        .expects(*, *, *, *, *)
        .returning(Future.failed(new Exception("Forced error")))
        .once()
      val request = FakeRequest(GET, achievementEventsPathWithOrderBy, headersWithFakeJwt, AnyContentAsEmpty)
      sendAndExpectInternalError(request)
    }
  }

  private def testRequestWithNotFoundResponse(request: FakeRequest[AnyContentAsEmpty.type]) = {
    val res = route(app, request).value
    status(res) mustBe NOT_FOUND
  }

  private def testRequestWithBadRequestResponse(
      request: FakeRequest[AnyContentAsEmpty.type],
      expectedErrorMessage: String) = {
    val res = route(app, request).value
    status(res) mustBe BAD_REQUEST
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[ErrorOutput]](res) mustBe errorOutputResponse(
      PresentationErrorCode.BadRequest,
      expectedErrorMessage)
  }
}
