package stella.rules.routes.aggregation

import java.time.OffsetDateTime
import java.time.ZoneOffset

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalacheck.Arbitrary
import org.scalacheck.Gen
import play.api.http.MimeTypes
import play.api.http.Writeable
import play.api.libs.json.JsObject
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.Helpers._
import play.api.test._

import stella.common.core.OffsetDateTimeUtils
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.error.PresentationErrorCode.Forbidden
import stella.common.models.Ids.ProjectId

import stella.rules.gen.Generators._
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.aggregation.AggregationConditionType
import stella.rules.models.aggregation.AggregationConditionType.Nn
import stella.rules.models.aggregation.IntervalType
import stella.rules.models.aggregation.IntervalType.Never
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.aggregation.http.UpdateAggregationRuleConfigurationRequest
import stella.rules.routes.ResponseFormats._
import stella.rules.routes.ResponseFormats.errorOutputFormats._
import stella.rules.routes.RoutesWithMockedBoundedContextSpecBase
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory.TestIntervalDetails
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestConstants.maxAggregationRuleConditionValueLength
import stella.rules.routes.TestConstants.maxAggregationRuleConfigNameLength
import stella.rules.routes.TestConstants.maxEventFieldNameLength
import stella.rules.routes.error.AdditionalPresentationErrorCode.AggregationRuleConfigurationIsActive
import stella.rules.routes.error.AdditionalPresentationErrorCode.AggregationRuleConfigurationNotFound
import stella.rules.services.RuleConfiguratorBoundedContext._

trait AggregationRuleConfigurationRoutesWithMockedBoundedContextSpecBase
    extends RoutesWithMockedBoundedContextSpecBase {

  protected val allowedProjectIdGen: Gen[ProjectId]
  protected val ruleId = AggregationRuleConfigurationRuleId.random()
  protected val primaryProjectId: ProjectId = SampleObjectFactory.primaryProjectId

  private val primaryProjectAggregationRuleEndpointPath = testAggregationRuleEndpointPath(primaryProjectId, ruleId)
  private val primaryProjectAggregationRulesEndpointPath = testAggregationRulesEndpointPath(primaryProjectId)
  private val unexpectedRuleConfiguratorError = UnexpectedRuleConfiguratorError("Test error", new Exception("Kaboom!"))
  private val aggregationRuleConfigNotFoundError = AggregationRuleConfigurationNotFoundError(ruleId, ProjectId.random())
  private val aggregationRuleConfigIsActiveError = AggregationRuleConfigurationIsActiveError(ruleId, ProjectId.random())

  protected def checkWritePermissionIsExpected(): Unit
  protected def checkReadPermissionIsExpected(): Unit
  protected def testAggregationRulesEndpointPath(projectId: ProjectId): String
  protected def testAggregationRulesEndpointPathWithIncludeInactiveParam(
      projectId: ProjectId,
      includeInactive: Boolean): String
  protected def testAggregationRuleEndpointPath(
      projectId: ProjectId,
      ruleId: AggregationRuleConfigurationRuleId): String

  "getAggregationRuleConfigurations" should {
    "return a collection of aggregation rule configurations" in {
      forAll(aggregationRuleConfigListGen, Arbitrary.arbBool.arbitrary, allowedProjectIdGen) {
        (aggregationRuleConfigCollection, includeInactive, projectId) =>
          checkReadPermissionIsExpected()
          // GIVEN: bounded context which always returns a list of aggregation rule configurations
          (boundedContext
            .getAggregationRuleConfigurations(_: Boolean, _: ProjectId)(_: ExecutionContext))
            .expects(includeInactive, projectId, *)
            .returning(Future.successful(aggregationRuleConfigCollection))
            .once()
          val request = FakeRequest(
            GET,
            testAggregationRulesEndpointPathWithIncludeInactiveParam(projectId, includeInactive),
            headersWithFakeJwt,
            AnyContentAsEmpty)

          // WHEN: we fetch configurations
          val res = route(app, request).value

          // THEN: the request succeeded and the proper collection is returned
          val expectedRes = Response.asSuccess(aggregationRuleConfigCollection)
          status(res) mustBe OK
          contentType(res) mustBe Some(MimeTypes.JSON)
          contentAs[Response[Seq[AggregationRuleConfiguration]]](res) mustBe expectedRes
      }
    }
  }

  "createAggregationRuleConfiguration" should {

    "return BadRequest on empty or blank aggregation rule configuration name" in {
      forAll(emptyOrBlankStringGen) { wrongValue =>
        testCreateConfigWithWrongAggregationRuleConfigName(wrongValue)
      }
    }

    "return BadRequest on too long aggregation rule configuration name" in {
      testCreateConfigWithWrongAggregationRuleConfigName(dummyNonBlankString(maxAggregationRuleConfigNameLength + 1))
    }

    "return BadRequest on aggregationFieldName not matching expected pattern" in {
      forAll(eventFieldNameNotMatchingPatternGen) { wrongValue =>
        testCreateConfigWithWrongAggregationFieldName(wrongValue)
      }
    }

    "return BadRequest on too long aggregationFieldName" in {
      testCreateConfigWithWrongAggregationFieldName(dummyNonBlankString(maxEventFieldNameLength + 1))
    }

    "return BadRequest on aggregationGroupByFieldName not matching expected pattern" in {
      forAll(eventFieldNameNotMatchingPatternGen) { wrongValue =>
        testCreateConfigWithWrongAggregationGroupByFieldName(wrongValue)
      }
    }

    "return BadRequest on too long aggregationGroupByFieldName" in {
      testCreateConfigWithWrongAggregationGroupByFieldName(dummyNonBlankString(maxEventFieldNameLength + 1))
    }

    "return BadRequest when interval details are specified for Never interval" in {
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: Interval details for interval type ${Never.entryName} should be empty)"
      testCreateConfigWithBadResetFrequency(
        IntervalType.Never,
        Some(OffsetDateTimeUtils.nowUtc()),
        Some(TestIntervalDetails(length = 1, windowCountLimit = Some(1))),
        expectedErrorMessage)
    }

    "return BadRequest when interval details are not specified for other interval than Never" in {
      IntervalType.values.filter(_ != IntervalType.Never).foreach { intervalType =>
        val expectedErrorMessage =
          s"Invalid value for: body (Interval details for interval type ${intervalType.entryName} should be specified)"
        testCreateConfigWithBadResetFrequency(
          intervalType,
          windowStartDateUTC = None,
          intervalDetails = None,
          expectedErrorMessage)
      }
    }

    "return BadRequest when reset frequency length is too low for other interval than Never" in {
      val expectedErrorMessage =
        "Invalid value for: body (requirement failed: An interval length should be a positive integer but was 0)"
      IntervalType.values.filter(_ != IntervalType.Never).foreach { intervalType =>
        testCreateConfigWithBadResetFrequency(
          intervalType,
          windowStartDateUTC = None,
          Some(TestIntervalDetails(length = 0)),
          expectedErrorMessage)
      }
    }

    "return BadRequest when reset frequency length is too high for other interval than Never" in {
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: An interval other than ${IntervalType.Never.entryName} can't be longer than 50 years)"
      IntervalType.values.filter(_ != IntervalType.Never).foreach { intervalType =>
        testCreateConfigWithBadResetFrequency(
          intervalType,
          windowStartDateUTC = None,
          Some(TestIntervalDetails(length = Int.MaxValue)),
          expectedErrorMessage)
      }
    }

    "return BadRequest when windowDataStartUTC is not UTC date" in {
      val dateTime = OffsetDateTime.now(ZoneOffset.MIN)
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: windowStartDateUTC '$dateTime' should have zone offset UTC)"
      IntervalType.values.filter(_ != IntervalType.Never).foreach { intervalType =>
        testCreateConfigWithBadResetFrequency(
          intervalType,
          windowStartDateUTC = Some(dateTime),
          Some(TestIntervalDetails(length = 1)),
          expectedErrorMessage)
      }
    }

    "return BadRequest when windowDataStartUTC is too old" in {
      val dateTime = OffsetDateTime.of(1969, 12, 31, 23, 59, 59, 0, ZoneOffset.UTC)
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: windowStartDateUTC '$dateTime' can't be earlier than '1970-01-01T00:00Z')"
      IntervalType.values.filter(_ != IntervalType.Never).foreach { intervalType =>
        testCreateConfigWithBadResetFrequency(
          intervalType,
          windowStartDateUTC = Some(dateTime),
          Some(TestIntervalDetails(length = 1)),
          expectedErrorMessage)
      }
    }

    "return BadRequest when windowCountLimit is not positive number" in {
      val wrongValue = 0
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: windowCountLimit, when specified, should be between 1 and 400 but was $wrongValue)"
      IntervalType.values.filter(_ != IntervalType.Never).foreach { intervalType =>
        testCreateConfigWithBadResetFrequency(
          intervalType,
          windowStartDateUTC = None,
          Some(TestIntervalDetails(length = 1, windowCountLimit = Some(wrongValue))),
          expectedErrorMessage)
      }
    }

    "return BadRequest when windowCountLimit is too high" in {
      val wrongValue = 401
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: windowCountLimit, when specified, should be between 1 and 400 but was $wrongValue)"
      IntervalType.values.filter(_ != IntervalType.Never).foreach { intervalType =>
        testCreateConfigWithBadResetFrequency(
          intervalType,
          windowStartDateUTC = None,
          Some(TestIntervalDetails(length = 1, windowCountLimit = Some(wrongValue))),
          expectedErrorMessage)
      }
    }

    "return BadRequest on aggregation rule condition's eventFieldName not matching expected pattern" in {
      forAll(eventFieldNameNotMatchingPatternGen) { wrongEventFieldName =>
        val conditionType = Nn
        val value = None
        val expectedErrorMessage = wrongEventFieldNameErrorMessage("Event field name", wrongEventFieldName)
        testCreateConfigWithBadAggregationRuleCondition(wrongEventFieldName, conditionType, value, expectedErrorMessage)
      }
    }

    "return BadRequest on too long aggregation rule condition's eventFieldName" in {
      val wrongLength = maxEventFieldNameLength + 1
      val wrongEventFieldName = dummyNonBlankString(wrongLength)
      val conditionType = AggregationConditionType.Nn
      val value = None
      val expectedErrorMessage = wrongEventFieldNameErrorMessage("Event field name", wrongEventFieldName)
      testCreateConfigWithBadAggregationRuleCondition(wrongEventFieldName, conditionType, value, expectedErrorMessage)
    }

    "return BadRequest when aggregation rule condition's value is specified for Nn condition" in {
      val conditionType = AggregationConditionType.Nn
      val wrongValue = Some("1")
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: A value for aggregation type ${AggregationConditionType.Nn.entryName} should be empty)"
      testCreateConfigWithBadAggregationRuleCondition(
        testEventFieldName,
        conditionType,
        wrongValue,
        expectedErrorMessage)
    }

    "return BadRequest when aggregation rule condition's value is not specified for other condition than Nn" in {
      AggregationConditionType.values.filter(_ != AggregationConditionType.Nn).foreach { conditionType =>
        val wrongValue = None
        val expectedErrorMessage =
          s"Invalid value for: body (requirement failed: A value for aggregation type ${conditionType.entryName} must be specified, be non-blank and have at most $maxAggregationRuleConditionValueLength characters)"
        testCreateConfigWithBadAggregationRuleCondition(
          testEventFieldName,
          conditionType,
          wrongValue,
          expectedErrorMessage)
      }
    }

    "return BadRequest when aggregation rule condition's value for other condition than Nn is too long" in {
      AggregationConditionType.values.filter(_ != AggregationConditionType.Nn).foreach { conditionType =>
        val wrongValue = Some(dummyNonBlankString(maxAggregationRuleConditionValueLength + 1))
        val expectedErrorMessage =
          s"Invalid value for: body (requirement failed: A value for aggregation type ${conditionType.entryName} must be specified, be non-blank and have at most $maxAggregationRuleConditionValueLength characters)"
        testCreateConfigWithBadAggregationRuleCondition(
          testEventFieldName,
          conditionType,
          wrongValue,
          expectedErrorMessage)
      }
    }

    "return a created aggregation rule configuration" in {
      forAll(aggregationRuleConfigGen, allowedProjectIdGen) { case (aggregationRuleConfig, projectId) =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns an aggregation rule configuration
        (boundedContext
          .createAggregationRuleConfiguration(_: CreateAggregationRuleConfigurationRequest, _: ProjectId)(
            _: ExecutionContext))
          .expects(createAggregationRuleConfigurationRequest, projectId, *)
          .returning(EitherT[Future, CreateAggregationRuleConfigurationError, AggregationRuleConfiguration](
            Future.successful(Right(aggregationRuleConfig))))
          .once()
        val request =
          FakeRequest(
            POST,
            testAggregationRulesEndpointPath(projectId),
            headersWithFakeJwt,
            AnyContentAsJson(createAggregationRuleConfigurationRequestJson))

        sendAndExpectAggregationRuleConfiguration(aggregationRuleConfig, request, expectedStatusCode = CREATED)
      }
    }
  }

  "getAggregationRuleConfiguration" should {
    "return an aggregation rule configuration" in {
      forAll(aggregationRuleConfigGen, allowedProjectIdGen) { case (aggregationRuleConfig, projectId) =>
        checkReadPermissionIsExpected()
        // GIVEN: bounded context which always returns an aggregation rule configuration
        (boundedContext
          .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, projectId, *)
          .returning(EitherT[Future, GetAggregationRuleConfigurationError, AggregationRuleConfiguration](
            Future.successful(Right(aggregationRuleConfig))))
          .once()
        val request =
          FakeRequest(GET, testAggregationRuleEndpointPath(projectId, ruleId), headersWithFakeJwt, AnyContentAsEmpty)

        sendAndExpectAggregationRuleConfiguration(aggregationRuleConfig, request)
      }
    }

    "return InternalServerError on unexpected error" in {
      checkReadPermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, primaryProjectId, *)
        .returning(EitherT[Future, GetAggregationRuleConfigurationError, AggregationRuleConfiguration](
          Future.successful(Left(unexpectedRuleConfiguratorError))))
        .once()
      val request = FakeRequest(GET, primaryProjectAggregationRuleEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectInternalError(request)
    }

    "return NotFound when aggregation rule configuration could not be found" in {
      checkReadPermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, primaryProjectId, *)
        .returning(EitherT[Future, GetAggregationRuleConfigurationError, AggregationRuleConfiguration](
          Future.successful(Left(aggregationRuleConfigNotFoundError))))
        .once()
      val request = FakeRequest(GET, primaryProjectAggregationRuleEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectAggregationRuleConfigNotFound(request)
    }
  }

  "updateAggregationRuleConfiguration" should {
    "return an updated aggregation rule configuration" in {
      forAll(aggregationRuleConfigGen, allowedProjectIdGen) { case (aggregationRuleConfig, projectId) =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns an aggregation rule configuration
        (boundedContext
          .updateAggregationRuleConfiguration(
            _: AggregationRuleConfigurationRuleId,
            _: UpdateAggregationRuleConfigurationRequest,
            _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, activateAggregationRuleConfigurationRequest, projectId, *)
          .returning(EitherT[Future, UpdateAggregationRuleConfigurationError, AggregationRuleConfiguration](
            Future.successful(Right(aggregationRuleConfig))))
          .once()
        val request = FakeRequest(
          PATCH,
          testAggregationRuleEndpointPath(projectId, ruleId),
          headersWithFakeJwt,
          AnyContentAsJson(activateAggregationRuleConfigurationRequestJson))

        sendAndExpectAggregationRuleConfiguration(aggregationRuleConfig, request)
      }
    }

    "return InternalServerError on unexpected error" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .updateAggregationRuleConfiguration(
          _: AggregationRuleConfigurationRuleId,
          _: UpdateAggregationRuleConfigurationRequest,
          _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, activateAggregationRuleConfigurationRequest, primaryProjectId, *)
        .returning(EitherT[Future, UpdateAggregationRuleConfigurationError, AggregationRuleConfiguration](
          Future.successful(Left(unexpectedRuleConfiguratorError))))
        .once()
      val request =
        FakeRequest(
          PATCH,
          primaryProjectAggregationRuleEndpointPath,
          headersWithFakeJwt,
          AnyContentAsJson(activateAggregationRuleConfigurationRequestJson))

      sendAndExpectInternalError(request)
    }

    "return NotFound when aggregation rule configuration could not be found" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .updateAggregationRuleConfiguration(
          _: AggregationRuleConfigurationRuleId,
          _: UpdateAggregationRuleConfigurationRequest,
          _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, activateAggregationRuleConfigurationRequest, primaryProjectId, *)
        .returning(EitherT[Future, UpdateAggregationRuleConfigurationError, AggregationRuleConfiguration](
          Future.successful(Left(aggregationRuleConfigNotFoundError))))
        .once()
      val request =
        FakeRequest(
          PATCH,
          primaryProjectAggregationRuleEndpointPath,
          headersWithFakeJwt,
          AnyContentAsJson(activateAggregationRuleConfigurationRequestJson))

      sendAndExpectAggregationRuleConfigNotFound(request)
    }

    "return BadRequest when update request doesn't contain fields to change" in {
      val expectedErrorMessage = "Invalid value for: body (requirement failed: No data to update specified)"
      val request =
        FakeRequest(
          PATCH,
          primaryProjectAggregationRuleEndpointPath,
          headersWithFakeJwt,
          AnyContentAsJson(JsObject.empty))
      checkWritePermissionIsExpected()
      val res = route(app, request).value

      status(res) mustBe BAD_REQUEST
      contentType(res) mustBe Some(MimeTypes.JSON)
      contentAs[Response[ErrorOutput]](res) mustBe errorOutputResponse(
        PresentationErrorCode.BadRequest,
        expectedErrorMessage)
    }
  }

  "deleteAggregationRuleConfiguration" should {
    "return only status code" in {
      forAll(allowedProjectIdGen) { projectId =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns Unit
        (boundedContext
          .deleteAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, projectId, *)
          .returning(EitherT[Future, DeleteAggregationRuleConfigurationError, Unit](Future.successful(Right(()))))
          .once()
        val request =
          FakeRequest(DELETE, testAggregationRuleEndpointPath(projectId, ruleId), headersWithFakeJwt, AnyContentAsEmpty)

        // WHEN: we send a request
        val res = route(app, request).value

        // THEN: the request returns NO_CONTENT and there's really no content
        status(res) mustBe NO_CONTENT
        contentType(res) mustBe None
      }
    }

    "return InternalServerError on unexpected error" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .deleteAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, primaryProjectId, *)
        .returning(EitherT[Future, DeleteAggregationRuleConfigurationError, Unit](
          Future.successful(Left(unexpectedRuleConfiguratorError))))
        .once()
      val request =
        FakeRequest(DELETE, primaryProjectAggregationRuleEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectInternalError(request)
    }

    "return NotFound when aggregation rule configuration could not be found" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .deleteAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, primaryProjectId, *)
        .returning(EitherT[Future, DeleteAggregationRuleConfigurationError, Unit](
          Future.successful(Left(aggregationRuleConfigNotFoundError))))
        .once()
      val request =
        FakeRequest(DELETE, primaryProjectAggregationRuleEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectAggregationRuleConfigNotFound(request)
    }

    "return Conflict when aggregation rule configuration is active" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .deleteAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, primaryProjectId, *)
        .returning(EitherT[Future, DeleteAggregationRuleConfigurationError, Unit](
          Future.successful(Left(aggregationRuleConfigIsActiveError))))
        .once()
      val request =
        FakeRequest(DELETE, primaryProjectAggregationRuleEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectAggregationRuleConfigIsActiveError(request)
    }
  }

  private def testCreateConfigWithWrongAggregationRuleConfigName(wrongName: String) = {
    val jsonWithWrongConfigName =
      aggregationRuleConfigJsonWithChangedName(createAggregationRuleConfigurationRequestJson, wrongName)
    val expectedErrorMessage = requireNonEmptyAndNonBlankValueWithLengthLimitErrorMessage(
      "Aggregation rule configuration name",
      wrongName,
      maxAggregationRuleConfigNameLength)
    testCreateConfigWithBadRequest(jsonWithWrongConfigName, expectedErrorMessage)
  }

  private def testCreateConfigWithWrongAggregationFieldName(wrongName: String) = {
    val jsonWithWrongValue =
      aggregationRuleConfigJsonWithChangedAggregationFieldName(createAggregationRuleConfigurationRequestJson, wrongName)
    val expectedErrorMessage = wrongEventFieldNameErrorMessage("Aggregation field name", wrongName)
    testCreateConfigWithBadRequest(jsonWithWrongValue, expectedErrorMessage)
  }

  private def testCreateConfigWithWrongAggregationGroupByFieldName(wrongName: String) = {
    val jsonWithWrongValue =
      aggregationRuleConfigJsonWithChangedAggregationGroupByFieldName(
        createAggregationRuleConfigurationRequestJson,
        wrongName)
    val expectedErrorMessage = wrongEventFieldNameErrorMessage("Aggregation group by field name", wrongName)
    testCreateConfigWithBadRequest(jsonWithWrongValue, expectedErrorMessage)
  }

  private def testCreateConfigWithBadResetFrequency(
      intervalType: IntervalType,
      windowStartDateUTC: Option[OffsetDateTime],
      intervalDetails: Option[TestIntervalDetails],
      expectedErrorMessage: String) = {
    val jsonWithWrongValue =
      aggregationRuleConfigJsonWithChangedResetFrequency(
        createAggregationRuleConfigurationRequestJson,
        intervalType,
        windowStartDateUTC,
        intervalDetails)
    testCreateConfigWithBadRequest(jsonWithWrongValue, expectedErrorMessage)
  }

  private def testCreateConfigWithBadAggregationRuleCondition(
      eventFieldName: String,
      conditionType: AggregationConditionType,
      value: Option[String],
      expectedErrorMessage: String) = {
    val jsonWithWrongValue =
      aggregationRuleConfigJsonWithAdditionalRuleCondition(
        createAggregationRuleConfigurationRequestJson,
        eventFieldName,
        conditionType,
        value)
    testCreateConfigWithBadRequest(jsonWithWrongValue, expectedErrorMessage)
  }

  private def testCreateConfigWithBadRequest(wrongJson: JsObject, expectedErrorMessage: String) = {
    checkWritePermissionIsExpected()
    val request =
      FakeRequest(POST, primaryProjectAggregationRulesEndpointPath, headersWithFakeJwt, AnyContentAsJson(wrongJson))
    val res = route(app, request).value

    status(res) mustBe BAD_REQUEST
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[ErrorOutput]](res) mustBe errorOutputResponse(
      PresentationErrorCode.BadRequest,
      expectedErrorMessage)
  }

  private def sendAndExpectAggregationRuleConfiguration[T: Writeable](
      aggregationRuleConfig: AggregationRuleConfiguration,
      request: FakeRequest[T],
      expectedStatusCode: Int = OK) = {
    // WHEN: we send a request
    val res = route(app, request).value

    // THEN: the request succeeded and the proper config is returned
    val expectedRes = Response.asSuccess(aggregationRuleConfig)
    status(res) mustBe expectedStatusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[AggregationRuleConfiguration]](res) mustBe expectedRes
  }

  protected def sendAndExpectAggregationRuleConfigIsActiveError[T: Writeable](request: FakeRequest[T]) =
    sendAndExpectErrorCode(request, CONFLICT, AggregationRuleConfigurationIsActive)

  protected def sendAndExpectAggregationRuleConfigNotFound[T: Writeable](request: FakeRequest[T]) =
    sendAndExpectErrorCode(request, NOT_FOUND, AggregationRuleConfigurationNotFound)

  protected def sendAndExpectAggregationRuleConfigForbidden[T: Writeable](request: FakeRequest[T]) =
    sendAndExpectErrorCode(request, FORBIDDEN, Forbidden)
}
