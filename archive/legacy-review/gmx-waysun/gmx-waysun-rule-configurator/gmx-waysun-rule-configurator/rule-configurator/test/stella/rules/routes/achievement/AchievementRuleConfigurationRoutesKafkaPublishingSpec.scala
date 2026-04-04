package stella.rules.routes.achievement

import org.scalacheck.Gen

import stella.common.models.Ids._

import stella.rules.models.Ids._
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.TestConstants.Endpoint
import stella.rules.services.RuleConfiguratorBoundedContext._

class AchievementRuleConfigurationRoutesKafkaPublishingSpec
    extends AchievementRuleConfigurationRoutesKafkaPublishingSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.const(SampleObjectFactory.primaryProjectId)

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    RuleConfiguratorPermissions.AchievementRuleWritePermission)

  override protected def testAchievementRulesEndpointPath(projectId: ProjectId): String =
    Endpoint.achievementRulesEndpointPath

  override protected def testAchievementRuleEndpointPath(
      projectId: ProjectId,
      ruleId: AchievementConfigurationRuleId): String =
    Endpoint.achievementRuleEndpointPath(ruleId)
}
