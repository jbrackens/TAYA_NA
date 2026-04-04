package stella.rules.routes.achievement

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalacheck.Arbitrary
import org.scalacheck.Gen
import play.api.http.MimeTypes
import play.api.http.Writeable
import play.api.libs.json.JsArray
import play.api.libs.json.JsObject
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.Helpers._
import play.api.test._

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.error.PresentationErrorCode.Forbidden
import stella.common.models.Ids.ProjectId

import stella.rules.gen.Generators._
import stella.rules.models.Ids.AchievementConfigurationRuleId
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.achievement.OperationType
import stella.rules.models.achievement.OperationType.ReplaceFrom
import stella.rules.models.achievement.http.AchievementRuleConfiguration
import stella.rules.models.achievement.http.CreateAchievementRuleConfigurationRequest
import stella.rules.models.achievement.http.UpdateAchievementRuleConfigurationRequest
import stella.rules.models.aggregation.AggregationConditionType
import stella.rules.models.aggregation.AggregationConditionType.Nn
import stella.rules.routes.ResponseFormats._
import stella.rules.routes.ResponseFormats.errorOutputFormats._
import stella.rules.routes.RoutesWithMockedBoundedContextSpecBase
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestConstants._
import stella.rules.routes.error.AdditionalPresentationErrorCode.AchievementRuleConfigurationIsActive
import stella.rules.routes.error.AdditionalPresentationErrorCode.AchievementRuleConfigurationNotFound
import stella.rules.services.RuleConfiguratorBoundedContext._

trait AchievementRuleConfigurationRoutesWithMockedBoundedContextSpecBase
    extends RoutesWithMockedBoundedContextSpecBase {

  protected val allowedProjectIdGen: Gen[ProjectId]
  protected val ruleId = AchievementConfigurationRuleId.random()
  protected val primaryProjectId: ProjectId = SampleObjectFactory.primaryProjectId

  private val primaryProjectAchievementRuleEndpointPath = testAchievementRuleEndpointPath(primaryProjectId, ruleId)
  private val primaryProjectAchievementRulesEndpointPath = testAchievementRulesEndpointPath(primaryProjectId)
  private val unexpectedRuleConfiguratorError = UnexpectedRuleConfiguratorError("Test error", new Exception("Kaboom!"))
  private val achievementRuleConfigNotFoundError = AchievementRuleConfigurationNotFoundError(ruleId, ProjectId.random())
  private val achievementRuleConfigIsActiveError = AchievementRuleConfigurationIsActiveError(ruleId, ProjectId.random())

  protected def checkWritePermissionIsExpected(): Unit
  protected def checkReadPermissionIsExpected(): Unit
  protected def testAchievementRulesEndpointPath(projectId: ProjectId): String
  protected def testAchievementRulesEndpointPathWithIncludeInactiveParam(
      projectId: ProjectId,
      includeInactive: Boolean): String
  protected def testAchievementRuleEndpointPath(projectId: ProjectId, ruleId: AchievementConfigurationRuleId): String

  "getAchievementRuleConfigurations" should {
    "return a collection of achievement rule configurations" in {
      forAll(achievementRuleConfigListGen, Arbitrary.arbBool.arbitrary, allowedProjectIdGen) {
        (achievementConfigCollection, includeInactive, projectId) =>
          checkReadPermissionIsExpected()
          // GIVEN: bounded context which always returns a list of achievement rule configurations
          (boundedContext
            .getAchievementRuleConfigurations(_: Boolean, _: ProjectId)(_: ExecutionContext))
            .expects(includeInactive, projectId, *)
            .returning(Future.successful(achievementConfigCollection))
            .once()
          val request = FakeRequest(
            GET,
            testAchievementRulesEndpointPathWithIncludeInactiveParam(projectId, includeInactive),
            headersWithFakeJwt,
            AnyContentAsEmpty)

          // WHEN: we fetch configurations
          val res = route(app, request).value

          // THEN: the request succeeded and the proper collection is returned
          val expectedRes = Response.asSuccess(achievementConfigCollection)
          status(res) mustBe OK
          contentType(res) mustBe Some(MimeTypes.JSON)
          contentAs[Response[Seq[AchievementRuleConfiguration]]](res) mustBe expectedRes
      }
    }
  }

  "createAchievementRuleConfiguration" should {

    "return BadRequest on empty or blank achievement rule configuration name" in {
      forAll(emptyOrBlankStringGen) { wrongName =>
        testCreateConfigWithWrongAchievementRuleConfigName(wrongName)
      }
    }

    "return BadRequest on too long achievement rule configuration name" in {
      testCreateConfigWithWrongAchievementRuleConfigName(wrongName =
        dummyNonBlankString(maxAchievementConfigNameLength + 1))
    }

    "return BadRequest when achievement condition's value is specified for Nn condition" in {
      val aggregationRuleId = AggregationRuleConfigurationRuleId.random()
      val conditionType = Nn
      val wrongValue = Some("1")
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: A value for achievement condition ${AggregationConditionType.Nn.entryName} should be empty)"
      testCreateConfigWithBadCondition(
        aggregationRuleId,
        testEventFieldName,
        conditionType,
        wrongValue,
        expectedErrorMessage)
    }

    "return BadRequest when achievement rule condition's value is not specified for other condition than Nn" in {
      AggregationConditionType.values.filter(_ != AggregationConditionType.Nn).foreach { conditionType =>
        val aggregationRuleId = AggregationRuleConfigurationRuleId.random()
        val wrongValue = None
        val expectedErrorMessage =
          s"Invalid value for: body (requirement failed: A value for achievement condition type ${conditionType.entryName} must be specified, non-blank and have at most $maxAggregationRuleConditionValueLength characters)"
        testCreateConfigWithBadCondition(
          aggregationRuleId,
          testEventFieldName,
          conditionType,
          wrongValue,
          expectedErrorMessage)
      }
    }

    "return BadRequest when achievement rule condition's value for other condition than Nn is too long" in {
      AggregationConditionType.values.filter(_ != AggregationConditionType.Nn).foreach { conditionType =>
        val aggregationRuleId = AggregationRuleConfigurationRuleId.random()
        val wrongValue = Some(dummyNonBlankString(maxAggregationRuleConditionValueLength + 1))
        val expectedErrorMessage =
          s"Invalid value for: body (requirement failed: A value for achievement condition type ${conditionType.entryName} must be specified, non-blank and have at most $maxAggregationRuleConditionValueLength characters)"
        testCreateConfigWithBadCondition(
          aggregationRuleId,
          testEventFieldName,
          conditionType,
          wrongValue,
          expectedErrorMessage)
      }
    }

    "return BadRequest when achievement rule condition's value for other condition than Nn is empty or blank" in {
      forAll(Gen.some(emptyOrBlankStringGen)) { wrongValue =>
        AggregationConditionType.values.filter(_ != AggregationConditionType.Nn).foreach { conditionType =>
          val aggregationRuleId = AggregationRuleConfigurationRuleId.random()
          val eventFieldName = testEventFieldName
          val expectedErrorMessage =
            s"Invalid value for: body (requirement failed: A value for achievement condition type ${conditionType.entryName} must be specified, non-blank and have at most $maxAggregationRuleConditionValueLength characters)"
          testCreateConfigWithBadCondition(
            aggregationRuleId,
            eventFieldName,
            conditionType,
            wrongValue,
            expectedErrorMessage)
        }
      }
    }
  }

  "createAchievementRuleConfiguration with event payload" should {

    "return BadRequest on empty conditions" in {
      val jsonWithWrongValue =
        createAchievementRuleConfigurationRequestWithEventPayloadJson ++ JsObject(Seq("conditions" -> JsArray()))
      testCreateConfigWithBadRequest(
        jsonWithWrongValue,
        "Invalid value for: body (requirement failed: It's required to specify at least one achievement condition)")
    }

    "return BadRequest on event payload fieldName not matching expected pattern" in {
      forAll(eventFieldNameNotMatchingPatternGen) { wrongEventFieldName =>
        val operationType = ReplaceFrom
        val value = "sample-value"
        val expectedErrorMessage = wrongEventFieldNameErrorMessage("Event action field name", wrongEventFieldName)
        testCreateConfigWithBadEventActionPayload(wrongEventFieldName, operationType, value, expectedErrorMessage)
      }
    }

    "return BadRequest on too long event payload fieldName" in {
      val wrongLength = maxEventFieldNameLength + 1
      val wrongEventFieldName = dummyNonBlankString(wrongLength)
      val operationType = OperationType.ReplaceFrom
      val value = "sample-value"
      val expectedErrorMessage = wrongEventFieldNameErrorMessage("Event action field name", wrongEventFieldName)
      testCreateConfigWithBadEventActionPayload(wrongEventFieldName, operationType, value, expectedErrorMessage)
    }

    "return BadRequest on empty or blank event action field payload value" in {
      forAll(emptyOrBlankStringGen) { wrongValue =>
        val operationType = OperationType.ReplaceFrom
        val expectedErrorMessage = requireNonEmptyAndNonBlankValueWithLengthLimitErrorMessage(
          "Event action field value",
          wrongValue,
          maxAchievementValueLength)
        testCreateConfigWithBadEventActionPayload(testEventFieldName, operationType, wrongValue, expectedErrorMessage)
      }
    }

    "return BadRequest on too long event action field payload value" in {
      val operationType = OperationType.ReplaceFrom
      val wrongLength = maxAchievementValueLength + 1
      val wrongValue = dummyNonBlankString(wrongLength)
      val expectedErrorMessage = requireNonEmptyAndNonBlankValueWithLengthLimitErrorMessage(
        "Event action field value",
        wrongValue,
        maxAchievementValueLength)
      testCreateConfigWithBadEventActionPayload(testEventFieldName, operationType, wrongValue, expectedErrorMessage)
    }

    "return BadRequest when field definition with value to insert doesn't have aggregation rule id specified" in {
      val operationType = OperationType.ReplaceFrom
      val value = "sample-value"
      val expectedErrorMessage =
        "Invalid value for: body (requirement failed: aggregationRuleId should be empty for " +
        s"${OperationType.Static.entryName} and non-empty otherwise)"
      testCreateConfigWithBadEventActionPayload(testEventFieldName, operationType, value, expectedErrorMessage)
    }

    "return BadRequest when field definition with constant value has aggregation rule id specified" in {
      val operationType = OperationType.Static
      val value = "sample-value"
      val expectedErrorMessage =
        "Invalid value for: body (requirement failed: aggregationRuleId should be empty for " +
        s"${OperationType.Static.entryName} and non-empty otherwise)"
      testCreateConfigWithBadEventActionPayload(
        testEventFieldName,
        operationType,
        value,
        expectedErrorMessage,
        Some(AggregationRuleConfigurationRuleId.dummyId))
    }

    "return BadRequest when field definition has different aggregation rule than one specified in conditions" in {
      val operationType = OperationType.ReplaceFrom
      val value = "sample-value"
      val wrongRuleId = AggregationRuleConfigurationRuleId.random()
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: Action fields refer to aggregation rules not included in the conditions: $wrongRuleId)"
      testCreateConfigWithBadEventActionPayload(
        testEventFieldName,
        operationType,
        value,
        expectedErrorMessage,
        Some(wrongRuleId))
    }

    "return a created achievement rule configuration" in {
      forAll(achievementRuleConfigGen, allowedProjectIdGen) { case (achievementRuleConfiguration, projectId) =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns an aggregation rule configuration
        (boundedContext
          .createAchievementRuleConfiguration(_: CreateAchievementRuleConfigurationRequest, _: ProjectId)(
            _: ExecutionContext))
          .expects(createAchievementRuleConfigurationWithEventPayloadRequest, projectId, *)
          .returning(EitherT[Future, CreateAchievementRuleConfigurationError, AchievementRuleConfiguration](
            Future.successful(Right(achievementRuleConfiguration))))
          .once()
        val request =
          FakeRequest(
            POST,
            testAchievementRulesEndpointPath(projectId),
            headersWithFakeJwt,
            AnyContentAsJson(createAchievementRuleConfigurationRequestWithEventPayloadJson))

        sendAndExpectAchievementRuleConfiguration(achievementRuleConfiguration, request, expectedStatusCode = CREATED)
      }
    }
  }

  "createAchievementRuleConfiguration with webhook payload" should {

    "return BadRequest on empty target url" in {
      forAll(emptyOrBlankStringGen) { wrongValue =>
        testCreateConfigWithWrongTargetUrlLength(blankOrTooLongUrl = wrongValue)
      }
    }

    "return BadRequest on too long target url" in {
      testCreateConfigWithWrongTargetUrlLength(blankOrTooLongUrl =
        dummyNonBlankString(maxAchievementWebhookActionTargetUrlLength + 1))
    }

    "return BadRequest on wrong target url format" in {
      val wrongUrl = "foo"
      val jsonWithWrongConfigName =
        achievementRuleConfigWithWebhookJsonWithChangedTargetUrl(
          createAchievementRuleConfigurationRequestWithWebhookWithEventPayloadJson,
          wrongUrl)
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: Webhook action target URL '$wrongUrl' is not a proper HTTP(S) URL)"
      testCreateConfigWithBadRequest(jsonWithWrongConfigName, expectedErrorMessage)
    }

    "return BadRequest on event payload fieldName not matching expected pattern" in {
      forAll(eventFieldNameNotMatchingPatternGen) { wrongEventFieldName =>
        val operationType = OperationType.ReplaceFrom
        val value = "sample-value"
        val expectedErrorMessage = wrongEventFieldNameErrorMessage("Webhook action field name", wrongEventFieldName)
        testCreateConfigWithBadWebhookActionEventPayload(
          wrongEventFieldName,
          operationType,
          value,
          expectedErrorMessage)
      }
    }

    "return BadRequest on too long event payload fieldName" in {
      val wrongLength = maxEventFieldNameLength + 1
      val wrongEventFieldName = dummyNonBlankString(wrongLength)
      val operationType = OperationType.ReplaceFrom
      val value = "sample-value"
      val expectedErrorMessage = wrongEventFieldNameErrorMessage("Webhook action field name", wrongEventFieldName)
      testCreateConfigWithBadWebhookActionEventPayload(wrongEventFieldName, operationType, value, expectedErrorMessage)
    }

    "return BadRequest on empty or blank event action field payload value" in {
      forAll(emptyOrBlankStringGen) { wrongValue =>
        val operationType = OperationType.ReplaceFrom
        val expectedErrorMessage = requireNonEmptyAndNonBlankValueWithLengthLimitErrorMessage(
          "Webhook action field value",
          wrongValue,
          maxAchievementValueLength)
        testCreateConfigWithBadWebhookActionEventPayload(
          testEventFieldName,
          operationType,
          wrongValue,
          expectedErrorMessage)
      }
    }

    "return BadRequest on too long event action field payload value" in {
      val operationType = OperationType.ReplaceFrom
      val wrongLength = maxAchievementValueLength + 1
      val wrongValue = dummyNonBlankString(wrongLength)
      val expectedErrorMessage = requireNonEmptyAndNonBlankValueWithLengthLimitErrorMessage(
        "Webhook action field value",
        wrongValue,
        maxAchievementValueLength)
      testCreateConfigWithBadWebhookActionEventPayload(
        testEventFieldName,
        operationType,
        wrongValue,
        expectedErrorMessage)
    }

    "return BadRequest when field definition with value to insert doesn't have aggregation rule id specified" in {
      val operationType = OperationType.ReplaceFrom
      val value = "sample-value"
      val expectedErrorMessage =
        "Invalid value for: body (requirement failed: aggregationRuleId should be empty for " +
        s"${OperationType.Static.entryName} and non-empty otherwise)"
      testCreateConfigWithBadWebhookActionEventPayload(testEventFieldName, operationType, value, expectedErrorMessage)
    }

    "return BadRequest when field definition with constant value has aggregation rule id specified" in {
      val operationType = OperationType.Static
      val value = "sample-value"
      val expectedErrorMessage =
        "Invalid value for: body (requirement failed: aggregationRuleId should be empty for " +
        s"${OperationType.Static.entryName} and non-empty otherwise)"
      testCreateConfigWithBadWebhookActionEventPayload(
        testEventFieldName,
        operationType,
        value,
        expectedErrorMessage,
        Some(AggregationRuleConfigurationRuleId.dummyId))
    }

    "return BadRequest when field definition has different aggregation rule than one specified in conditions" in {
      val operationType = OperationType.ReplaceFrom
      val value = "sample-value"
      val wrongRuleId = AggregationRuleConfigurationRuleId.random()
      val expectedErrorMessage =
        s"Invalid value for: body (requirement failed: Action fields refer to aggregation rules not included in the conditions: $wrongRuleId)"
      testCreateConfigWithBadWebhookActionEventPayload(
        testEventFieldName,
        operationType,
        value,
        expectedErrorMessage,
        Some(wrongRuleId))
    }

    "return a created achievement rule configuration when sending config with webhook with event" in {
      forAll(achievementRuleConfigGen, allowedProjectIdGen) { case (achievementRuleConfiguration, projectId) =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns an aggregation rule configuration
        (boundedContext
          .createAchievementRuleConfiguration(_: CreateAchievementRuleConfigurationRequest, _: ProjectId)(
            _: ExecutionContext))
          .expects(createAchievementRuleConfigurationWithWebhookPayloadWithEventRequest, projectId, *)
          .returning(EitherT[Future, CreateAchievementRuleConfigurationError, AchievementRuleConfiguration](
            Future.successful(Right(achievementRuleConfiguration))))
          .once()
        val request =
          FakeRequest(
            POST,
            testAchievementRulesEndpointPath(projectId),
            headersWithFakeJwt,
            AnyContentAsJson(createAchievementRuleConfigurationRequestWithWebhookWithEventPayloadJson))

        sendAndExpectAchievementRuleConfiguration(achievementRuleConfiguration, request, expectedStatusCode = CREATED)
      }
    }

    "return a created achievement rule configuration when sending config with webhook without event" in {
      forAll(achievementRuleConfigGen, allowedProjectIdGen) { case (achievementRuleConfiguration, projectId) =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns an aggregation rule configuration
        (boundedContext
          .createAchievementRuleConfiguration(_: CreateAchievementRuleConfigurationRequest, _: ProjectId)(
            _: ExecutionContext))
          .expects(createAchievementRuleConfigurationWithWebhookPayloadWithoutEventRequest, projectId, *)
          .returning(EitherT[Future, CreateAchievementRuleConfigurationError, AchievementRuleConfiguration](
            Future.successful(Right(achievementRuleConfiguration))))
          .once()
        val request =
          FakeRequest(
            POST,
            testAchievementRulesEndpointPath(projectId),
            headersWithFakeJwt,
            AnyContentAsJson(createAchievementRuleConfigurationRequestWithWebhookWithoutEventPayloadJson))

        sendAndExpectAchievementRuleConfiguration(achievementRuleConfiguration, request, expectedStatusCode = CREATED)
      }
    }
  }

  "getAchievementRuleConfiguration" should {
    "return an achievement rule configuration" in {
      forAll(achievementRuleConfigGen, allowedProjectIdGen) { case (achievementRuleConfiguration, projectId) =>
        checkReadPermissionIsExpected()
        // GIVEN: bounded context which always returns an aggregation rule configuration
        (boundedContext
          .getAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, projectId, *)
          .returning(EitherT[Future, GetAchievementRuleConfigurationError, AchievementRuleConfiguration](
            Future.successful(Right(achievementRuleConfiguration))))
          .once()
        val request =
          FakeRequest(GET, testAchievementRuleEndpointPath(projectId, ruleId), headersWithFakeJwt, AnyContentAsEmpty)

        sendAndExpectAchievementRuleConfiguration(achievementRuleConfiguration, request)
      }
    }

    "return InternalServerError on unexpected error" in {
      checkReadPermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .getAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, primaryProjectId, *)
        .returning(EitherT[Future, GetAchievementRuleConfigurationError, AchievementRuleConfiguration](
          Future.successful(Left(unexpectedRuleConfiguratorError))))
        .once()
      val request = FakeRequest(GET, primaryProjectAchievementRuleEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectInternalError(request)
    }

    "return NotFound when achievement rule configuration could not be found" in {
      checkReadPermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .getAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, primaryProjectId, *)
        .returning(EitherT[Future, GetAchievementRuleConfigurationError, AchievementRuleConfiguration](
          Future.successful(Left(achievementRuleConfigNotFoundError))))
        .once()
      val request = FakeRequest(GET, primaryProjectAchievementRuleEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectAchievementRuleConfigNotFound(request)
    }
  }

  "updateAchievementRuleConfiguration" should {
    "return an updated achievement rule configuration" in {
      forAll(achievementRuleConfigGen, allowedProjectIdGen) { case (achievementRuleConfiguration, projectId) =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns an aggregation rule configuration
        (boundedContext
          .updateAchievementRuleConfiguration(
            _: AchievementConfigurationRuleId,
            _: UpdateAchievementRuleConfigurationRequest,
            _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, activateAchievementRuleConfigurationRequest, projectId, *)
          .returning(EitherT[Future, UpdateAchievementRuleConfigurationError, AchievementRuleConfiguration](
            Future.successful(Right(achievementRuleConfiguration))))
          .once()
        val request = FakeRequest(
          PATCH,
          testAchievementRuleEndpointPath(projectId, ruleId),
          headersWithFakeJwt,
          AnyContentAsJson(activateAchievementRuleConfigurationRequestJson))

        sendAndExpectAchievementRuleConfiguration(achievementRuleConfiguration, request)
      }
    }

    "return InternalServerError on unexpected error" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .updateAchievementRuleConfiguration(
          _: AchievementConfigurationRuleId,
          _: UpdateAchievementRuleConfigurationRequest,
          _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, activateAchievementRuleConfigurationRequest, primaryProjectId, *)
        .returning(EitherT[Future, UpdateAchievementRuleConfigurationError, AchievementRuleConfiguration](
          Future.successful(Left(unexpectedRuleConfiguratorError))))
        .once()
      val request =
        FakeRequest(
          PATCH,
          primaryProjectAchievementRuleEndpointPath,
          headersWithFakeJwt,
          AnyContentAsJson(activateAchievementRuleConfigurationRequestJson))

      sendAndExpectInternalError(request)
    }

    "return NotFound when achievement rule configuration could not be found" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .updateAchievementRuleConfiguration(
          _: AchievementConfigurationRuleId,
          _: UpdateAchievementRuleConfigurationRequest,
          _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, activateAchievementRuleConfigurationRequest, primaryProjectId, *)
        .returning(EitherT[Future, UpdateAchievementRuleConfigurationError, AchievementRuleConfiguration](
          Future.successful(Left(achievementRuleConfigNotFoundError))))
        .once()
      val request =
        FakeRequest(
          PATCH,
          primaryProjectAchievementRuleEndpointPath,
          headersWithFakeJwt,
          AnyContentAsJson(activateAchievementRuleConfigurationRequestJson))

      sendAndExpectAchievementRuleConfigNotFound(request)
    }

    "return BadRequest when update request doesn't contain fields to change" in {
      val expectedErrorMessage = "Invalid value for: body (requirement failed: No data to update specified)"
      val request =
        FakeRequest(
          PATCH,
          primaryProjectAchievementRuleEndpointPath,
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

  "deleteAchievementRuleConfiguration" should {
    "return only status code" in {
      forAll(allowedProjectIdGen) { projectId =>
        checkWritePermissionIsExpected()
        // GIVEN: bounded context which always returns Unit
        (boundedContext
          .deleteAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
          .expects(ruleId, projectId, *)
          .returning(EitherT[Future, DeleteAchievementRuleConfigurationError, Unit](Future.successful(Right(()))))
          .once()
        val request =
          FakeRequest(DELETE, testAchievementRuleEndpointPath(projectId, ruleId), headersWithFakeJwt, AnyContentAsEmpty)

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
        .deleteAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, primaryProjectId, *)
        .returning(EitherT[Future, DeleteAchievementRuleConfigurationError, Unit](
          Future.successful(Left(unexpectedRuleConfiguratorError))))
        .once()
      val request =
        FakeRequest(DELETE, primaryProjectAchievementRuleEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectInternalError(request)
    }

    "return NotFound when achievement rule configuration could not be found" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .deleteAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, primaryProjectId, *)
        .returning(EitherT[Future, DeleteAchievementRuleConfigurationError, Unit](
          Future.successful(Left(achievementRuleConfigNotFoundError))))
        .once()
      val request =
        FakeRequest(DELETE, primaryProjectAchievementRuleEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectAchievementRuleConfigNotFound(request)
    }

    "return Conflict when aggregation rule configuration is active" in {
      checkWritePermissionIsExpected()
      // GIVEN: bounded context which always returns an error
      (boundedContext
        .deleteAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(ruleId, primaryProjectId, *)
        .returning(EitherT[Future, DeleteAchievementRuleConfigurationError, Unit](
          Future.successful(Left(achievementRuleConfigIsActiveError))))
        .once()
      val request =
        FakeRequest(DELETE, primaryProjectAchievementRuleEndpointPath, headersWithFakeJwt, AnyContentAsEmpty)

      sendAndExpectAchievementRuleConfigIsActiveError(request)
    }
  }

  private def testCreateConfigWithWrongAchievementRuleConfigName(wrongName: String) = {
    val jsonWithWrongConfigName =
      achievementRuleConfigJsonWithChangedName(createAchievementRuleConfigurationRequestWithEventPayloadJson, wrongName)
    val expectedErrorMessage = requireNonEmptyAndNonBlankValueWithLengthLimitErrorMessage(
      "Achievement rule configuration name",
      wrongName,
      maxAchievementConfigNameLength)
    testCreateConfigWithBadRequest(jsonWithWrongConfigName, expectedErrorMessage)
  }

  private def testCreateConfigWithWrongTargetUrlLength(blankOrTooLongUrl: String) = {
    val jsonWithWrongConfigName =
      achievementRuleConfigWithWebhookJsonWithChangedTargetUrl(
        createAchievementRuleConfigurationRequestWithWebhookWithEventPayloadJson,
        blankOrTooLongUrl)
    val expectedErrorMessage = requireNonEmptyAndNonBlankValueWithLengthLimitErrorMessage(
      "Webhook action target URL",
      blankOrTooLongUrl,
      maxAchievementConfigNameLength)
    testCreateConfigWithBadRequest(jsonWithWrongConfigName, expectedErrorMessage)
  }

  private def testCreateConfigWithBadEventActionPayload(
      fieldName: String,
      operationType: OperationType,
      value: String,
      expectedErrorMessage: String,
      aggregationRuleId: Option[AggregationRuleConfigurationRuleId] = None) = {
    val jsonWithWrongValue =
      achievementRuleConfigJsonWithAdditionalEventPayloadField(
        createAchievementRuleConfigurationRequestWithEventPayloadJson,
        fieldName,
        operationType,
        aggregationRuleId,
        value)
    testCreateConfigWithBadRequest(jsonWithWrongValue, expectedErrorMessage)
  }

  private def testCreateConfigWithBadWebhookActionEventPayload(
      fieldName: String,
      operationType: OperationType,
      value: String,
      expectedErrorMessage: String,
      aggregationRuleId: Option[AggregationRuleConfigurationRuleId] = None) = {
    val jsonWithWrongValue =
      achievementRuleConfigJsonWithAdditionalWebhookPayloadEventField(
        createAchievementRuleConfigurationRequestWithWebhookWithEventPayloadJson,
        fieldName,
        operationType,
        aggregationRuleId,
        value)
    testCreateConfigWithBadRequest(jsonWithWrongValue, expectedErrorMessage)
  }

  private def testCreateConfigWithBadCondition(
      aggregationRuleId: AggregationRuleConfigurationRuleId,
      aggregationFieldName: String,
      conditionType: AggregationConditionType,
      value: Option[String],
      expectedErrorMessage: String) = {
    val jsonWithWrongValue =
      achievementRuleConfigJsonWithAdditionalCondition(
        createAchievementRuleConfigurationRequestWithEventPayloadJson,
        aggregationRuleId,
        aggregationFieldName,
        conditionType,
        value)
    testCreateConfigWithBadRequest(jsonWithWrongValue, expectedErrorMessage)
  }

  private def testCreateConfigWithBadRequest(wrongJson: JsObject, expectedErrorMessage: String) = {
    checkWritePermissionIsExpected()
    val request =
      FakeRequest(POST, primaryProjectAchievementRulesEndpointPath, headersWithFakeJwt, AnyContentAsJson(wrongJson))
    val res = route(app, request).value

    status(res) mustBe BAD_REQUEST
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[ErrorOutput]](res) mustBe errorOutputResponse(
      PresentationErrorCode.BadRequest,
      expectedErrorMessage)
  }

  private def sendAndExpectAchievementRuleConfiguration[T: Writeable](
      achievementRuleConfiguration: AchievementRuleConfiguration,
      request: FakeRequest[T],
      expectedStatusCode: Int = OK) = {
    // WHEN: we send a request
    val res = route(app, request).value

    // THEN: the request succeeded and the proper config is returned
    val expectedRes = Response.asSuccess(achievementRuleConfiguration)
    status(res) mustBe expectedStatusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[AchievementRuleConfiguration]](res) mustBe expectedRes
  }

  private def sendAndExpectAchievementRuleConfigIsActiveError[T: Writeable](request: FakeRequest[T]) =
    sendAndExpectErrorCode(request, CONFLICT, AchievementRuleConfigurationIsActive)

  private def sendAndExpectAchievementRuleConfigNotFound[T: Writeable](request: FakeRequest[T]) =
    sendAndExpectErrorCode(request, NOT_FOUND, AchievementRuleConfigurationNotFound)

  protected def sendAndExpectAchievementRuleConfigForbidden[T: Writeable](request: FakeRequest[T]) =
    sendAndExpectErrorCode(request, FORBIDDEN, Forbidden)
}
