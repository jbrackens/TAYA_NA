package stella.rules.it.routes.achievement

import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers.CREATED
import play.api.test.Helpers.POST
import play.api.test.Helpers.writeableOf_AnyContentAsJson

import stella.rules.it.TestAuthContext
import stella.rules.models.Ids.AchievementConfigurationRuleId
import stella.rules.models.achievement.http._
import stella.rules.routes.TestConstants.Endpoint

class AchievementConfigurationAdminRoutesSpec extends AchievementConfigurationRoutesSpecBase {

  override protected def testAchievementRulesEndpointPath(authContext: TestAuthContext): String =
    Endpoint.achievementAdminRulesEndpointPath(authContext.primaryProjectId)
  override protected def testAchievementRulesEndpointPathWithIncludeInactiveParam(
      authContext: TestAuthContext,
      includeInactive: Boolean): String =
    Endpoint.achievementAdminRulesEndpointPathWithIncludeInactiveParam(includeInactive, authContext.primaryProjectId)
  override protected def testAchievementRuleEndpointPath(
      authContext: TestAuthContext,
      ruleId: AchievementConfigurationRuleId): String =
    Endpoint.achievementAdminRuleEndpointPath(authContext.primaryProjectId, ruleId)

  override protected def createTestAchievementRuleConfiguration(
      requestPayload: CreateAchievementRuleConfigurationRequest,
      authContext: TestAuthContext): AchievementRuleConfiguration = {
    val requestPayloadJson =
      CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(
        requestPayload)
    val request = FakeRequest(
      POST,
      testAchievementRulesEndpointPath(authContext),
      headersWithJwt,
      AnyContentAsJson(requestPayloadJson))
    sendRequestAndReturnAchievementConfig(request, authContext, CREATED)
  }
}
