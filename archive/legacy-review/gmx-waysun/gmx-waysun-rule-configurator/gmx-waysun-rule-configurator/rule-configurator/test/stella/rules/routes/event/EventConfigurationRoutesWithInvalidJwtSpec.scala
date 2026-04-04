package stella.rules.routes.event

import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.Helpers._
import play.api.test._

import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.routes.RoutesWithInvalidJwtSpecBase
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestConstants.Endpoint._

class EventConfigurationRoutesWithInvalidJwtSpec extends RoutesWithInvalidJwtSpecBase {

  private val testEventEndpointPath = eventEndpointPath(EventConfigurationEventId.random())
  private val testEventAdminEndpointPath = eventAdminEndpointPath(primaryProjectId, EventConfigurationEventId.random())
  private val testEventsAdminEndpointPath = eventsAdminEndpointPath(primaryProjectId)

  "getEventConfigurations" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, eventsEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, eventsEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "createEventConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(
        POST,
        eventsEndpointPath,
        defaultHeaders,
        AnyContentAsJson(SampleObjectFactory.createEventConfigurationRequestJson))
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        POST,
        eventsEndpointPath,
        headersWithInvalidJwt,
        SampleObjectFactory.createEventConfigurationRequestJson)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getEventConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, testEventEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, testEventEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "updateEventConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(
        PATCH,
        testEventEndpointPath,
        defaultHeaders,
        AnyContentAsJson(SampleObjectFactory.activateEventConfigurationRequestJson))
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        PATCH,
        testEventEndpointPath,
        headersWithInvalidJwt,
        AnyContentAsJson(SampleObjectFactory.activateEventConfigurationRequestJson))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "deleteEventConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(DELETE, testEventEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(DELETE, testEventEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getEventConfigurationsAsAdmin" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, testEventsAdminEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, testEventsAdminEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "createEventConfigurationAsAdmin" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(
        POST,
        testEventsAdminEndpointPath,
        defaultHeaders,
        AnyContentAsJson(SampleObjectFactory.createEventConfigurationRequestJson))
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        POST,
        testEventsAdminEndpointPath,
        headersWithInvalidJwt,
        SampleObjectFactory.createEventConfigurationRequestJson)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getEventConfigurationAsAdmin" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, testEventAdminEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, testEventAdminEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "updateEventConfigurationAsAdmin" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(
        PATCH,
        testEventAdminEndpointPath,
        defaultHeaders,
        AnyContentAsJson(SampleObjectFactory.activateEventConfigurationRequestJson))
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        PATCH,
        testEventAdminEndpointPath,
        headersWithInvalidJwt,
        AnyContentAsJson(SampleObjectFactory.activateEventConfigurationRequestJson))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "deleteEventConfigurationAsAdmin" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(DELETE, testEventAdminEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(DELETE, testEventAdminEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }
}
