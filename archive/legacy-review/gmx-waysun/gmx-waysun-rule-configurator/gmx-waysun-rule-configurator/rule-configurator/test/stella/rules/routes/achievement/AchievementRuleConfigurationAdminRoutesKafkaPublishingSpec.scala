package stella.rules.routes.achievement

import org.scalacheck.Gen

import stella.common.models.Ids._

import stella.rules.models.Ids._
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.TestConstants.Endpoint
import stella.rules.services.RuleConfiguratorBoundedContext._

class AchievementRuleConfigurationAdminRoutesKafkaPublishingSpec
    extends AchievementRuleConfigurationRoutesKafkaPublishingSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.oneOf(
    SampleObjectFactory.primaryProjectId,
    SampleObjectFactory.additionalProjectId,
    SampleObjectFactory.additionalProjectId2)

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    RuleConfiguratorPermissions.AchievementRuleAdminWritePermission)

  override protected def testAchievementRulesEndpointPath(projectId: ProjectId): String =
    Endpoint.achievementAdminRulesEndpointPath(projectId)

  override protected def testAchievementRuleEndpointPath(
      projectId: ProjectId,
      ruleId: AchievementConfigurationRuleId): String =
    Endpoint.achievementAdminRuleEndpointPath(projectId, ruleId)
}
