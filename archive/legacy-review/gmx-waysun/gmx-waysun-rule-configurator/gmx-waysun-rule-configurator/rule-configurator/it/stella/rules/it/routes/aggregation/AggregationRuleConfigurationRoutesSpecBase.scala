package stella.rules.it.routes.aggregation

import java.time.ZoneOffset
import java.util.UUID

import com.softwaremill.quicklens._
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.rules.it.TestAuthContext
import stella.rules.it.routes.RoutesSpecBase
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.achievement.OperationType.Static
import stella.rules.models.achievement.http.AchievementEventActionPayload
import stella.rules.models.achievement.http.EventActionField
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.aggregation.http.CreateRequestResetFrequency
import stella.rules.models.aggregation.http.UpdateAggregationRuleConfigurationRequest
import stella.rules.routes.ResponseFormats._
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestConstants.Endpoint.aggregationRulesEndpointPathWithIncludeInactiveParam
import stella.rules.routes.error.AdditionalPresentationErrorCode
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationNotFound

trait AggregationRuleConfigurationRoutesSpecBase extends RoutesSpecBase {

  protected def testAggregationRulesEndpointPath(authContext: TestAuthContext): String
  protected def testAggregationRulesEndpointPathWithIncludeInactiveParam(
      authContext: TestAuthContext,
      includeInactive: Boolean): String
  protected def testAggregationRuleEndpointPath(
      authContext: TestAuthContext,
      ruleId: AggregationRuleConfigurationRuleId): String

  protected def createTestAggregationRuleConfiguration(
      requestPayload: CreateAggregationRuleConfigurationRequest,
      authContext: TestAuthContext): AggregationRuleConfiguration

  trait TestContext {
    val authContext = TestAuthContext()
    val eventConfig = createDefaultEventConfiguration(authContext)
  }

  "creating aggregation rule configuration" should {
    "return error when event config does not exist" in new TestContext {
      val requestPayload = createAggregationRuleConfigurationRequest.copy(eventConfigurationId =
        EventConfigurationEventId(UUID.randomUUID()))
      val requestPayloadJson =
        CreateAggregationRuleConfigurationRequest.createAggregationRuleConfigurationRequestPlayFormat.writes(
          requestPayload)
      testFailedRequest(
        request = FakeRequest(
          POST,
          testAggregationRulesEndpointPath(authContext),
          headersWithJwt,
          AnyContentAsJson(requestPayloadJson)),
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = EventConfigurationNotFound,
        authContext = authContext)
    }

    "return error when event config belongs to a different project" in new TestContext {
      val otherProjectAuthContext = TestAuthContext()

      val requestPayload = createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId)
      val requestPayloadJson =
        CreateAggregationRuleConfigurationRequest.createAggregationRuleConfigurationRequestPlayFormat.writes(
          requestPayload)
      testFailedRequest(
        request = FakeRequest(
          POST,
          testAggregationRulesEndpointPath(otherProjectAuthContext),
          headersWithJwt,
          AnyContentAsJson(requestPayloadJson)),
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationNotFound,
        authContext = otherProjectAuthContext)
    }

    "return proper aggregation rule configuration" in new TestContext {
      createEventConfiguration(createEventConfigurationRequest2, authContext) // this one won't be used
      val request = createAggregationRuleConfigurationRequest(eventConfig)
      val config = createTestAggregationRuleConfiguration(request, authContext)

      config.name mustBe request.name
      config.description mustBe request.description
      config.eventConfigurationId mustBe request.eventConfigurationId
      config.resetFrequency.interval mustBe request.resetFrequency.interval
      config.resetFrequency.windowStartDateUTC mustBe request.resetFrequency.windowStartDateUTC.getOrElse(
        CreateRequestResetFrequency
          .asOffsetDateTimeTruncated(request.resetFrequency.interval, testClock.currentUtcOffsetDateTime()))
      config.resetFrequency.intervalDetails mustBe request.resetFrequency.intervalDetails
      config.aggregationType mustBe request.aggregationType
      config.aggregationFieldName mustBe request.aggregationFieldName
      config.aggregationGroupByFieldName mustBe request.aggregationGroupByFieldName
      config.isActive mustBe true
      config.updatedAt mustBe testClock.currentUtcOffsetDateTime()
      config.updatedAt.getOffset mustBe ZoneOffset.UTC
      config.createdAt mustBe config.updatedAt
    }

    "create aggregation rule configuration even if event config is inactive" in new TestContext {
      deactivateEventConfiguration(eventConfig.eventId, authContext)
      val request = createAggregationRuleConfigurationRequest(eventConfig)
      createTestAggregationRuleConfiguration(request, authContext)
    }

    "always return different ruleId and current time" in new TestContext {
      val eventConfig2 = createEventConfiguration(createEventConfigurationRequest2, authContext)
      val config =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest(eventConfig), authContext)
      val secondCreationTime = testClock.moveTime()
      val config2 =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest2(eventConfig2), authContext)
      config.aggregationRuleId must not be config2.aggregationRuleId
      config2.updatedAt must be > config.updatedAt
      config2.updatedAt mustBe secondCreationTime
      config2.createdAt mustBe config2.updatedAt
    }

    "properly create aggregation rule configurations even if they use the same event config" in new TestContext {
      val config =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest(eventConfig), authContext)
      val config2 =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest2(eventConfig), authContext)
      config.aggregationRuleId must not be config2.aggregationRuleId
    }

    "return proper aggregation rule configuration when creating a second aggregation rule configuration with the same name but for different project" in new TestContext {
      val otherAuthContext = TestAuthContext()
      val eventConfig2 = createEventConfiguration(createEventConfigurationRequest, otherAuthContext)
      val config =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest(eventConfig), authContext)
      val config2 =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest(eventConfig2),
          otherAuthContext)

      config.aggregationRuleId must not be config2.aggregationRuleId
      config.name mustBe config2.name
    }

    "return conflict when creating a second aggregation rule configuration with the same name for the same project" in new TestContext {
      createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest(eventConfig), authContext)
      val requestPayloadJson =
        CreateAggregationRuleConfigurationRequest.createAggregationRuleConfigurationRequestPlayFormat.writes(
          createAggregationRuleConfigurationRequest(eventConfig))
      val request =
        FakeRequest(
          POST,
          testAggregationRulesEndpointPath(authContext),
          headersWithJwt,
          AnyContentAsJson(requestPayloadJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationNameAlreadyUsed,
        authContext = authContext)
    }
  }

  "get aggregation rule configuration" should {
    "return not found error for a non-existing id" in new TestContext {
      val path = testAggregationRuleEndpointPath(authContext, AggregationRuleConfigurationRuleId.random())
      val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationNotFound,
        authContext = authContext)
    }

    "return not found error when an aggregation rule configuration belongs to a different project" in new TestContext {
      val otherProjectAuthContext = TestAuthContext()
      val createdConfig =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest(eventConfig), authContext)

      val path = testAggregationRuleEndpointPath(otherProjectAuthContext, createdConfig.aggregationRuleId)
      val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationNotFound,
        authContext = otherProjectAuthContext)
    }

    "return proper aggregation rule configuration" in new TestContext {
      val createdConfig =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest(eventConfig), authContext)
      val createdConfig2 =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest2(eventConfig), authContext)

      val config = getAggregationRuleConfiguration(createdConfig.aggregationRuleId, authContext)
      val config2 = getAggregationRuleConfiguration(createdConfig2.aggregationRuleId, authContext)

      config mustBe createdConfig
      config2 mustBe createdConfig2
    }
  }

  "updating aggregation rule configuration" should {
    "return not found error for a non-existing id" in new TestContext {
      val path = testAggregationRuleEndpointPath(authContext, AggregationRuleConfigurationRuleId.random())
      val request =
        FakeRequest(PATCH, path, headersWithJwt, AnyContentAsJson(deactivateAggregationRuleConfigurationRequestJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationNotFound,
        authContext = authContext)
    }

    "return not found error when an aggregation rule configuration belongs to a different project" in new TestContext {
      val otherProjectAuthContext = TestAuthContext()
      val createdConfig =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest(eventConfig), authContext)

      val path = testAggregationRuleEndpointPath(otherProjectAuthContext, createdConfig.aggregationRuleId)
      val request =
        FakeRequest(PATCH, path, headersWithJwt, AnyContentAsJson(deactivateAggregationRuleConfigurationRequestJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationNotFound,
        authContext = otherProjectAuthContext)
    }

    "properly change state to inactive" in new TestContext {
      // GIVEN: aggregation rule configuration
      val config =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
          authContext)
      val config2 =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest2.copy(eventConfigurationId = eventConfig.eventId),
          authContext)

      val deactivationTime = testClock.moveTime()
      // WHEN: config is deactivated
      val deactivatedConfig =
        deactivateAggregationRuleConfig(config.aggregationRuleId, authContext)

      // THEN: activation state and updatedAt are updated
      deactivatedConfig.aggregationRuleId mustBe config.aggregationRuleId
      deactivatedConfig.name mustBe config.name
      deactivatedConfig.description mustBe config.description
      deactivatedConfig.eventConfigurationId mustBe config.eventConfigurationId
      deactivatedConfig.resetFrequency mustBe config.resetFrequency
      deactivatedConfig.aggregationType mustBe config.aggregationType
      deactivatedConfig.aggregationFieldName mustBe config.aggregationFieldName
      deactivatedConfig.aggregationGroupByFieldName mustBe config.aggregationGroupByFieldName
      deactivatedConfig.isActive mustBe false
      deactivatedConfig.createdAt mustBe config.createdAt
      deactivatedConfig.updatedAt must be > config.updatedAt
      deactivatedConfig.updatedAt mustBe deactivationTime
      // AND: fetching aggregation rule configurations shows that the change is persisted and other configurations are not changed
      testAggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive = true, authContext) mustBe Seq(
        deactivatedConfig,
        config2)
    }

    "properly change state to active" in new TestContext {
      // GIVEN: three aggregation rule configurations, two are inactive
      val eventConfig2 = createEventConfiguration(createEventConfigurationRequest2, authContext)
      val eventConfig3 = createEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)
      testClock.moveTime()
      val config =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
          authContext)
      val config2 =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest2.copy(eventConfigurationId = eventConfig2.eventId),
          authContext)
      val config3 =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest3.copy(eventConfigurationId = eventConfig3.eventId),
          authContext)
      val deactivatedConfig = deactivateAggregationRuleConfig(config.aggregationRuleId, authContext)
      val deactivatedConfig2 = deactivateAggregationRuleConfig(config2.aggregationRuleId, authContext)

      val activationTime = testClock.moveTime()
      // WHEN: first one is reactivated
      val reactivatedConfig = activateAggregationRuleConfig(config.aggregationRuleId, authContext)

      // THEN: activation state and updatedAt are updated
      reactivatedConfig.aggregationRuleId mustBe deactivatedConfig.aggregationRuleId
      reactivatedConfig.name mustBe deactivatedConfig.name
      reactivatedConfig.description mustBe deactivatedConfig.description
      reactivatedConfig.eventConfigurationId mustBe deactivatedConfig.eventConfigurationId
      reactivatedConfig.resetFrequency mustBe deactivatedConfig.resetFrequency
      reactivatedConfig.aggregationType mustBe deactivatedConfig.aggregationType
      reactivatedConfig.aggregationFieldName mustBe deactivatedConfig.aggregationFieldName
      reactivatedConfig.aggregationGroupByFieldName mustBe deactivatedConfig.aggregationGroupByFieldName
      reactivatedConfig.isActive mustBe true
      reactivatedConfig.createdAt mustBe deactivatedConfig.createdAt
      reactivatedConfig.updatedAt must be > deactivatedConfig.updatedAt
      reactivatedConfig.updatedAt mustBe activationTime
      // AND: fetching aggregation rule configurations shows that the change is persisted and other configurations are not changed
      testAggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive = true, authContext) mustBe Seq(
        reactivatedConfig,
        deactivatedConfig2,
        config3)
    }

    "just return aggregation rule configuration when deactivating already inactive event configuration" in new TestContext {
      // GIVEN: inactive aggregation rule configuration
      val config =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest(eventConfig), authContext)
      testClock.moveTime()
      val deactivatedConfig = deactivateAggregationRuleConfig(config.aggregationRuleId, authContext)
      testClock.moveTime()

      // WHEN: we try to deactivate an inactive aggregation rule configuration
      val returnedConfig = deactivateAggregationRuleConfig(config.aggregationRuleId, authContext)

      // THEN: nothing has changed, we got the same aggregation rule configuration as previously
      returnedConfig mustBe deactivatedConfig
      // AND: fetching aggregation rule configuration proves the persisted state is as expected
      getAggregationRuleConfiguration(config.aggregationRuleId, authContext) mustBe returnedConfig
    }

    "just return aggregation rule configuration when activating already active aggregation rule configuration" in new TestContext {
      // GIVEN: active event configuration
      val config =
        createTestAggregationRuleConfiguration(createAggregationRuleConfigurationRequest(eventConfig), authContext)
      testClock.moveTime()

      // WHEN: we try to activate an active aggregation rule configuration
      val returnedConfig = activateAggregationRuleConfig(config.aggregationRuleId, authContext)

      // THEN: nothing has changed, we got the same aggregation rule configuration as previously
      returnedConfig mustBe config
      // AND: fetching aggregation rule configuration proves the persisted state is as expected
      getAggregationRuleConfiguration(config.aggregationRuleId, authContext) mustBe returnedConfig
    }

    "properly change description of active config" in new TestContext {
      // GIVEN: aggregation rule configurations
      val config =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
          authContext)
      val config2 =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest2.copy(eventConfigurationId = eventConfig.eventId),
          authContext)

      val updateTime = testClock.moveTime()
      val newDescription = "a modified description"
      // WHEN: we modify description
      val updatedConfig =
        updateAggregationRuleConfig(config.aggregationRuleId, authContext, description = Some(newDescription))

      // THEN: description and updatedAt are updated
      updatedConfig.aggregationRuleId mustBe config.aggregationRuleId
      updatedConfig.name mustBe config.name
      updatedConfig.description mustBe newDescription
      updatedConfig.eventConfigurationId mustBe config.eventConfigurationId
      updatedConfig.resetFrequency mustBe config.resetFrequency
      updatedConfig.aggregationType mustBe config.aggregationType
      updatedConfig.aggregationFieldName mustBe config.aggregationFieldName
      updatedConfig.aggregationGroupByFieldName mustBe config.aggregationGroupByFieldName
      updatedConfig.isActive mustBe config.isActive
      updatedConfig.createdAt mustBe config.createdAt
      updatedConfig.updatedAt must be > config.updatedAt
      updatedConfig.updatedAt mustBe updateTime
      // AND: fetching aggregation rule configurations shows that the change is persisted and other configurations are not changed
      testAggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive = true, authContext) mustBe Seq(
        updatedConfig,
        config2)
    }

    "properly change description of inactive config" in new TestContext {
      // GIVEN: aggregation rule configurations
      testClock.moveTime()
      val config =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
          authContext)
      val config2 =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest2.copy(eventConfigurationId = eventConfig.eventId),
          authContext)
      val deactivatedConfig = deactivateAggregationRuleConfig(config.aggregationRuleId, authContext)
      val deactivatedConfig2 = deactivateAggregationRuleConfig(config2.aggregationRuleId, authContext)

      val updateTime = testClock.moveTime()
      val newDescription = "a modified description"
      // WHEN: we modify description
      val updatedConfig =
        updateAggregationRuleConfig(config.aggregationRuleId, authContext, description = Some(newDescription))

      // THEN: description and updatedAt are updated
      updatedConfig.aggregationRuleId mustBe deactivatedConfig.aggregationRuleId
      updatedConfig.name mustBe deactivatedConfig.name
      updatedConfig.description mustBe newDescription
      updatedConfig.eventConfigurationId mustBe deactivatedConfig.eventConfigurationId
      updatedConfig.resetFrequency mustBe deactivatedConfig.resetFrequency
      updatedConfig.aggregationType mustBe deactivatedConfig.aggregationType
      updatedConfig.aggregationFieldName mustBe deactivatedConfig.aggregationFieldName
      updatedConfig.aggregationGroupByFieldName mustBe deactivatedConfig.aggregationGroupByFieldName
      updatedConfig.isActive mustBe deactivatedConfig.isActive
      updatedConfig.createdAt mustBe deactivatedConfig.createdAt
      updatedConfig.updatedAt must be > deactivatedConfig.updatedAt
      updatedConfig.updatedAt mustBe updateTime
      // AND: fetching aggregation rule configurations shows that the change is persisted and other configurations are not changed
      testAggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive = true, authContext) mustBe Seq(
        updatedConfig,
        deactivatedConfig2)
    }

    "properly change activation state and description at the same time" in new TestContext {
      // GIVEN: aggregation rule configuration
      val config =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
          authContext)

      val newDescription = "a modified description"
      val newDescription2 = "another description"
      val updatedConfig =
        updateAggregationRuleConfig(
          config.aggregationRuleId,
          authContext,
          isActive = Some(false),
          description = Some(newDescription))

      updatedConfig.isActive mustBe false
      updatedConfig.description mustBe newDescription
      testAggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive = true, authContext) mustBe Seq(
        updatedConfig)

      val updatedConfig2 =
        updateAggregationRuleConfig(
          config.aggregationRuleId,
          authContext,
          isActive = Some(true),
          description = Some(newDescription2))

      updatedConfig2.isActive mustBe true
      updatedConfig2.description mustBe newDescription2
      testAggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive = false, authContext) mustBe Seq(
        updatedConfig2)
    }
  }

  "fetching all aggregation rule configurations" should {
    "return empty list if there are no aggregation rule configurations" in new TestContext {
      testAggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive = true, authContext) mustBe Nil
    }

    "return only active aggregation rule configurations" in {
      testGetOnlyActiveAggregationRuleConfigs(withFlag = false)
    }

    "return only active aggregation rule configurations when a flag to include inactive ones is set to false" in {
      testGetOnlyActiveAggregationRuleConfigs(withFlag = true)
    }

    "return all aggregation rule configurations when a flag to include inactive ones is set to true" in new TestContext {
      // GIVEN: two active aggregation rule configurations and one inactive config
      val eventConfig2 = createEventConfiguration(createEventConfigurationRequest2, authContext)
      val eventConfig3 = createEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)
      val config =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
          authContext)
      val config2 =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest2.copy(eventConfigurationId = eventConfig2.eventId),
          authContext)
      val config3 =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest3.copy(eventConfigurationId = eventConfig3.eventId),
          authContext)
      val deactivatedConfig2 = deactivateAggregationRuleConfig(config2.aggregationRuleId, authContext)

      val expectedResultDetails = Seq(config, deactivatedConfig2, config3)
      testAggregationRulesEndpointPathWithIncludeInactiveParam(
        includeInactive = true,
        authContext) mustBe expectedResultDetails
    }

    "return only configurations for a given project" in new TestContext {
      // GIVEN: two aggregation rule configurations for one project and one config for other project
      val otherProjectAuthContext = TestAuthContext()
      val eventConfig2 = createEventConfiguration(createEventConfigurationRequest2, otherProjectAuthContext)
      val eventConfig3 = createEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)
      val config =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
          authContext)
      createTestAggregationRuleConfiguration(
        createAggregationRuleConfigurationRequest2.copy(eventConfigurationId = eventConfig2.eventId),
        otherProjectAuthContext)
      val config3 =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest3.copy(eventConfigurationId = eventConfig3.eventId),
          authContext)

      val expectedResultDetails = Seq(config, config3)
      testAggregationRulesEndpointPathWithIncludeInactiveParam(
        includeInactive = true,
        authContext) mustBe expectedResultDetails
    }
  }

  "deleting aggregation rule configuration" should {
    "return not found error for a non-existing id" in new TestContext {
      val path = testAggregationRuleEndpointPath(authContext, AggregationRuleConfigurationRuleId.random())
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationNotFound,
        authContext = authContext)
    }

    "return not found error when an aggregation rule configuration belongs to a different project" in new TestContext {
      val otherProjectAuthContext = TestAuthContext()
      val eventConfiguration = createEventConfiguration(createEventConfigurationRequest, otherProjectAuthContext)
      val aggregationConfig = createTestAggregationRuleConfiguration(
        createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfiguration.eventId),
        otherProjectAuthContext)

      val path = testAggregationRuleEndpointPath(authContext, aggregationConfig.aggregationRuleId)
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationNotFound,
        authContext = authContext)
    }

    "report conflict if aggregation rule configuration is active" in new TestContext {
      val aggregationConfig = createTestAggregationRuleConfiguration(
        createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
        authContext)

      val expectedAggregationRules = Seq(aggregationConfig)
      getAggregationRuleConfigurations(authContext) mustBe expectedAggregationRules

      val path = testAggregationRuleEndpointPath(authContext, aggregationConfig.aggregationRuleId)
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationIsActive,
        authContext = authContext)
      getAggregationRuleConfigurations(authContext) mustBe expectedAggregationRules
    }

    "report conflict if aggregation rule configuration is used by achievement rule configuration" in new TestContext {
      val config =
        createTestAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
          authContext)
      val achievementRequest = createAchievementRuleConfigurationWithEventPayloadRequest
      val achievementToCreate = achievementRequest
        .modify(_.conditions.each.aggregationRuleId)
        .setTo(config.aggregationRuleId)
        .modify(_.action.payload.when[AchievementEventActionPayload].eventId)
        .setTo(eventConfig.eventId)
        .modify(_.action.payload.when[AchievementEventActionPayload].setFields)
        .setTo(eventConfig.fields.map(f =>
          EventActionField(fieldName = f.name, operation = Static, aggregationRuleId = None, value = f.name)))
      createAchievementRuleConfiguration(achievementToCreate, authContext)
      val deactivatedConfig = deactivateAggregationRuleConfig(config.aggregationRuleId, authContext)

      val expectedAggregationRules = Seq(deactivatedConfig)
      testAggregationRulesEndpointPathWithIncludeInactiveParam(
        includeInactive = true,
        authContext) mustBe expectedAggregationRules

      val path = testAggregationRuleEndpointPath(authContext, deactivatedConfig.aggregationRuleId)
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationIsInUse,
        authContext = authContext)
      testAggregationRulesEndpointPathWithIncludeInactiveParam(
        includeInactive = true,
        authContext) mustBe expectedAggregationRules
    }

    "delete inactive configuration" in new TestContext {
      // GIVEN: two inactive aggregation rule configurations and one active config
      val createRequest = createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId)
      val createRequest2 = createAggregationRuleConfigurationRequest2.copy(eventConfigurationId = eventConfig.eventId)
      val createRequest3 = createAggregationRuleConfigurationRequest3.copy(eventConfigurationId = eventConfig.eventId)
      val config = createTestAggregationRuleConfiguration(createRequest, authContext)
      val config2 = createTestAggregationRuleConfiguration(createRequest2, authContext)
      val config3 = createTestAggregationRuleConfiguration(createRequest3, authContext)
      val deactivatedConfig = deactivateAggregationRuleConfig(config.aggregationRuleId, authContext)
      val deactivatedConfig2 = deactivateAggregationRuleConfig(config2.aggregationRuleId, authContext)

      testAggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive = true, authContext) mustBe Seq(
        deactivatedConfig,
        deactivatedConfig2,
        config3)

      // WHEN: we delete first one
      deleteAggregationRuleConfig(config.aggregationRuleId, authContext)

      // THEN: the aggregation rule configuration is deleted and other ones still exist
      val rulesAfterDeletion =
        testAggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive = true, authContext)
      rulesAfterDeletion mustBe Seq(deactivatedConfig2, config3)
    }
  }

  private def getAggregationRuleConfiguration(
      ruleId: AggregationRuleConfigurationRuleId,
      authContext: TestAuthContext): AggregationRuleConfiguration = {
    val request =
      FakeRequest(GET, testAggregationRuleEndpointPath(authContext, ruleId), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturnAggregationRuleConfig(request, authContext)
  }

  private def activateAggregationRuleConfig(
      ruleId: AggregationRuleConfigurationRuleId,
      authContext: TestAuthContext): AggregationRuleConfiguration =
    updateAggregationRuleConfig(ruleId, authContext, isActive = Some(true))

  private def deleteAggregationRuleConfig(ruleId: AggregationRuleConfigurationRuleId, authContext: TestAuthContext) = {
    val request =
      FakeRequest(DELETE, testAggregationRuleEndpointPath(authContext, ruleId), headersWithJwt, AnyContentAsEmpty)

    authenticateNextRequest(authContext)
    val res = route(app, request).value

    status(res) mustBe NO_CONTENT
    contentType(res) mustBe None
  }

  private def updateAggregationRuleConfig(
      ruleId: AggregationRuleConfigurationRuleId,
      authContext: TestAuthContext,
      isActive: Option[Boolean] = None,
      description: Option[String] = None): AggregationRuleConfiguration = {
    val request = FakeRequest(
      PATCH,
      testAggregationRuleEndpointPath(authContext, ruleId),
      headersWithJwt,
      AnyContentAsJson(
        UpdateAggregationRuleConfigurationRequest.updateAggregationRuleConfigurationRequestPlayFormat.writes(
          UpdateAggregationRuleConfigurationRequest(isActive, description))))
    sendRequestAndReturnAggregationRuleConfig(request, authContext)
  }

  private def deactivateAggregationRuleConfig(
      ruleId: AggregationRuleConfigurationRuleId,
      authContext: TestAuthContext): AggregationRuleConfiguration =
    updateAggregationRuleConfig(ruleId, authContext, isActive = Some(false))

  private def getAggregationRuleConfigurations(authContext: TestAuthContext): Seq[AggregationRuleConfiguration] = {
    val request =
      FakeRequest(GET, testAggregationRulesEndpointPath(authContext), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturnDetails[AnyContentAsEmpty.type, Seq[AggregationRuleConfiguration]](request, authContext)
  }

  private def testAggregationRulesEndpointPathWithIncludeInactiveParam(
      includeInactive: Boolean,
      authContext: TestAuthContext): Seq[AggregationRuleConfiguration] = {
    val request =
      FakeRequest(
        GET,
        aggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive),
        headersWithJwt,
        AnyContentAsEmpty)
    sendRequestAndReturnDetails[AnyContentAsEmpty.type, Seq[AggregationRuleConfiguration]](request, authContext)
  }

  private def testGetOnlyActiveAggregationRuleConfigs(withFlag: Boolean) = {
    // GIVEN: two active aggregation rule configurations and one inactive config
    val authContext = TestAuthContext()
    val eventConfig = createEventConfiguration(createEventConfigurationRequest, authContext)
    val eventConfig2 = createEventConfiguration(createEventConfigurationRequest2, authContext)
    val eventConfig3 = createEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)
    val config =
      createTestAggregationRuleConfiguration(
        createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
        authContext)
    val config2 = createTestAggregationRuleConfiguration(
      createAggregationRuleConfigurationRequest2.copy(eventConfigurationId = eventConfig2.eventId),
      authContext)
    val config3 =
      createTestAggregationRuleConfiguration(
        createAggregationRuleConfigurationRequest3.copy(eventConfigurationId = eventConfig3.eventId),
        authContext)
    deactivateAggregationRuleConfig(config2.aggregationRuleId, authContext)

    val expectedResultDetails = Seq(config, config3)
    val res =
      if (withFlag) testAggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive = false, authContext)
      else getAggregationRuleConfigurations(authContext)
    res mustBe expectedResultDetails
  }

  private def createDefaultEventConfiguration(authContext: TestAuthContext) =
    createEventConfiguration(createEventConfigurationRequest, authContext)

}
