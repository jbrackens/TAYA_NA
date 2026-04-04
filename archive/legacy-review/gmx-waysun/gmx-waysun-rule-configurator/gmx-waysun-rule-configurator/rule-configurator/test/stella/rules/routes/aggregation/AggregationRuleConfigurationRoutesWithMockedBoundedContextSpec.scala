package stella.rules.routes.aggregation

import org.scalacheck.Gen

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.TestConstants.Endpoint
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AggregationRuleReadPermission
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AggregationRuleWritePermission

class AggregationRuleConfigurationRoutesWithMockedBoundedContextSpec
    extends AggregationRuleConfigurationRoutesWithMockedBoundedContextSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.const(SampleObjectFactory.primaryProjectId)

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    AggregationRuleWritePermission)

  override protected def checkReadPermissionIsExpected(): Unit = checkExpectedPermission(AggregationRuleReadPermission)

  override protected def testAggregationRulesEndpointPath(projectId: ProjectId): String =
    Endpoint.aggregationRulesEndpointPath

  override protected def testAggregationRulesEndpointPathWithIncludeInactiveParam(
      projectId: ProjectId,
      includeInactive: Boolean): String = Endpoint.aggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive)

  override protected def testAggregationRuleEndpointPath(
      projectId: ProjectId,
      ruleId: AggregationRuleConfigurationRuleId): String = Endpoint.aggregationRuleEndpointPath(ruleId)

}
