package stella.rules.it.routes.event

import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers.CREATED
import play.api.test.Helpers.PATCH
import play.api.test.Helpers.POST
import play.api.test.Helpers.writeableOf_AnyContentAsJson

import stella.rules.it.TestAuthContext
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.TestConstants.Endpoint

class EventConfigurationAdminRoutesSpec extends EventConfigurationRoutesSpecBase {

  override protected def testEventsEndpointPath(authContext: TestAuthContext): String =
    Endpoint.eventsAdminEndpointPath(authContext.primaryProjectId)

  override protected def testEventsEndpointPathWithIncludeInactiveParam(
      authContext: TestAuthContext,
      includeInactive: Boolean): String =
    Endpoint.eventsAdminEndpointPathWithIncludeInactiveParam(authContext.primaryProjectId, includeInactive)

  override protected def testEventEndpointPath(
      authContext: TestAuthContext,
      eventId: EventConfigurationEventId): String =
    Endpoint.eventAdminEndpointPath(authContext.primaryProjectId, eventId)

  override protected def createTestEventConfiguration(
      requestPayload: CreateEventConfigurationRequest,
      authContext: TestAuthContext): EventConfiguration = {
    val requestPayloadJson =
      CreateEventConfigurationRequest.createEventConfigurationRequestPlayFormat.writes(requestPayload)
    val request =
      FakeRequest(POST, testEventsEndpointPath(authContext), headersWithJwt, AnyContentAsJson(requestPayloadJson))
    sendRequestAndReturnEventConfig(request, authContext, CREATED)
  }

  override protected def deactivateTestEventConfiguration(
      eventId: EventConfigurationEventId,
      authContext: TestAuthContext): EventConfiguration = {
    val request = FakeRequest(
      PATCH,
      testEventEndpointPath(authContext, eventId),
      headersWithJwt,
      AnyContentAsJson(SampleObjectFactory.deactivateEventConfigurationRequestJson))
    sendRequestAndReturnEventConfig(request, authContext)
  }
}
