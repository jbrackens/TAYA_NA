package stella.rules.it.routes.achievement

import stella.rules.it.TestAuthContext
import stella.rules.models.Ids.AchievementConfigurationRuleId
import stella.rules.models.achievement.http._
import stella.rules.routes.TestConstants.Endpoint

class AchievementConfigurationRoutesSpec extends AchievementConfigurationRoutesSpecBase {

  override protected def testAchievementRulesEndpointPath(authContext: TestAuthContext): String =
    Endpoint.achievementRulesEndpointPath
  override protected def testAchievementRulesEndpointPathWithIncludeInactiveParam(
      authContext: TestAuthContext,
      includeInactive: Boolean): String = Endpoint.achievementRulesEndpointPathWithIncludeInactiveParam(includeInactive)
  override protected def testAchievementRuleEndpointPath(
      authContext: TestAuthContext,
      ruleId: AchievementConfigurationRuleId): String = Endpoint.achievementRuleEndpointPath(ruleId)

  override protected def createTestAchievementRuleConfiguration(
      requestPayload: CreateAchievementRuleConfigurationRequest,
      authContext: TestAuthContext): AchievementRuleConfiguration =
    createAchievementRuleConfiguration(requestPayload, authContext)

}
