package stella.rules.routes.aggregation

import org.scalacheck.Gen

import stella.common.models.Ids._

import stella.rules.models.Ids._
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.TestConstants.Endpoint
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions

class AggregationRuleConfigurationRoutesKafkaPublishingSpec
    extends AggregationRuleConfigurationRoutesKafkaPublishingSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.const(SampleObjectFactory.primaryProjectId)

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    RuleConfiguratorPermissions.AggregationRuleWritePermission)

  override protected def testAggregationRulesEndpointPath(projectId: ProjectId): String =
    Endpoint.aggregationRulesEndpointPath

  override protected def testAggregationRuleEndpointPath(
      projectId: ProjectId,
      ruleId: AggregationRuleConfigurationRuleId): String =
    Endpoint.aggregationRuleEndpointPath(ruleId)
}
