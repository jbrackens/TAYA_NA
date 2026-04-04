package stella.rules.it.routes.aggregation

import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers.CREATED
import play.api.test.Helpers.POST
import play.api.test.Helpers.writeableOf_AnyContentAsJson

import stella.rules.it.TestAuthContext
import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.routes.TestConstants.Endpoint

class AggregationRuleConfigurationAdminRoutesSpec extends AggregationRuleConfigurationRoutesSpecBase {

  override protected def testAggregationRulesEndpointPath(authContext: TestAuthContext): String =
    Endpoint.aggregationAdminRulesEndpointPath(authContext.primaryProjectId)
  override protected def testAggregationRulesEndpointPathWithIncludeInactiveParam(
      authContext: TestAuthContext,
      includeInactive: Boolean): String =
    Endpoint.aggregationAdminRulesEndpointPathWithIncludeInactiveParam(includeInactive, authContext.primaryProjectId)
  override protected def testAggregationRuleEndpointPath(
      authContext: TestAuthContext,
      ruleId: AggregationRuleConfigurationRuleId): String =
    Endpoint.aggregationAdminRuleEndpointPath(authContext.primaryProjectId, ruleId)

  override protected def createTestAggregationRuleConfiguration(
      requestPayload: CreateAggregationRuleConfigurationRequest,
      authContext: TestAuthContext): AggregationRuleConfiguration = {
    val requestPayloadJson =
      CreateAggregationRuleConfigurationRequest.createAggregationRuleConfigurationRequestPlayFormat.writes(
        requestPayload)
    val request = FakeRequest(
      POST,
      testAggregationRulesEndpointPath(authContext),
      headersWithJwt,
      AnyContentAsJson(requestPayloadJson))
    sendRequestAndReturnAggregationRuleConfig(request, authContext, CREATED)
  }

}
