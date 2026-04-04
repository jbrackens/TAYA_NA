package stella.rules.it.routes.event

import stella.rules.it.TestAuthContext
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.routes.TestConstants.Endpoint

class EventConfigurationRoutesSpec extends EventConfigurationRoutesSpecBase {

  override protected def testEventsEndpointPath(authContext: TestAuthContext): String = Endpoint.eventsEndpointPath

  override protected def testEventsEndpointPathWithIncludeInactiveParam(
      authContext: TestAuthContext,
      includeInactive: Boolean): String =
    Endpoint.eventsEndpointPathWithIncludeInactiveParam(includeInactive)

  override protected def testEventEndpointPath(
      authContext: TestAuthContext,
      eventId: EventConfigurationEventId): String =
    Endpoint.eventEndpointPath(eventId)

  override protected def createTestEventConfiguration(
      requestPayload: CreateEventConfigurationRequest,
      authContext: TestAuthContext): EventConfiguration = createEventConfiguration(requestPayload, authContext)

  override protected def deactivateTestEventConfiguration(
      eventId: EventConfigurationEventId,
      authContext: TestAuthContext): EventConfiguration = deactivateEventConfiguration(eventId, authContext)
}
