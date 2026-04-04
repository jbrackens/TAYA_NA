package stella.rules.routes.event

import org.scalacheck.Gen

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.TestConstants.Endpoint
import stella.rules.services.RuleConfiguratorBoundedContext._

class EventConfigurationUserRoutesWithMockedBoundedContextSpec
    extends EventConfigurationRoutesWithMockedBoundedContextSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.const(SampleObjectFactory.primaryProjectId)

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    RuleConfiguratorPermissions.EventWritePermission)

  override protected def checkReadPermissionIsExpected(): Unit = checkExpectedPermission(
    RuleConfiguratorPermissions.EventReadPermission)

  override protected def testEventsEndpointPath(projectId: ProjectId): String = Endpoint.eventsEndpointPath

  override protected def testEventsEndpointPathWithIncludeInactiveParam(
      projectId: ProjectId,
      includeInactive: Boolean): String =
    Endpoint.eventsEndpointPathWithIncludeInactiveParam(includeInactive)

  override protected def testEventEndpointPath(projectId: ProjectId, eventId: EventConfigurationEventId): String =
    Endpoint.eventEndpointPath(eventId)
}
