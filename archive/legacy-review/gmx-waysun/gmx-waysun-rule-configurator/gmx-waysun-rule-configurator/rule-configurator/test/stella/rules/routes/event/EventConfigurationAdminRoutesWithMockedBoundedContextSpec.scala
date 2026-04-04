package stella.rules.routes.event

import org.scalacheck.Gen
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.Helpers._
import play.api.test._

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestConstants.Endpoint
import stella.rules.services.RuleConfiguratorBoundedContext._

class EventConfigurationAdminRoutesWithMockedBoundedContextSpec
    extends EventConfigurationRoutesWithMockedBoundedContextSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.oneOf(
    SampleObjectFactory.primaryProjectId,
    SampleObjectFactory.additionalProjectId,
    SampleObjectFactory.additionalProjectId2)

  // project not included in auth context
  private val forbiddenProjectId = ProjectId.random()

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    RuleConfiguratorPermissions.EventAdminWritePermission)

  override protected def checkReadPermissionIsExpected(): Unit = checkExpectedPermission(
    RuleConfiguratorPermissions.EventAdminReadPermission)

  override protected def testEventsEndpointPath(projectId: ProjectId): String =
    Endpoint.eventsAdminEndpointPath(projectId)

  override protected def testEventsEndpointPathWithIncludeInactiveParam(
      projectId: ProjectId,
      includeInactive: Boolean): String =
    Endpoint.eventsAdminEndpointPathWithIncludeInactiveParam(projectId, includeInactive)

  override protected def testEventEndpointPath(projectId: ProjectId, eventId: EventConfigurationEventId): String =
    Endpoint.eventAdminEndpointPath(projectId, eventId)

  "access to other project than specified in auth context" should {
    "be forbidden for getEventConfigurationsAsAdmin" in {
      checkReadPermissionIsExpected()
      val request =
        FakeRequest(GET, testEventsEndpointPath(forbiddenProjectId), headersWithFakeJwt, AnyContentAsEmpty)
      sendAndExpectForbidden(request)
    }

    "be forbidden for createEventConfigurationAsAdmin" in {
      checkWritePermissionIsExpected()
      val request =
        FakeRequest(
          POST,
          testEventsEndpointPath(forbiddenProjectId),
          headersWithFakeJwt,
          AnyContentAsJson(createEventConfigurationRequestJson))
      sendAndExpectForbidden(request)
    }

    "be forbidden for getEventConfigurationAsAdmin" in {
      checkReadPermissionIsExpected()
      val request =
        FakeRequest(GET, testEventEndpointPath(forbiddenProjectId, eventId), headersWithFakeJwt, AnyContentAsEmpty)
      sendAndExpectForbidden(request)
    }

    "be forbidden for updateEventConfigurationAsAdmin" in {
      checkWritePermissionIsExpected()
      val request =
        FakeRequest(
          PATCH,
          testEventEndpointPath(forbiddenProjectId, eventId),
          headersWithFakeJwt,
          AnyContentAsJson(activateEventConfigurationRequestJson))
      sendAndExpectForbidden(request)
    }

    "be forbidden for deleteEventConfigurationAsAdmin" in {
      checkWritePermissionIsExpected()
      val request =
        FakeRequest(DELETE, testEventEndpointPath(forbiddenProjectId, eventId), headersWithFakeJwt, AnyContentAsEmpty)
      sendAndExpectForbidden(request)
    }
  }

}
