package stella.rules.routes.achievement

import org.scalacheck.Gen

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.AchievementConfigurationRuleId
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.TestConstants._
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AchievementRuleReadPermission
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AchievementRuleWritePermission

class AchievementRuleConfigurationRoutesWithMockedBoundedContextSpec
    extends AchievementRuleConfigurationRoutesWithMockedBoundedContextSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.const(SampleObjectFactory.primaryProjectId)

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    AchievementRuleWritePermission)

  override protected def checkReadPermissionIsExpected(): Unit = checkExpectedPermission(AchievementRuleReadPermission)

  override protected def testAchievementRulesEndpointPath(projectId: ProjectId): String =
    Endpoint.achievementRulesEndpointPath

  override protected def testAchievementRulesEndpointPathWithIncludeInactiveParam(
      projectId: ProjectId,
      includeInactive: Boolean): String = Endpoint.achievementRulesEndpointPathWithIncludeInactiveParam(includeInactive)

  override protected def testAchievementRuleEndpointPath(
      projectId: ProjectId,
      ruleId: AchievementConfigurationRuleId): String = Endpoint.achievementRuleEndpointPath(ruleId)

}
