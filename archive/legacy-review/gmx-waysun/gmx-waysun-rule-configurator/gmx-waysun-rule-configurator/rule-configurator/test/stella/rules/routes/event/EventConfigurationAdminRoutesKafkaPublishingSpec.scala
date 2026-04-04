package stella.rules.routes.event

import org.scalacheck.Gen

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.TestConstants.Endpoint
import stella.rules.services.RuleConfiguratorBoundedContext._

class EventConfigurationAdminRoutesKafkaPublishingSpec extends EventConfigurationRoutesKafkaPublishingSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.oneOf(
    SampleObjectFactory.primaryProjectId,
    SampleObjectFactory.additionalProjectId,
    SampleObjectFactory.additionalProjectId2)

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    RuleConfiguratorPermissions.EventAdminWritePermission)

  override protected def testEventsEndpointPath(projectId: ProjectId): String =
    Endpoint.eventsAdminEndpointPath(projectId)

  override protected def testEventEndpointPath(projectId: ProjectId, eventId: EventConfigurationEventId): String =
    Endpoint.eventAdminEndpointPath(projectId, eventId)
}
