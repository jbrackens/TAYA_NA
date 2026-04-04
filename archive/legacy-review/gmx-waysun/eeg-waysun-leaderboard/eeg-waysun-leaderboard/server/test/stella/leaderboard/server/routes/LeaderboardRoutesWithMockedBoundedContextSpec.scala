package stella.leaderboard.server.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.scalacheck.Arbitrary
import org.scalamock.matchers.ArgCapture.CaptureOne
import play.api.http.MimeTypes
import play.api.mvc.AnyContentAsEmpty
import play.api.test.Helpers._
import play.api.test._

import stella.common.http.PaginatedResult
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.models.Ids.ProjectId

import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.BaseFetchAggregationResultsParams
import stella.leaderboard.models.Ids.AggregationRuleId
import stella.leaderboard.models.OrderByDirection
import stella.leaderboard.models.OrderByDirection.Asc
import stella.leaderboard.models.OrderByDirection.Desc
import stella.leaderboard.models.OrderByFilter
import stella.leaderboard.models.OrderByFilters
import stella.leaderboard.models.OrderByType
import stella.leaderboard.models.OrderByType.Count
import stella.leaderboard.models.OrderByType.FieldValue
import stella.leaderboard.models.OrderByType.Max
import stella.leaderboard.models.OrderByType.Min
import stella.leaderboard.models.OrderByType.Sum
import stella.leaderboard.models.OrderByType._
import stella.leaderboard.models._
import stella.leaderboard.server.gen.Generators._
import stella.leaderboard.server.routes.ResponseFormats._
import stella.leaderboard.server.routes.ResponseFormats.errorOutputFormats._
import stella.leaderboard.server.routes.SampleObjectFactory._
import stella.leaderboard.server.routes.TestConstants.Endpoint._
import stella.leaderboard.server.routes.TestConstants.QueryParam
import stella.leaderboard.server.routes.TestConstants._
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationResultComparisonReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationResultNeighborsReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationResultsReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext.AggregationWindowsReadPermission
import stella.leaderboard.services.LeaderboardBoundedContext._

class LeaderboardRoutesWithMockedBoundedContextSpec extends RoutesWithMockedBoundedContextSpecBase {

  private val aggregationRuleId = AggregationRuleId.random()
  private val testOrderBy = OrderByFilters(Seq(OrderByFilter(Asc, Max)))
  private val aggregationResultsPathWithOrderBy =
    s"${aggregationResultsEndpointPath(aggregationRuleId)}?${QueryParam.orderBy}=${testOrderBy.toQueryParam}"
  private val aggregationResultNeighborsPathWithMandatoryFields =
    s"${aggregationResultNeighborsEndpointPath(aggregationRuleId)}?${QueryParam.fieldValue}=foo&${QueryParam.orderBy}=${testOrderBy.toQueryParam}"
  private val compareAggregationResultsPathWithMandatoryFields =
    s"${compareAggregationResultsEndpointPath(aggregationRuleId)}?${QueryParam.fieldValues}=foo&${QueryParam.orderBy}=${testOrderBy.toQueryParam}"

  "getAggregationWindows" should {
    "return NotFound when aggregation rule id is not UUID" in {
      val request = FakeRequest(GET, s"$leaderboardBasePath/foo/windows")
      testRequestWithNotFoundResponse(request)
    }

    "properly return results" in {
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
        val res = route(app, request).value
        withOkStatusAndJsonContentAs[Response[Seq[AggregationWindow]]](res) mustBe Response.asSuccess(
          aggregationWindows)
      }
    }

    "properly return cached results" in {
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
        .getAggregationWindows(_: ProjectId, _: AggregationRuleId)(_: ExecutionContext))
        .expects(testProjectId, aggregationRuleId, *)
        .returning(Future.failed(new Exception("Kaboom!")))
        .once()
      val aggregationWindowsPath = aggregationWindowsEndpointPath(aggregationRuleId)
      val request =
        FakeRequest(GET, aggregationWindowsPath, headersWithFakeJwt, AnyContentAsEmpty)
      sendAndExpectInternalError(request)
    }
  }

  "getAggregationResults" should {
    "return NotFound when aggregation rule id is not UUID" in {
      val request = FakeRequest(GET, s"$leaderboardBasePath/foo")
      testRequestWithNotFoundResponse(request)
    }

    "return BadRequest when order by is not specified" in {
      val aggregationResultsPath = aggregationResultsEndpointPath(aggregationRuleId)
      val request = FakeRequest(GET, aggregationResultsPath)
      val expectedErrorMessage =
        s"Invalid value for: query parameter ${QueryParam.orderBy} (missing)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when page size is too low" in {
      val tooLowValue = minPageSize - 1
      val request = FakeRequest(GET, s"$aggregationResultsPathWithOrderBy&${QueryParam.pageSize}=$tooLowValue")
      val expectedErrorMessage =
        s"Invalid value for: query parameter ${QueryParam.pageSize} (expected value to be greater than or equal to $minPageSize, but was $tooLowValue)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when page size is too high" in {
      val tooHighValue = maxPageSize + 1
      val request = FakeRequest(GET, s"$aggregationResultsPathWithOrderBy&${QueryParam.pageSize}=$tooHighValue")
      val expectedErrorMessage =
        s"Invalid value for: query parameter ${QueryParam.pageSize} (expected value to be less than or equal to $maxPageSize, but was $tooHighValue)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when page number is too low" in {
      val tooLowValue = minPageNumber - 1
      val request = FakeRequest(GET, s"$aggregationResultsPathWithOrderBy&${QueryParam.pageNumber}=$tooLowValue")
      val expectedErrorMessage =
        s"Invalid value for: query parameter ${QueryParam.pageNumber} (expected value to be greater than or equal to $minPageNumber, but was $tooLowValue)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when window range start is not date" in {
      val request = FakeRequest(GET, s"$aggregationResultsPathWithOrderBy&${QueryParam.windowRangeStart}=1")
      val expectedErrorMessage = s"Invalid value for: query parameter ${QueryParam.windowRangeStart}"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "properly apply default values" in {
      checkExpectedPermission(AggregationResultsReadPermission)
      (boundedContext
        .getAggregationResultsPage(_: BaseFetchAggregationResultsParams, _: Int, _: Int, _: Boolean)(
          _: ExecutionContext))
        .expects(
          BaseFetchAggregationResultsParams(testProjectId, aggregationRuleId, None, testOrderBy, defaultPositionType),
          defaultPageSize,
          defaultPageNumber,
          defaultCountPages,
          *)
        .returning(Future.successful(aggregationResultsPage))
        .once()
      val request = FakeRequest(GET, aggregationResultsPathWithOrderBy, headersWithFakeJwt, AnyContentAsEmpty)
      val res = route(app, request).value
      withOkStatusAndJsonContentAs[Response[PaginatedResult[AggregationResult]]](res) mustBe Response.asSuccess(
        aggregationResultsPage)
    }

    "properly get rid of overridden filters" in {
      checkExpectedPermission(AggregationResultsReadPermission)
      val filtersQueryParamValue =
        "desc_min,asc_sum,desc_sum,asc_max,desc_max,desc_count,asc_max,asc_field_value"
      val aggregationResultsPath = aggregationResultsEndpointPath(aggregationRuleId)
      val path = s"$aggregationResultsPath?${QueryParam.orderBy}=$filtersQueryParamValue"
      val expectedFilters = OrderByFilters(
        Seq(
          OrderByFilter(Desc, Min),
          OrderByFilter(Desc, Sum),
          OrderByFilter(Desc, Count),
          OrderByFilter(Asc, Max),
          OrderByFilter(Asc, FieldValue)))
      val baseParamsCapture = CaptureOne[BaseFetchAggregationResultsParams]()
      (boundedContext
        .getAggregationResultsPage(_: BaseFetchAggregationResultsParams, _: Int, _: Int, _: Boolean)(
          _: ExecutionContext))
        .expects(capture(baseParamsCapture), *, *, *, *)
        .returning(Future.successful(aggregationResultsPage))
        .once()
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      val res = route(app, request).value
      withOkStatusAndJsonContentAs[Response[PaginatedResult[AggregationResult]]](res) mustBe Response.asSuccess(
        aggregationResultsPage)
      baseParamsCapture.value.orderBy mustBe expectedFilters
    }

    "don't allow to specify incorrect filters" in {
      val filtersQueryParamValue =
        "desc_min,asc_sum,this-should-cause-an-error,desc_sum"
      val aggregationResultsPath = aggregationResultsEndpointPath(aggregationRuleId)
      val path = s"$aggregationResultsPath?${QueryParam.orderBy}=$filtersQueryParamValue"
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      val expectedErrorMessage = s"Invalid value for: query parameter ${QueryParam.orderBy}"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "properly return page content" in {
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
        val res = route(app, request).value
        withOkStatusAndJsonContentAs[Response[PaginatedResult[AggregationResult]]](res) mustBe Response.asSuccess(
          aggregationResultsPage)
      }
    }

    "properly return cached page content" in {
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
        val res2 = route(app, request).value
        val pageFromRes2 = withOkStatusAndJsonContentAs[Response[PaginatedResult[AggregationResult]]](res2)
        pageFromRes2 mustBe Response.asSuccess(aggregationResultsPage)
        pageFromRes2 mustBe pageFromRes1
      }
    }

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(AggregationResultsReadPermission)
      (boundedContext
        .getAggregationResultsPage(_: BaseFetchAggregationResultsParams, _: Int, _: Int, _: Boolean)(
          _: ExecutionContext))
        .expects(*, *, *, *, *)
        .returning(Future.failed(new Exception("Forced error")))
        .once()
      val request = FakeRequest(GET, aggregationResultsPathWithOrderBy, headersWithFakeJwt, AnyContentAsEmpty)
      sendAndExpectInternalError(request)
    }
  }

  "getAggregationResultNeighbors" should {
    "return NotFound when aggregation rule id is not UUID" in {
      val request = FakeRequest(GET, s"$leaderboardBasePath/foo/neighbors")
      testRequestWithNotFoundResponse(request)
    }

    "return BadRequest when field_value is not specified" in {
      val aggregationResultNeighborsPath = aggregationResultNeighborsEndpointPath(aggregationRuleId)
      val request =
        FakeRequest(GET, s"$aggregationResultNeighborsPath?${QueryParam.orderBy}=asc_min")
      val expectedErrorMessage = s"Invalid value for: query parameter ${QueryParam.fieldValue} (missing)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when order_by is not specified" in {
      val aggregationResultNeighborsPath = aggregationResultNeighborsEndpointPath(aggregationRuleId)
      val request =
        FakeRequest(GET, s"$aggregationResultNeighborsPath?${QueryParam.fieldValue}=4")
      val expectedErrorMessage = s"Invalid value for: query parameter ${QueryParam.orderBy} (missing)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when size is too high" in {
      val tooHighValue = maxNeighborsSize + 1
      val request =
        FakeRequest(
          GET,
          s"$aggregationResultNeighborsPathWithMandatoryFields&${QueryParam.neighborsSize}=$tooHighValue")
      val expectedErrorMessage =
        s"Invalid value for: query parameter ${QueryParam.neighborsSize} (expected value to be less than or equal to $maxNeighborsSize, but was $tooHighValue)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when size is too low" in {
      val tooLowValue = minNeighborsSize - 1
      val request =
        FakeRequest(GET, s"$aggregationResultNeighborsPathWithMandatoryFields&${QueryParam.neighborsSize}=$tooLowValue")
      val expectedErrorMessage =
        s"Invalid value for: query parameter ${QueryParam.neighborsSize} (expected value to be greater than or equal to $minNeighborsSize, but was $tooLowValue)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when window range start is not date" in {
      val request =
        FakeRequest(GET, s"$aggregationResultNeighborsPathWithMandatoryFields&${QueryParam.windowRangeStart}=1")
      val expectedErrorMessage = s"Invalid value for: query parameter ${QueryParam.windowRangeStart}"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "properly apply default values" in {
      checkExpectedPermission(AggregationResultNeighborsReadPermission)
      val fieldValue = "baz"
      val orderByFilters = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum)))
      val aggregationResultNeighborsPath = aggregationResultNeighborsEndpointPath(aggregationRuleId)
      val path =
        s"$aggregationResultNeighborsPath?${QueryParam.fieldValue}=$fieldValue&${QueryParam.orderBy}=${orderByFilters.toQueryParam}"
      val aggregationResults = Seq(aggregationResult, aggregationResult2)
      (boundedContext
        .getAggregationResultNeighbors(_: BaseFetchAggregationResultsParams, _: Int, _: String)(_: ExecutionContext))
        .expects(
          BaseFetchAggregationResultsParams(
            testProjectId,
            aggregationRuleId,
            None,
            orderByFilters,
            defaultPositionType),
          defaultNeighborsSize,
          fieldValue,
          *)
        .returning(Future.successful(aggregationResults))
        .once()
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      val res = route(app, request).value
      withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res) mustBe Response.asSuccess(aggregationResults)
    }

    "properly return results" in {
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
          val res = route(app, request).value
          withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res) mustBe Response.asSuccess(
            aggregationResults)
      }
    }

    "properly return cached results" in {
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
          val res2 = route(app, request).value
          val neighborsFromRes2 = withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res2)
          neighborsFromRes2 mustBe Response.asSuccess(aggregationResults)
          neighborsFromRes2 mustBe neighborsFromRes1
      }
    }

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(AggregationResultNeighborsReadPermission)
      (boundedContext
        .getAggregationResultNeighbors(_: BaseFetchAggregationResultsParams, _: Int, _: String)(_: ExecutionContext))
        .expects(*, *, *, *)
        .returning(Future.failed(new Exception("Kaboom!")))
        .once()
      val request =
        FakeRequest(GET, aggregationResultNeighborsPathWithMandatoryFields, headersWithFakeJwt, AnyContentAsEmpty)
      sendAndExpectInternalError(request)
    }
  }

  "compareAggregationResults" should {
    "return NotFound when aggregation rule id is not UUID" in {
      val request = FakeRequest(GET, s"$leaderboardBasePath/foo/compare")
      testRequestWithNotFoundResponse(request)
    }

    "return BadRequest when field_values are not specified" in {
      val compareAggregationResultsPath = compareAggregationResultsEndpointPath(aggregationRuleId)
      val request =
        FakeRequest(GET, s"$compareAggregationResultsPath?${QueryParam.orderBy}=asc_min")
      val expectedErrorMessage = s"Invalid value for: query parameter ${QueryParam.fieldValues} " +
        "(expected size of value to be greater than or equal to 1, but was 0)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when order_by is not specified" in {
      val compareAggregationResultsPath = compareAggregationResultsEndpointPath(aggregationRuleId)
      val request =
        FakeRequest(GET, s"$compareAggregationResultsPath?${QueryParam.fieldValues}=4")
      val expectedErrorMessage = s"Invalid value for: query parameter ${QueryParam.orderBy} (missing)"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "return BadRequest when window range start is not date" in {
      val request =
        FakeRequest(GET, s"$compareAggregationResultsPathWithMandatoryFields&${QueryParam.windowRangeStart}=1")
      val expectedErrorMessage = s"Invalid value for: query parameter ${QueryParam.windowRangeStart}"
      testRequestWithBadRequestResponse(request, expectedErrorMessage)
    }

    "properly apply default values" in {
      checkExpectedPermission(AggregationResultComparisonReadPermission)
      val fieldValue = "baz"
      val orderByFilters = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Sum)))
      val compareAggregationResultsPath = compareAggregationResultsEndpointPath(aggregationRuleId)
      val path =
        s"$compareAggregationResultsPath?${QueryParam.fieldValues}=$fieldValue&${QueryParam.orderBy}=${orderByFilters.toQueryParam}"
      val aggregationResults = Seq(aggregationResult, aggregationResult2)
      (boundedContext
        .getAggregationResultsForValues(_: BaseFetchAggregationResultsParams, _: List[String])(_: ExecutionContext))
        .expects(
          BaseFetchAggregationResultsParams(
            testProjectId,
            aggregationRuleId,
            None,
            orderByFilters,
            defaultPositionType),
          List(fieldValue),
          *)
        .returning(Future.successful(aggregationResults))
        .once()
      val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
      val res = route(app, request).value
      withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res) mustBe Response.asSuccess(aggregationResults)
    }

    "properly return results" in {
      val aggregationResults = Seq(aggregationResult, aggregationResult2)
      forAll(baseFetchAggregationResultsParamsGen(testProjectId), fieldValuesGen) { (baseParams, fieldValues) =>
        val uniqueSortedFieldValues = fieldValues.distinct.sorted
        val compareAggregationResultsPath = compareAggregationResultsEndpointPath(baseParams.aggregationRuleId)
        val queryString =
          compareAggregationResultsQueryString(baseParams, fieldValues)
        val path = compareAggregationResultsPath + queryString
        checkExpectedPermission(AggregationResultComparisonReadPermission)
        val expectedBaseParams = baseParams.withRemovedOverriddenFilters
        (boundedContext
          .getAggregationResultsForValues(_: BaseFetchAggregationResultsParams, _: List[String])(_: ExecutionContext))
          .expects(expectedBaseParams, uniqueSortedFieldValues, *)
          .returning(Future.successful(aggregationResults))
          .once()
        val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
        val res = route(app, request).value
        withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res) mustBe Response.asSuccess(
          aggregationResults)
      }
    }

    "properly return cached results" in {
      val aggregationResults = Seq(aggregationResult, aggregationResult2)
      forAll(baseFetchAggregationResultsParamsGen(testProjectId), fieldValuesGen) { (baseParams, fieldValues) =>
        val duplicatedFieldValues = fieldValues ++ fieldValues
        val uniqueSortedFieldValues = fieldValues.distinct.sorted
        val compareAggregationResultsPath = compareAggregationResultsEndpointPath(baseParams.aggregationRuleId)
        checkExpectedPermission(AggregationResultComparisonReadPermission)
        val expectedBaseParams = baseParams.withRemovedOverriddenFilters
        (boundedContext
          .getAggregationResultsForValues(_: BaseFetchAggregationResultsParams, _: List[String])(_: ExecutionContext))
          .expects(expectedBaseParams, uniqueSortedFieldValues, *)
          .returning(Future.successful(aggregationResults))
          .once()
        val queryString =
          compareAggregationResultsQueryString(baseParams, duplicatedFieldValues)
        val path = compareAggregationResultsPath + queryString
        val request = FakeRequest(GET, path, headersWithFakeJwt, AnyContentAsEmpty)
        val res1 = route(app, request).value
        val comparisonResult1 = withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res1)
        checkExpectedPermission(AggregationResultComparisonReadPermission)
        val queryString2 =
          compareAggregationResultsQueryString(
            baseParams,
            fieldValues.reverse
          ) // order of field values should not matter
        val path2 = compareAggregationResultsPath + queryString2
        val request2 = FakeRequest(GET, path2, headersWithFakeJwt, AnyContentAsEmpty)
        val res2 = route(app, request2).value
        val comparisonResult2 = withOkStatusAndJsonContentAs[Response[Seq[AggregationResult]]](res2)
        comparisonResult2 mustBe Response.asSuccess(aggregationResults)
        comparisonResult2 mustBe comparisonResult1
      }
    }

    "return InternalServerError on unexpected error" in {
      checkExpectedPermission(AggregationResultComparisonReadPermission)
      (boundedContext
        .getAggregationResultsForValues(_: BaseFetchAggregationResultsParams, _: List[String])(_: ExecutionContext))
        .expects(*, *, *)
        .returning(Future.failed(new Exception("Kaboom!")))
        .once()
      val request =
        FakeRequest(GET, compareAggregationResultsPathWithMandatoryFields, headersWithFakeJwt, AnyContentAsEmpty)
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
