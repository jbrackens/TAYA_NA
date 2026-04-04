package stella.rules.it.routes.achievement

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID.randomUUID

import com.softwaremill.quicklens._
import org.scalatest.Inside
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.models.Ids.ProjectId

import stella.rules.it.TestAuthContext
import stella.rules.it.routes.RoutesSpecBase
import stella.rules.models.Ids.AchievementConfigurationRuleId
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.achievement.AchievementTriggerBehaviour
import stella.rules.models.achievement.ActionType
import stella.rules.models.achievement.OperationType
import stella.rules.models.achievement.http._
import stella.rules.models.aggregation.AggregationConditionType.Nn
import stella.rules.models.aggregation.AggregationType.Sum
import stella.rules.models.aggregation.IntervalType.Never
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.aggregation.http.CreateRequestResetFrequency
import stella.rules.models.event.FieldValueType
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.EventField
import stella.rules.routes.ResponseFormats._
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.error.AdditionalPresentationErrorCode
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationNotFound

trait AchievementConfigurationRoutesSpecBase extends RoutesSpecBase with Inside {

  protected def testAchievementRulesEndpointPath(authContext: TestAuthContext): String
  protected def testAchievementRulesEndpointPathWithIncludeInactiveParam(
      authContext: TestAuthContext,
      includeInactive: Boolean): String
  protected def testAchievementRuleEndpointPath(
      authContext: TestAuthContext,
      ruleId: AchievementConfigurationRuleId): String

  protected def createTestAchievementRuleConfiguration(
      requestPayload: CreateAchievementRuleConfigurationRequest,
      authContext: TestAuthContext): AchievementRuleConfiguration

  trait TestContext {
    val authContext = TestAuthContext()
    val eventConfig = createEventConfiguration(createEventConfigurationRequest, authContext)
    val aggregationConfig = createAggregationRuleConfiguration(
      createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig.eventId),
      authContext)

    val validCreateAchievementConfigurationRequestWithEvent =
      prepareValidCreateAchievementConfigurationRequestWithEvent(eventConfig, aggregationConfig)

    val validCreateAchievementConfigurationRequestWithWebhookWithEvent =
      createAchievementRuleConfigurationWithWebhookPayloadWithEventRequest
        .modify(_.conditions.each.aggregationRuleId)
        .setTo(aggregationConfig.aggregationRuleId)
        .modify(_.action.payload.when[AchievementWebhookActionPayload].eventConfig)
        .setTo(Some(WebhookActionEventConfig(
          eventConfig.eventId,
          eventConfig.fields.map(eventField =>
            WebhookActionField(
              fieldName = eventField.name,
              operation = OperationType.Static,
              aggregationRuleId = None,
              value = dummyNonBlankString(20))))))

    val validCreateAchievementConfigurationRequestWithWebhookWithoutEvent =
      createAchievementRuleConfigurationWithWebhookPayloadWithoutEventRequest
        .modify(_.conditions.each.aggregationRuleId)
        .setTo(aggregationConfig.aggregationRuleId)

    def prepareValidCreateAchievementConfigurationRequestWithEvent(
        eventConfig: EventConfiguration,
        aggregationConfig: AggregationRuleConfiguration): CreateAchievementRuleConfigurationRequest =
      createAchievementRuleConfigurationWithEventPayloadRequest
        .modify(_.action.payload.when[AchievementEventActionPayload].eventId)
        .setTo(eventConfig.eventId)
        .modify(_.conditions.each.aggregationRuleId)
        .setTo(aggregationConfig.aggregationRuleId)
        .modify(_.action.payload.when[AchievementEventActionPayload].setFields)
        .setTo(eventConfig.fields.map(eventField =>
          EventActionField(
            fieldName = eventField.name,
            operation = OperationType.ReplaceFrom,
            aggregationRuleId = Some(aggregationConfig.aggregationRuleId),
            value = dummyNonBlankString(20))))
  }

  trait MultipleConfigsTestContext extends TestContext {
    val activeConfig1 =
      createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)
    val activeConfig2 =
      createTestAchievementRuleConfiguration(
        validCreateAchievementConfigurationRequestWithWebhookWithEvent,
        authContext)
    private val config3 =
      createTestAchievementRuleConfiguration(
        validCreateAchievementConfigurationRequestWithWebhookWithoutEvent,
        authContext)
    val deletedConfig =
      createTestAchievementRuleConfiguration(
        validCreateAchievementConfigurationRequestWithEvent.copy(achievementName =
          validCreateAchievementConfigurationRequestWithEvent.achievementName + "_2"),
        authContext)
    val inactiveConfig = deactivateAchievementConfiguration(config3.achievementRuleId, authContext)
    deactivateAchievementConfiguration(deletedConfig.achievementRuleId, authContext)
    deleteAchievementConfig(deletedConfig.achievementRuleId, authContext)
  }

  "creating achievement configuration" should {
    "fails when event config does not exist" in new TestContext {
      val request = validCreateAchievementConfigurationRequestWithEvent
        .modify(_.action.payload.when[AchievementEventActionPayload].eventId)
        .setTo(EventConfigurationEventId(randomUUID()))
      val requestJson =
        CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(request)

      testFailedRequest(
        request = FakeRequest(
          POST,
          testAchievementRulesEndpointPath(authContext),
          headersWithJwt,
          AnyContentAsJson(requestJson)),
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = EventConfigurationNotFound,
        authContext = authContext)
    }

    "fails when event config exists but belongs to different project" in new TestContext {
      val otherProjectAuthContext = TestAuthContext(primaryProjectId = ProjectId.random())
      val otherProjectEventConfig = createEventConfiguration(createEventConfigurationRequest, otherProjectAuthContext)
      val request = validCreateAchievementConfigurationRequestWithEvent
        .modify(_.action.payload.when[AchievementEventActionPayload].eventId)
        .setTo(otherProjectEventConfig.eventId)
      val requestJson =
        CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(request)

      testFailedRequest(
        request = FakeRequest(
          POST,
          testAchievementRulesEndpointPath(authContext),
          headersWithJwt,
          AnyContentAsJson(requestJson)),
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationNotFound,
        authContext = authContext)
    }

    "fails when event config for event action exists but doesn't contain field" in new TestContext {
      val request = validCreateAchievementConfigurationRequestWithEvent
        .modify(_.action.payload.when[AchievementEventActionPayload].setFields.each.fieldName)
        .using(fieldName => s"${fieldName}_modified")
      val requestJson =
        CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(request)

      inside(request.action.payload) { case payload: AchievementEventActionPayload =>
        testFailedRequest(
          request = FakeRequest(
            POST,
            testAchievementRulesEndpointPath(authContext),
            headersWithJwt,
            AnyContentAsJson(requestJson)),
          expectedStatusCode = BAD_REQUEST,
          expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationFieldNotFound,
          expectedErrorMessage =
            s"Couldn't find field(s): '${payload.setFields.map(_.fieldName).mkString("', '")}' for event configuration with id ${payload.eventId} for project ${authContext.primaryProjectId}",
          authContext = authContext)
      }
    }

    "fails when event config for event action exists but achievement config doesn't provide config for some field" in new TestContext {
      val request = validCreateAchievementConfigurationRequestWithEvent
        .modify(_.action.payload.when[AchievementEventActionPayload].setFields)
        .using(fields => fields.drop(2))
      val requestJson =
        CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(request)

      inside(request.action.payload) { case payload: AchievementEventActionPayload =>
        val eventFieldNames = eventConfig.fields.map(_.name)
        val achievementEventFieldNames = payload.setFields.map(_.fieldName)
        val missingFields = eventFieldNames.filterNot(achievementEventFieldNames.contains)

        testFailedRequest(
          request = FakeRequest(
            POST,
            testAchievementRulesEndpointPath(authContext),
            headersWithJwt,
            AnyContentAsJson(requestJson)),
          expectedStatusCode = BAD_REQUEST,
          expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationFieldNotProvided,
          expectedErrorMessage = s"Couldn't find settings for field(s): '${missingFields.mkString(
            "', '")}' for event configuration with id ${payload.eventId} for project ${authContext.primaryProjectId}",
          authContext = authContext)
      }
    }

    "fails when event config for webhook action exists but doesn't contain field" in new TestContext {
      val request = validCreateAchievementConfigurationRequestWithWebhookWithEvent
        .modify(_.action.payload.when[AchievementWebhookActionPayload].eventConfig.each.setFields.each.fieldName)
        .using(fieldName => s"${fieldName}_modified")
      val requestJson =
        CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(request)

      inside(request.action.payload) { case payload: AchievementWebhookActionPayload =>
        inside(payload.eventConfig) { case Some(webhookEventConfig) =>
          testFailedRequest(
            request = FakeRequest(
              POST,
              testAchievementRulesEndpointPath(authContext),
              headersWithJwt,
              AnyContentAsJson(requestJson)),
            expectedStatusCode = BAD_REQUEST,
            expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationFieldNotFound,
            expectedErrorMessage =
              s"Couldn't find field(s): '${webhookEventConfig.setFields.map(_.fieldName).mkString("', '")}' for event configuration with id ${webhookEventConfig.eventId} for project ${authContext.primaryProjectId}",
            authContext = authContext)
        }
      }
    }

    "fails when event config for webhook action exists but achievement config doesn't provide config for some field" in new TestContext {
      val request = validCreateAchievementConfigurationRequestWithWebhookWithEvent
        .modify(_.action.payload.when[AchievementWebhookActionPayload].eventConfig.each.setFields)
        .using(fields => fields.drop(2))
      val requestJson =
        CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(request)

      inside(request.action.payload) { case payload: AchievementWebhookActionPayload =>
        inside(payload.eventConfig) { case Some(webhookEventConfig) =>
          val eventFieldNames = eventConfig.fields.map(_.name)
          val achievementEventFieldNames = webhookEventConfig.setFields.map(_.fieldName)
          val missingFields = eventFieldNames.filterNot(achievementEventFieldNames.contains)

          testFailedRequest(
            request = FakeRequest(
              POST,
              testAchievementRulesEndpointPath(authContext),
              headersWithJwt,
              AnyContentAsJson(requestJson)),
            expectedStatusCode = BAD_REQUEST,
            expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationFieldNotProvided,
            expectedErrorMessage = s"Couldn't find settings for field(s): '${missingFields.mkString(
              "', '")}' for event configuration with id ${webhookEventConfig.eventId} for project ${authContext.primaryProjectId}",
            authContext = authContext)
        }
      }
    }

    "fails when aggregation config does not exist" in new TestContext {
      val request = validCreateAchievementConfigurationRequestWithWebhookWithoutEvent
        .modify(_.conditions.each.aggregationRuleId)
        .setTo(AggregationRuleConfigurationRuleId(randomUUID()))
      val requestJson =
        CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(request)

      testFailedRequest(
        request = FakeRequest(
          POST,
          testAchievementRulesEndpointPath(authContext),
          headersWithJwt,
          AnyContentAsJson(requestJson)),
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationNotFound,
        authContext = authContext)
    }

    "fails when aggregation config exists but belongs to different project" in new TestContext {
      val otherProjectAuthContext = TestAuthContext(primaryProjectId = ProjectId.random())
      createEventConfiguration(createEventConfigurationRequest, otherProjectAuthContext)
      val requestJson =
        CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(
          validCreateAchievementConfigurationRequestWithEvent)

      testFailedRequest(
        request = FakeRequest(
          POST,
          testAchievementRulesEndpointPath(otherProjectAuthContext),
          headersWithJwt,
          AnyContentAsJson(requestJson)),
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AggregationRuleConfigurationNotFound,
        authContext = otherProjectAuthContext)
    }

    "create and return achievement configuration with event action" in new TestContext {
      testCreateAndReturnAchievementConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)
    }

    "create and return achievement configuration with event action with triggerBehaviour not specified" in new TestContext {
      testCreateAndReturnAchievementConfiguration(
        validCreateAchievementConfigurationRequestWithEvent.copy(triggerBehaviour = None),
        authContext)
    }

    "create and return achievement configuration with webhook action with event" in new TestContext {
      testCreateAndReturnAchievementConfiguration(
        validCreateAchievementConfigurationRequestWithWebhookWithEvent,
        authContext)
    }

    "create and return achievement configuration with webhook action with triggerBehaviour not specified" in new TestContext {
      testCreateAndReturnAchievementConfiguration(
        validCreateAchievementConfigurationRequestWithWebhookWithEvent.copy(triggerBehaviour = None),
        authContext)
    }

    "create and return achievement configuration with webhook action without event" in new TestContext {
      testCreateAndReturnAchievementConfiguration(
        validCreateAchievementConfigurationRequestWithWebhookWithoutEvent,
        authContext)
    }

    "return proper achievement rule configuration when creating a second achievement rule configuration with the same name but for different project" in new TestContext {
      val otherAuthContext = TestAuthContext()
      val achievementConfig =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)

      val eventConfig2 = createEventConfiguration(createEventConfigurationRequest, otherAuthContext)
      val aggregationConfig2 = createAggregationRuleConfiguration(
        createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfig2.eventId),
        otherAuthContext)

      val achievementConfig2 =
        createTestAchievementRuleConfiguration(
          prepareValidCreateAchievementConfigurationRequestWithEvent(eventConfig2, aggregationConfig2),
          otherAuthContext)

      achievementConfig.achievementRuleId must not be achievementConfig2.achievementRuleId
      achievementConfig.achievementName mustBe achievementConfig2.achievementName
    }

    "return conflict when creating a second achievement rule configuration with the same name for the same project" in new TestContext {
      createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)
      val requestPayloadJson =
        CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(
          validCreateAchievementConfigurationRequestWithEvent)
      val request =
        FakeRequest(
          POST,
          testAchievementRulesEndpointPath(authContext),
          headersWithJwt,
          AnyContentAsJson(requestPayloadJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.AchievementRuleConfigurationNameAlreadyUsed,
        authContext = authContext)
    }

    // a test case for the reported bug
    "succeed even when condition type is NN" in {
      val authContext = TestAuthContext()
      val createEventConfigPayload = CreateEventConfigurationRequest(
        name = "stella.samples.all.points",
        description = Some("Points scored in a session of a Stella SDK sample game"),
        fields = List(
          EventField("username", FieldValueType.String),
          EventField("userId", FieldValueType.String),
          EventField("game", FieldValueType.String),
          EventField("level", FieldValueType.String),
          EventField("points", FieldValueType.Integer)))
      val eventConfig = createEventConfiguration(createEventConfigPayload, authContext)

      val createAggregationConfigPayload = CreateAggregationRuleConfigurationRequest(
        name = "stella.samples.all.points-userid-alltime",
        description = "All time points statistics for all the games in the Stella SDK samples",
        eventConfigurationId = eventConfig.eventId,
        resetFrequency = CreateRequestResetFrequency(
          interval = Never,
          windowStartDateUTC = Some(OffsetDateTime.parse("2022-02-08T19:00Z")),
          intervalDetails = None),
        aggregationType = Sum,
        aggregationFieldName = "points",
        aggregationGroupByFieldName = Some("userId"),
        aggregationConditions = Nil)
      val aggregationConfig = createAggregationRuleConfiguration(createAggregationConfigPayload, authContext)
      val createAchievementConfigPayload = CreateAchievementRuleConfigurationRequest(
        achievementName = "test1",
        description = "test achievement 1",
        triggerBehaviour = None,
        action = AchievementAction(
          actionType = ActionType.Event,
          payload = AchievementEventActionPayload(
            eventId = eventConfig.eventId,
            setFields = List(
              EventActionField(
                fieldName = "username",
                operation = OperationType.Static,
                aggregationRuleId = None,
                value = "txt"),
              EventActionField(
                fieldName = "userId",
                operation = OperationType.Static,
                aggregationRuleId = None,
                value = "txt"),
              EventActionField(
                fieldName = "game",
                operation = OperationType.Static,
                aggregationRuleId = None,
                value = "txt"),
              EventActionField(
                fieldName = "level",
                operation = OperationType.Static,
                aggregationRuleId = None,
                value = "txt"),
              EventActionField(
                fieldName = "points",
                operation = OperationType.Static,
                aggregationRuleId = None,
                value = "1")))),
        conditions = List(
          AchievementCondition(
            aggregationRuleId = aggregationConfig.aggregationRuleId,
            aggregationField = "COUNT",
            conditionType = Nn,
            value = None)))
      createTestAchievementRuleConfiguration(createAchievementConfigPayload, authContext)
    }
  }

  "get achievement configuration" should {
    "return not found error for non-existing id" in new TestContext {
      val path = testAchievementRuleEndpointPath(authContext, AchievementConfigurationRuleId.random())
      val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AchievementRuleConfigurationNotFound,
        authContext = authContext)
    }

    "return not found error when an achievement configuration belongs to a different project" in new TestContext {
      val otherProjectAuthContext = TestAuthContext(primaryProjectId = ProjectId.random())

      val createdConfig =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)

      val path = testAchievementRuleEndpointPath(otherProjectAuthContext, createdConfig.achievementRuleId)
      val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AchievementRuleConfigurationNotFound,
        authContext = otherProjectAuthContext)
    }

    "return achievement configuration with event action" in new TestContext {
      val configRequest1 =
        validCreateAchievementConfigurationRequestWithEvent.copy(achievementName = s"name-$randomUUID()")
      val configRequest2 =
        validCreateAchievementConfigurationRequestWithEvent.copy(achievementName = s"name-$randomUUID()")
      val createdConfig1 = createTestAchievementRuleConfiguration(configRequest1, authContext)
      val createdConfig2 = createTestAchievementRuleConfiguration(configRequest2, authContext)

      val config1 = getAchievementConfiguration(createdConfig1.achievementRuleId, authContext)
      val config2 = getAchievementConfiguration(createdConfig2.achievementRuleId, authContext)

      config1 mustBe createdConfig1
      config2 mustBe createdConfig2
    }

    "return achievement configuration with webhook action" in new TestContext {
      val configRequest1 =
        validCreateAchievementConfigurationRequestWithWebhookWithEvent.copy(achievementName = s"name-$randomUUID()")
      val configRequest2 =
        validCreateAchievementConfigurationRequestWithWebhookWithoutEvent.copy(achievementName = s"name-$randomUUID()")
      val createdConfig1 = createTestAchievementRuleConfiguration(configRequest1, authContext)
      val createdConfig2 = createTestAchievementRuleConfiguration(configRequest2, authContext)

      val config1 = getAchievementConfiguration(createdConfig1.achievementRuleId, authContext)
      val config2 = getAchievementConfiguration(createdConfig2.achievementRuleId, authContext)

      config1 mustBe createdConfig1
      config2 mustBe createdConfig2
    }
  }

  "updating achievement configuration" should {
    "return not found error for a non-existing id" in new TestContext {
      val path = testAchievementRuleEndpointPath(authContext, AchievementConfigurationRuleId.random())
      val request =
        FakeRequest(PATCH, path, headersWithJwt, AnyContentAsJson(deactivateAchievementRuleConfigurationRequestJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AchievementRuleConfigurationNotFound,
        authContext = authContext)
    }

    "return not found error when an achievement configuration belongs to a different project" in new TestContext {
      val otherProjectAuthContext = TestAuthContext(primaryProjectId = ProjectId.random())
      val createdConfig =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)

      val path = testAchievementRuleEndpointPath(otherProjectAuthContext, createdConfig.achievementRuleId)
      val request =
        FakeRequest(PATCH, path, headersWithJwt, AnyContentAsJson(deactivateAchievementRuleConfigurationRequestJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AchievementRuleConfigurationNotFound,
        otherProjectAuthContext)
    }

    "change state to inactive" in new TestContext {
      val config =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)

      val deactivationTime = testClock.moveTime()

      val deactivatedConfig = deactivateAchievementConfiguration(config.achievementRuleId, authContext)

      deactivatedConfig.isActive mustBe false
      deactivatedConfig.updatedAt must be > config.updatedAt
      deactivatedConfig.createdAt mustBe config.createdAt
      deactivatedConfig.updatedAt mustBe deactivationTime
    }

    "change state to active" in new TestContext {
      val config =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)

      val deactivationTime = testClock.moveTime()

      val deactivatedConfig = deactivateAchievementConfiguration(config.achievementRuleId, authContext)

      deactivatedConfig.isActive mustBe false
      deactivatedConfig.updatedAt mustBe deactivationTime

      val activationTime = testClock.moveTime()
      val activatedConfig = activateAchievementConfiguration(config.achievementRuleId, authContext)

      activatedConfig.isActive mustBe true
      activatedConfig.updatedAt must be > deactivatedConfig.updatedAt
      activatedConfig.updatedAt must be > activatedConfig.createdAt
      activatedConfig.updatedAt mustBe activationTime
    }

    "just return achievement config when deactivating already inactive achievement configuration" in new TestContext {
      val config =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)

      testClock.moveTime()
      val deactivatedConfig = deactivateAchievementConfiguration(config.achievementRuleId, authContext)
      testClock.moveTime()
      val returnedConfig = deactivateAchievementConfiguration(config.achievementRuleId, authContext)

      returnedConfig mustBe deactivatedConfig
    }

    "just return achievement config when activating already active achievement configuration" in new TestContext {
      val config =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)

      testClock.moveTime()
      val returnedConfig = activateAchievementConfiguration(config.achievementRuleId, authContext)

      returnedConfig mustBe config
    }

    "properly change description of active config" in new TestContext {
      // GIVEN: achievement rule configurations
      val config =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)
      val config2 =
        createTestAchievementRuleConfiguration(
          validCreateAchievementConfigurationRequestWithEvent.copy(achievementName = "other-achievement"),
          authContext)

      val updateTime = testClock.moveTime()
      val newDescription = "a modified description"
      // WHEN: we modify description
      val updatedConfig =
        updateAchievementConfiguration(config.achievementRuleId, authContext, description = Some(newDescription))

      // THEN: description and updatedAt are updated
      updatedConfig.achievementRuleId mustBe config.achievementRuleId
      updatedConfig.achievementName mustBe config.achievementName
      updatedConfig.description mustBe newDescription
      updatedConfig.triggerBehaviour mustBe config.triggerBehaviour
      updatedConfig.action mustBe config.action
      updatedConfig.conditions mustBe config.conditions
      updatedConfig.isActive mustBe config.isActive
      updatedConfig.createdAt mustBe config.createdAt
      updatedConfig.updatedAt must be > config.updatedAt
      updatedConfig.updatedAt mustBe updateTime
      // AND: fetching achievement rule configurations shows that the change is persisted and other configurations are not changed
      getAchievementConfigurations(includeInactive = true, authContext) mustBe Seq(updatedConfig, config2)
    }

    "properly change description of inactive config" in new TestContext {
      // GIVEN: achievement rule configurations
      testClock.moveTime()
      val config =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)
      val config2 =
        createTestAchievementRuleConfiguration(
          validCreateAchievementConfigurationRequestWithEvent.copy(achievementName = "other-achievement"),
          authContext)
      val deactivatedConfig = deactivateAchievementConfiguration(config.achievementRuleId, authContext)
      val deactivatedConfig2 = deactivateAchievementConfiguration(config2.achievementRuleId, authContext)

      val updateTime = testClock.moveTime()
      val newDescription = "a modified description"
      // WHEN: we modify description
      val updatedConfig =
        updateAchievementConfiguration(config.achievementRuleId, authContext, description = Some(newDescription))

      updatedConfig.achievementRuleId mustBe deactivatedConfig.achievementRuleId
      updatedConfig.achievementName mustBe deactivatedConfig.achievementName
      updatedConfig.description mustBe newDescription
      updatedConfig.triggerBehaviour mustBe deactivatedConfig.triggerBehaviour
      updatedConfig.action mustBe deactivatedConfig.action
      updatedConfig.conditions mustBe deactivatedConfig.conditions
      updatedConfig.isActive mustBe deactivatedConfig.isActive
      updatedConfig.createdAt mustBe deactivatedConfig.createdAt
      updatedConfig.updatedAt must be > deactivatedConfig.updatedAt
      updatedConfig.updatedAt mustBe updateTime
      // AND: fetching achievement rule configurations shows that the change is persisted and other configurations are not changed
      getAchievementConfigurations(includeInactive = true, authContext) mustBe Seq(updatedConfig, deactivatedConfig2)
    }

    "properly change activation state and description at the same time" in new TestContext {
      // GIVEN: achievement rule configuration
      val config =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)

      val newDescription = "a modified description"
      val newDescription2 = "another description"
      val updatedConfig =
        updateAchievementConfiguration(
          config.achievementRuleId,
          authContext,
          isActive = Some(false),
          description = Some(newDescription))

      updatedConfig.isActive mustBe false
      updatedConfig.description mustBe newDescription
      getAchievementConfigurations(includeInactive = true, authContext) mustBe Seq(updatedConfig)

      val updatedConfig2 =
        updateAchievementConfiguration(
          config.achievementRuleId,
          authContext,
          isActive = Some(true),
          description = Some(newDescription2))

      updatedConfig2.isActive mustBe true
      updatedConfig2.description mustBe newDescription2
      getAchievementConfigurations(includeInactive = false, authContext) mustBe Seq(updatedConfig2)
    }
  }

  "deleting achievement configuration" should {
    "return not found error for a non-existing id" in new TestContext {
      val path = testAchievementRuleEndpointPath(authContext, AchievementConfigurationRuleId.random())
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AchievementRuleConfigurationNotFound,
        authContext = authContext)
    }

    "return not found error when an achievement configuration belongs to a different project" in new TestContext {
      val otherProjectAuthContext = TestAuthContext(primaryProjectId = ProjectId.random())
      val createdConfig =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)

      val path = testAchievementRuleEndpointPath(otherProjectAuthContext, createdConfig.achievementRuleId)
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AchievementRuleConfigurationNotFound,
        authContext = otherProjectAuthContext)
    }

    "report conflict if achievement configuration is active" in new TestContext {
      val createdConfig =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)

      val path = testAchievementRuleEndpointPath(authContext, createdConfig.achievementRuleId)
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.AchievementRuleConfigurationIsActive,
        authContext = authContext)
    }

    "delete inactive configuration" in new TestContext {
      val config =
        createTestAchievementRuleConfiguration(validCreateAchievementConfigurationRequestWithEvent, authContext)
      val deactivatedConfig = deactivateAchievementConfiguration(config.achievementRuleId, authContext)

      deleteAchievementConfig(config.achievementRuleId, authContext)

      val path = testAchievementRuleEndpointPath(authContext, config.achievementRuleId)

      val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.AchievementRuleConfigurationNotFound,
        authContext = authContext)
    }
  }

  "fetching all achievement configurations" should {
    "return empty list if there are no achievement configurations" in new TestContext {
      getAchievementConfigurations(includeInactive = true, authContext) mustBe Nil
      getAchievementConfigurations(includeInactive = false, authContext) mustBe Nil
    }

    "return only active achievement configurations when include_inactive flag is not specified" in new MultipleConfigsTestContext {
      val request = FakeRequest(GET, testAchievementRulesEndpointPath(authContext), headersWithJwt, AnyContentAsEmpty)
      val configs =
        sendRequestAndReturnDetails[AnyContentAsEmpty.type, Seq[AchievementRuleConfiguration]](request, authContext)

      configs mustBe Seq(activeConfig1, activeConfig2)
    }

    "return only active achievement configurations when a flag to include inactive ones is set to false" in new MultipleConfigsTestContext {
      val configs = getAchievementConfigurations(includeInactive = false, authContext)

      configs mustBe Seq(activeConfig1, activeConfig2)
    }

    "return all achievement configurations when a flag to include inactive ones is set to true" in new MultipleConfigsTestContext {
      val configs = getAchievementConfigurations(includeInactive = true, authContext)

      configs.size mustBe 3
      configs mustBe Seq(activeConfig1, activeConfig2, inactiveConfig)
    }

    "return only configurations for a given project" in new MultipleConfigsTestContext {
      val otherProjectAuthContext = TestAuthContext(primaryProjectId = ProjectId.random())
      val otherProjectEventConfig = createEventConfiguration(createEventConfigurationRequest, otherProjectAuthContext)
      val otherProjectAggregationConfig = createAggregationRuleConfiguration(
        createAggregationRuleConfigurationRequest.copy(eventConfigurationId = otherProjectEventConfig.eventId),
        otherProjectAuthContext)
      val createAchievementConfigurationRequest = createAchievementRuleConfigurationWithEventPayloadRequest
        .modify(_.action.payload.when[AchievementEventActionPayload].eventId)
        .setTo(otherProjectEventConfig.eventId)
        .modify(_.conditions.each.aggregationRuleId)
        .setTo(otherProjectAggregationConfig.aggregationRuleId)
        .modify(_.action.payload.when[AchievementEventActionPayload].setFields)
        .setTo(otherProjectEventConfig.fields.map(eventField =>
          EventActionField(
            fieldName = eventField.name,
            operation = OperationType.ReplaceFrom,
            aggregationRuleId = Some(otherProjectAggregationConfig.aggregationRuleId),
            value = dummyNonBlankString(20))))
      val createdConfig =
        createTestAchievementRuleConfiguration(createAchievementConfigurationRequest, otherProjectAuthContext)

      val configs = getAchievementConfigurations(includeInactive = true, otherProjectAuthContext)

      configs mustBe Seq(createdConfig)
    }
  }

  private def getAchievementConfiguration(
      ruleId: AchievementConfigurationRuleId,
      authContext: TestAuthContext): AchievementRuleConfiguration = {
    val request =
      FakeRequest(GET, testAchievementRuleEndpointPath(authContext, ruleId), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturnAchievementConfig(request, authContext)
  }

  private def deactivateAchievementConfiguration(
      ruleId: AchievementConfigurationRuleId,
      authContext: TestAuthContext): AchievementRuleConfiguration =
    updateAchievementConfiguration(ruleId, authContext, isActive = Some(false))

  private def activateAchievementConfiguration(
      ruleId: AchievementConfigurationRuleId,
      authContext: TestAuthContext): AchievementRuleConfiguration =
    updateAchievementConfiguration(ruleId, authContext, isActive = Some(true))

  private def updateAchievementConfiguration(
      ruleId: AchievementConfigurationRuleId,
      authContext: TestAuthContext,
      isActive: Option[Boolean] = None,
      description: Option[String] = None): AchievementRuleConfiguration = {
    val request = FakeRequest(
      PATCH,
      testAchievementRuleEndpointPath(authContext, ruleId),
      headersWithJwt,
      AnyContentAsJson(
        UpdateAchievementRuleConfigurationRequest.updateAchievementRuleConfigurationRequestPlayFormat.writes(
          UpdateAchievementRuleConfigurationRequest(isActive, description))))
    sendRequestAndReturnAchievementConfig(request, authContext)
  }

  private def deleteAchievementConfig(ruleId: AchievementConfigurationRuleId, authContext: TestAuthContext) = {
    val request =
      FakeRequest(DELETE, testAchievementRuleEndpointPath(authContext, ruleId), headersWithJwt, AnyContentAsEmpty)

    authenticateNextRequest(authContext)
    val res = route(app, request).value

    status(res) mustBe NO_CONTENT
    contentType(res) mustBe None
  }

  private def getAchievementConfigurations(
      includeInactive: Boolean,
      authContext: TestAuthContext): Seq[AchievementRuleConfiguration] = {
    val request =
      FakeRequest(
        GET,
        testAchievementRulesEndpointPathWithIncludeInactiveParam(authContext, includeInactive),
        headersWithJwt,
        AnyContentAsEmpty)
    sendRequestAndReturnDetails[AnyContentAsEmpty.type, Seq[AchievementRuleConfiguration]](request, authContext)
  }

  private def testCreateAndReturnAchievementConfiguration(
      createRequest: CreateAchievementRuleConfigurationRequest,
      authContext: TestAuthContext) = {
    val config = createTestAchievementRuleConfiguration(createRequest, authContext)

    config.achievementName mustBe createRequest.achievementName
    config.triggerBehaviour mustBe createRequest.triggerBehaviour.getOrElse(AchievementTriggerBehaviour.OnlyOnce)
    config.action mustBe createRequest.action
    config.conditions mustBe createRequest.conditions
    config.isActive mustBe true
    config.createdAt mustBe testClock.currentUtcOffsetDateTime()
    config.createdAt.getOffset mustBe ZoneOffset.UTC
    config.updatedAt mustBe config.createdAt
  }
}
