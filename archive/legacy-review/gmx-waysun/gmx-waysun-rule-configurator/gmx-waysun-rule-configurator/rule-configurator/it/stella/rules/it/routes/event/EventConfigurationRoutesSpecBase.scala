package stella.rules.it.routes.event

import java.time.ZoneOffset

import com.softwaremill.quicklens._
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.Helpers._
import play.api.test._

import stella.rules.it.TestAuthContext
import stella.rules.it.routes.RoutesSpecBase
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.achievement.OperationType.ReplaceFrom
import stella.rules.models.achievement.OperationType.Static
import stella.rules.models.achievement.http.AchievementEventActionPayload
import stella.rules.models.achievement.http.AchievementWebhookActionPayload
import stella.rules.models.achievement.http.EventActionField
import stella.rules.models.achievement.http.WebhookActionField
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.models.event.http.UpdateEventConfigurationRequest
import stella.rules.routes.ResponseFormats._
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.error.AdditionalPresentationErrorCode
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationNameAlreadyUsed
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationNotFound

trait EventConfigurationRoutesSpecBase extends RoutesSpecBase {

  protected def testEventsEndpointPath(authContext: TestAuthContext): String
  protected def testEventsEndpointPathWithIncludeInactiveParam(
      authContext: TestAuthContext,
      includeInactive: Boolean): String
  protected def testEventEndpointPath(authContext: TestAuthContext, eventId: EventConfigurationEventId): String

  protected def createTestEventConfiguration(
      requestPayload: CreateEventConfigurationRequest,
      authContext: TestAuthContext): EventConfiguration

  protected def deactivateTestEventConfiguration(
      eventId: EventConfigurationEventId,
      authContext: TestAuthContext): EventConfiguration

  "creating event configuration" should {
    "return proper event configuration" in {
      val authContext = TestAuthContext()
      // WHEN: event configuration is created
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)

      // THEN: all fields must have proper values
      eventConfiguration.name mustBe createEventConfigurationRequest.name
      eventConfiguration.description mustBe createEventConfigurationRequest.description.value
      eventConfiguration.isActive mustBe true
      eventConfiguration.fields mustBe createEventConfigurationRequest.fields
      eventConfiguration.updatedAt mustBe testClock.currentUtcOffsetDateTime()
      eventConfiguration.updatedAt.getOffset mustBe ZoneOffset.UTC
      eventConfiguration.createdAt mustBe eventConfiguration.updatedAt
    }

    "return event configuration with empty String as description if description was not set in create request" in {
      val authContext = TestAuthContext()
      val eventConfiguration =
        createTestEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)
      eventConfiguration.description mustBe empty
    }

    "always return different eventId and current time" in {
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val secondCreationTime = testClock.moveTime()
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)
      eventConfiguration.eventId must not be eventConfiguration2.eventId
      eventConfiguration2.updatedAt must be > eventConfiguration.updatedAt
      eventConfiguration2.updatedAt mustBe secondCreationTime
      eventConfiguration2.createdAt mustBe eventConfiguration2.updatedAt
    }

    "return proper event configuration when creating a second event configuration with the same name but for different project" in {
      val authContext = TestAuthContext()
      val otherAuthContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest, otherAuthContext)

      eventConfiguration.eventId must not be eventConfiguration2.eventId
      eventConfiguration.name mustBe eventConfiguration2.name
    }

    "return conflict when creating a second event configuration with the same name for the same project" in {
      val authContext = TestAuthContext()
      createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val requestPayloadJson =
        CreateEventConfigurationRequest.createEventConfigurationRequestPlayFormat.writes(
          createEventConfigurationRequest)
      val request =
        FakeRequest(POST, testEventsEndpointPath(authContext), headersWithJwt, AnyContentAsJson(requestPayloadJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = EventConfigurationNameAlreadyUsed,
        authContext = authContext)
    }
  }

  "fetching one event configuration" should {
    "return not found error for a non-existing id" in {
      val authContext = TestAuthContext()
      val path = testEventEndpointPath(authContext, EventConfigurationEventId.random())
      val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = EventConfigurationNotFound,
        authContext = authContext)
    }

    "return not found error when an event configuration belongs to a different project" in {
      val authContext = TestAuthContext()
      val otherProjectAuthContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, otherProjectAuthContext)

      val path = testEventEndpointPath(authContext, eventConfiguration.eventId)
      val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationNotFound,
        authContext = authContext)
    }

    "return proper event configuration" in {
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)
      getEventConfiguration(eventConfiguration.eventId, authContext) mustBe eventConfiguration
      getEventConfiguration(eventConfiguration2.eventId, authContext) mustBe eventConfiguration2
    }
  }

  "updating event configuration" should {
    "return not found error for a non-existing id" in {
      val authContext = TestAuthContext()
      val path = testEventEndpointPath(authContext, EventConfigurationEventId.random())
      val request = FakeRequest(PATCH, path, headersWithJwt, AnyContentAsJson(deactivateEventConfigurationRequestJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationNotFound,
        authContext = authContext)
    }

    "return not found error when an event configuration belongs to a different project" in {
      val authContext = TestAuthContext()
      val otherProjectAuthContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, otherProjectAuthContext)
      val path = testEventEndpointPath(authContext, eventConfiguration.eventId)
      val request = FakeRequest(PATCH, path, headersWithJwt, AnyContentAsJson(deactivateEventConfigurationRequestJson))
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationNotFound,
        authContext = authContext)
    }

    "properly change state to inactive" in {
      // GIVEN: two event configurations
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)

      val deactivationTime = testClock.moveTime()
      // WHEN: first one is deactivated
      val deactivatedEventConfiguration = deactivateTestEventConfiguration(eventConfiguration.eventId, authContext)

      // THEN: activation state and updatedAt are updated
      deactivatedEventConfiguration.eventId mustBe eventConfiguration.eventId
      deactivatedEventConfiguration.name mustBe eventConfiguration.name
      deactivatedEventConfiguration.description mustBe eventConfiguration.description
      deactivatedEventConfiguration.fields mustBe eventConfiguration.fields
      deactivatedEventConfiguration.isActive mustBe false
      deactivatedEventConfiguration.createdAt mustBe eventConfiguration.createdAt
      deactivatedEventConfiguration.updatedAt must be > eventConfiguration.updatedAt
      deactivatedEventConfiguration.updatedAt mustBe deactivationTime
      // AND: fetching event configurations shows that the change is persisted and other configurations are not changed
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe Seq(
        deactivatedEventConfiguration,
        eventConfiguration2)
    }

    "properly change state to active" in {
      // GIVEN: three event configurations, two are inactive
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)
      val eventConfiguration3 =
        createTestEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)
      testClock.moveTime()
      val deactivatedEventConfiguration = deactivateTestEventConfiguration(eventConfiguration.eventId, authContext)
      val deactivatedEventConfiguration2 = deactivateTestEventConfiguration(eventConfiguration2.eventId, authContext)

      val activationTime = testClock.moveTime()
      // WHEN: first one is reactivated
      val reactivatedEventConfiguration = activateEventConfiguration(eventConfiguration.eventId, authContext)

      // THEN: activation state and updatedAt are updated
      reactivatedEventConfiguration.eventId mustBe deactivatedEventConfiguration.eventId
      reactivatedEventConfiguration.name mustBe deactivatedEventConfiguration.name
      reactivatedEventConfiguration.description mustBe deactivatedEventConfiguration.description
      reactivatedEventConfiguration.fields mustBe deactivatedEventConfiguration.fields
      reactivatedEventConfiguration.isActive mustBe true
      reactivatedEventConfiguration.createdAt mustBe deactivatedEventConfiguration.createdAt
      reactivatedEventConfiguration.updatedAt must be > deactivatedEventConfiguration.updatedAt
      reactivatedEventConfiguration.updatedAt mustBe activationTime
      // AND: fetching event configurations shows that the change is persisted and other configurations are not changed
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe Seq(
        reactivatedEventConfiguration,
        deactivatedEventConfiguration2,
        eventConfiguration3)
    }

    "just return event configuration when deactivating already inactive event configuration" in {
      // GIVEN: inactive event configuration
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      testClock.moveTime()
      val deactivatedEventConfiguration = deactivateTestEventConfiguration(eventConfiguration.eventId, authContext)
      testClock.moveTime()

      // WHEN: we try to deactivate an inactive event configuration
      val returnedEventConfiguration = deactivateTestEventConfiguration(eventConfiguration.eventId, authContext)

      // THEN: nothing has changed, we got the same event configuration as previously
      returnedEventConfiguration mustBe deactivatedEventConfiguration
      // AND: fetching event configuration proves the persisted state is as expected
      getEventConfiguration(eventConfiguration.eventId, authContext) mustBe returnedEventConfiguration
    }

    "just return event configuration when activating already active event configuration" in {
      // GIVEN: active event configuration
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      testClock.moveTime()

      // WHEN: we try to activate an active event configuration
      val returnedEventConfiguration = activateEventConfiguration(eventConfiguration.eventId, authContext)

      // THEN: nothing has changed, we got the same event configuration as previously
      returnedEventConfiguration mustBe eventConfiguration
      // AND: fetching event configuration proves the persisted state is as expected
      getEventConfiguration(eventConfiguration.eventId, authContext) mustBe returnedEventConfiguration
    }

    "properly change description of active config" in {
      // GIVEN: two event configurations
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)

      val updateTime = testClock.moveTime()
      val newDescription = "a modified description"
      // WHEN: a description of a first one is changed
      val updatedEventConfig =
        updateEventConfiguration(eventConfiguration.eventId, authContext, description = Some(newDescription))

      // THEN: description and updatedAt are updated
      updatedEventConfig.eventId mustBe eventConfiguration.eventId
      updatedEventConfig.name mustBe eventConfiguration.name
      updatedEventConfig.description mustBe newDescription
      updatedEventConfig.fields mustBe eventConfiguration.fields
      updatedEventConfig.isActive mustBe eventConfiguration.isActive
      updatedEventConfig.createdAt mustBe eventConfiguration.createdAt
      updatedEventConfig.updatedAt must be > eventConfiguration.updatedAt
      updatedEventConfig.updatedAt mustBe updateTime
      // AND: fetching event configurations shows that the change is persisted and other configurations are not changed
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = false, authContext) mustBe Seq(
        updatedEventConfig,
        eventConfiguration2)
    }

    "properly change description of inactive config" in {
      // GIVEN: three event configurations, two are inactive
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)
      val eventConfiguration3 =
        createTestEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)
      testClock.moveTime()
      val deactivatedEventConfiguration = deactivateTestEventConfiguration(eventConfiguration.eventId, authContext)
      val deactivatedEventConfiguration2 = deactivateTestEventConfiguration(eventConfiguration2.eventId, authContext)

      val updateTime = testClock.moveTime()
      // WHEN: a description of a first one is updated
      val newDescription = "another modified description"
      val updatedEventConfiguration =
        updateEventConfiguration(eventConfiguration.eventId, authContext, description = Some(newDescription))

      // THEN: description and updatedAt are updated
      updatedEventConfiguration.eventId mustBe deactivatedEventConfiguration.eventId
      updatedEventConfiguration.name mustBe deactivatedEventConfiguration.name
      updatedEventConfiguration.description mustBe newDescription
      updatedEventConfiguration.fields mustBe deactivatedEventConfiguration.fields
      updatedEventConfiguration.isActive mustBe deactivatedEventConfiguration.isActive
      updatedEventConfiguration.createdAt mustBe deactivatedEventConfiguration.createdAt
      updatedEventConfiguration.updatedAt must be > deactivatedEventConfiguration.updatedAt
      updatedEventConfiguration.updatedAt mustBe updateTime
      // AND: fetching event configurations shows that the change is persisted and other configurations are not changed
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe Seq(
        updatedEventConfiguration,
        deactivatedEventConfiguration2,
        eventConfiguration3)
    }

    "properly change activation state and description at the same time" in {
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)

      val newDescription = "a modified description"
      val newDescription2 = "another description"
      val updatedEventConfig =
        updateEventConfiguration(
          eventConfiguration.eventId,
          authContext,
          isActive = Some(false),
          description = Some(newDescription))

      updatedEventConfig.isActive mustBe false
      updatedEventConfig.description mustBe newDescription
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe Seq(updatedEventConfig)

      val updatedEventConfig2 =
        updateEventConfiguration(
          eventConfiguration.eventId,
          authContext,
          isActive = Some(true),
          description = Some(newDescription2))

      updatedEventConfig2.isActive mustBe true
      updatedEventConfig2.description mustBe newDescription2
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = false, authContext) mustBe Seq(
        updatedEventConfig2)
    }
  }

  "fetching all event configurations" should {
    "return empty list if there are no event configurations" in {
      val authContext = TestAuthContext()
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe Nil
    }

    "return only active event configurations" in {
      testGetOnlyActiveEventConfigs(withFlag = false)
    }

    "return only active event configurations when a flag to include inactive ones is set to false" in {
      testGetOnlyActiveEventConfigs(withFlag = true)
    }

    "return all event configurations when a flag to include inactive ones is set to true" in {
      // GIVEN: two active event configurations and one inactive config
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)
      val eventConfiguration3 =
        createTestEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)
      val deactivatedEventConfiguration2 = deactivateTestEventConfiguration(eventConfiguration2.eventId, authContext)

      val expectedResultDetails = Seq(eventConfiguration, deactivatedEventConfiguration2, eventConfiguration3)
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe expectedResultDetails
    }

    "return only configurations for a given project" in {
      // GIVEN: two event configurations for one project and one config for other project
      val authContext = TestAuthContext()
      val otherProjectAuthContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      createTestEventConfiguration(createEventConfigurationRequest2, otherProjectAuthContext)
      val eventConfiguration3 =
        createTestEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)

      val expectedResultDetails = Seq(eventConfiguration, eventConfiguration3)
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe expectedResultDetails
    }
  }

  "deleting event configuration" should {
    "return not found error for a non-existing id" in {
      val authContext = TestAuthContext()
      val path = testEventEndpointPath(authContext, EventConfigurationEventId.random())
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationNotFound,
        authContext = authContext)
    }

    "return not found error when an event configuration belongs to a different project" in {
      val authContext = TestAuthContext()
      val otherProjectAuthContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, otherProjectAuthContext)
      val path = testEventEndpointPath(authContext, eventConfiguration.eventId)
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = NOT_FOUND,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationNotFound,
        authContext = authContext)
    }

    "report conflict if event configuration is active" in {
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val expectedConfigurations = Seq(eventConfiguration)
      getEventConfigurations(authContext) mustBe expectedConfigurations
      val path = testEventEndpointPath(authContext, eventConfiguration.eventId)
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationIsActive,
        authContext = authContext)
      getEventConfigurations(authContext) mustBe expectedConfigurations
    }

    "report conflict if event configuration is used by aggregation rule configuration" in {
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      createAggregationRuleConfiguration(
        createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfiguration.eventId),
        authContext)
      val deactivatedEventConfiguration = deactivateTestEventConfiguration(eventConfiguration.eventId, authContext)
      val expectedConfigurations = Seq(deactivatedEventConfiguration)
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe expectedConfigurations

      val path = testEventEndpointPath(authContext, deactivatedEventConfiguration.eventId)
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationIsInUse,
        authContext = authContext)
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe expectedConfigurations
    }

    "report conflict if event configuration is used by achievement rule configuration with event action" in {
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)
      val aggregationConfig =
        createAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfiguration2.eventId),
          authContext)
      val achievementRequest = createAchievementRuleConfigurationWithEventPayloadRequest
      val achievementToCreate = achievementRequest
        .modify(_.conditions.each.aggregationRuleId)
        .setTo(aggregationConfig.aggregationRuleId)
        .modify(_.action.payload.when[AchievementEventActionPayload].eventId)
        .setTo(eventConfiguration.eventId)
        .modify(_.action.payload.when[AchievementEventActionPayload].setFields)
        .setTo(eventConfiguration.fields.map(f =>
          EventActionField(fieldName = f.name, operation = Static, aggregationRuleId = None, value = f.name)))
      createAchievementRuleConfiguration(achievementToCreate, authContext)

      val deactivatedEventConfiguration = deactivateTestEventConfiguration(eventConfiguration.eventId, authContext)
      val expectedConfigurations = Seq(deactivatedEventConfiguration, eventConfiguration2)
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe expectedConfigurations

      val path = testEventEndpointPath(authContext, deactivatedEventConfiguration.eventId)
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationIsInUse,
        authContext = authContext)
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe expectedConfigurations
    }

    "report conflict if event configuration is used by achievement rule configuration with webhook action" in {
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)
      val aggregationConfig =
        createAggregationRuleConfiguration(
          createAggregationRuleConfigurationRequest.copy(eventConfigurationId = eventConfiguration2.eventId),
          authContext)
      val achievementRequest = createAchievementRuleConfigurationWithWebhookPayloadWithEventRequest
      val achievementToCreate = achievementRequest
        .modify(_.conditions.each.aggregationRuleId)
        .setTo(aggregationConfig.aggregationRuleId)
        .modify(_.action.payload.when[AchievementWebhookActionPayload].eventConfig.each.eventId)
        .setTo(eventConfiguration.eventId)
        .modify(_.action.payload.when[AchievementWebhookActionPayload].eventConfig.each.setFields)
        .setTo(eventConfiguration.fields.map(f =>
          WebhookActionField(f.name, ReplaceFrom, Some(aggregationConfig.aggregationRuleId), f.name)))
      createAchievementRuleConfiguration(achievementToCreate, authContext)

      val deactivatedEventConfiguration = deactivateTestEventConfiguration(eventConfiguration.eventId, authContext)
      val expectedConfigurations = Seq(deactivatedEventConfiguration, eventConfiguration2)
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe expectedConfigurations

      val path = testEventEndpointPath(authContext, deactivatedEventConfiguration.eventId)
      val request = FakeRequest(DELETE, path, headersWithJwt, AnyContentAsEmpty)
      testFailedRequest(
        request = request,
        expectedStatusCode = CONFLICT,
        expectedErrorCode = AdditionalPresentationErrorCode.EventConfigurationIsInUse,
        authContext = authContext)
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe expectedConfigurations
    }

    "properly delete event configuration" in {
      // GIVEN: two inactive event configurations and one active config
      val authContext = TestAuthContext()
      val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
      val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)
      val eventConfiguration3 =
        createTestEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)
      deactivateTestEventConfiguration(eventConfiguration.eventId, authContext)
      val deactivatedEventConfiguration2 = deactivateTestEventConfiguration(eventConfiguration2.eventId, authContext)

      // WHEN: we delete first one
      deleteEventConfiguration(eventConfiguration.eventId, authContext)

      // THEN: the event configuration is deleted and other ones still exist
      getEventConfigurationsWithIncludeInactiveFlag(includeInactive = true, authContext) mustBe Seq(
        deactivatedEventConfiguration2,
        eventConfiguration3)
    }
  }

  private def activateEventConfiguration(
      eventId: EventConfigurationEventId,
      authContext: TestAuthContext): EventConfiguration = {
    val request = FakeRequest(
      PATCH,
      testEventEndpointPath(authContext, eventId),
      headersWithJwt,
      AnyContentAsJson(activateEventConfigurationRequestJson))
    sendRequestAndReturnEventConfig(request, authContext)
  }

  private def deleteEventConfiguration(eventId: EventConfigurationEventId, authContext: TestAuthContext): Unit = {
    val request = FakeRequest(DELETE, testEventEndpointPath(authContext, eventId), headersWithJwt, AnyContentAsEmpty)
    // WHEN: we delete an event configuration
    authenticateNextRequest(authContext)
    val res = route(app, request).value

    // THEN: the request succeeded
    status(res) mustBe NO_CONTENT
    contentType(res) mustBe None
    ()
  }

  private def getEventConfigurations(authContext: TestAuthContext): Seq[EventConfiguration] = {
    val request = FakeRequest(GET, testEventsEndpointPath(authContext), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturnDetails[AnyContentAsEmpty.type, Seq[EventConfiguration]](request, authContext)
  }

  private def getEventConfigurationsWithIncludeInactiveFlag(
      includeInactive: Boolean,
      authContext: TestAuthContext): Seq[EventConfiguration] = {
    val request =
      FakeRequest(
        GET,
        testEventsEndpointPathWithIncludeInactiveParam(authContext, includeInactive),
        headersWithJwt,
        AnyContentAsEmpty)
    sendRequestAndReturnDetails[AnyContentAsEmpty.type, Seq[EventConfiguration]](request, authContext)
  }

  private def getEventConfiguration(
      eventId: EventConfigurationEventId,
      authContext: TestAuthContext): EventConfiguration = {
    val request = FakeRequest(GET, testEventEndpointPath(authContext, eventId), headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturnEventConfig(request, authContext)
  }

  private def updateEventConfiguration(
      eventId: EventConfigurationEventId,
      authContext: TestAuthContext,
      isActive: Option[Boolean] = None,
      description: Option[String] = None): EventConfiguration = {
    val request = FakeRequest(
      PATCH,
      testEventEndpointPath(authContext, eventId),
      headersWithJwt,
      AnyContentAsJson(
        UpdateEventConfigurationRequest.updateEventConfigurationRequestPlayFormat.writes(
          UpdateEventConfigurationRequest(isActive, description))))
    sendRequestAndReturnEventConfig(request, authContext)
  }

  private def testGetOnlyActiveEventConfigs(withFlag: Boolean) = {
    // GIVEN: two active event configurations and one inactive config
    val authContext = TestAuthContext()
    val eventConfiguration = createTestEventConfiguration(createEventConfigurationRequest, authContext)
    val eventConfiguration2 = createTestEventConfiguration(createEventConfigurationRequest2, authContext)
    val eventConfiguration3 =
      createTestEventConfiguration(createEventConfigurationRequestWithEmptyDescription, authContext)
    deactivateTestEventConfiguration(eventConfiguration2.eventId, authContext)

    val expectedResultDetails = Seq(eventConfiguration, eventConfiguration3)
    val res =
      if (withFlag) getEventConfigurationsWithIncludeInactiveFlag(includeInactive = false, authContext)
      else getEventConfigurations(authContext)
    res mustBe expectedResultDetails
  }
}
