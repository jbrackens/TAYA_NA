package stella.rules.routes.aggregation

import org.scalacheck.Gen

import stella.common.models.Ids._

import stella.rules.models.Ids._
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.TestConstants.Endpoint
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions

class AggregationRuleConfigurationAdminRoutesKafkaPublishingSpec
    extends AggregationRuleConfigurationRoutesKafkaPublishingSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.oneOf(
    SampleObjectFactory.primaryProjectId,
    SampleObjectFactory.additionalProjectId,
    SampleObjectFactory.additionalProjectId2)

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    RuleConfiguratorPermissions.AggregationRuleAdminWritePermission)

  override protected def testAggregationRulesEndpointPath(projectId: ProjectId): String =
    Endpoint.aggregationAdminRulesEndpointPath(projectId)

  override protected def testAggregationRuleEndpointPath(
      projectId: ProjectId,
      ruleId: AggregationRuleConfigurationRuleId): String =
    Endpoint.aggregationAdminRuleEndpointPath(projectId, ruleId)
}
