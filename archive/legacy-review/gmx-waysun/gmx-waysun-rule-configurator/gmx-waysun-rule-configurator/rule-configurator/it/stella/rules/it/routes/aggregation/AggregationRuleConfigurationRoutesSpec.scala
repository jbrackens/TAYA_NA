package stella.rules.it.routes.aggregation

import stella.rules.it.TestAuthContext
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.routes.TestConstants.Endpoint

class AggregationRuleConfigurationRoutesSpec extends AggregationRuleConfigurationRoutesSpecBase {

  override protected def testAggregationRulesEndpointPath(authContext: TestAuthContext): String =
    Endpoint.aggregationRulesEndpointPath
  override protected def testAggregationRulesEndpointPathWithIncludeInactiveParam(
      authContext: TestAuthContext,
      includeInactive: Boolean): String = Endpoint.aggregationRulesEndpointPathWithIncludeInactiveParam(includeInactive)
  override protected def testAggregationRuleEndpointPath(
      authContext: TestAuthContext,
      ruleId: AggregationRuleConfigurationRuleId): String = Endpoint.aggregationRuleEndpointPath(ruleId)

  override protected def createTestAggregationRuleConfiguration(
      requestPayload: CreateAggregationRuleConfigurationRequest,
      authContext: TestAuthContext): AggregationRuleConfiguration =
    createAggregationRuleConfiguration(requestPayload, authContext)

}
