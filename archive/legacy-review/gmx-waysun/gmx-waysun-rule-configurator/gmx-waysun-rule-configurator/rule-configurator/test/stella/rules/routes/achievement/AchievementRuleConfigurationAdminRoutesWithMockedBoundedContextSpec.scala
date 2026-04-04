package stella.rules.routes.achievement

import scala.concurrent.ExecutionContext

import org.scalacheck.Arbitrary
import org.scalacheck.Gen
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.AchievementConfigurationRuleId
import stella.rules.models.achievement.http.CreateAchievementRuleConfigurationRequest
import stella.rules.models.achievement.http.UpdateAchievementRuleConfigurationRequest
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory.activateAchievementRuleConfigurationRequestJson
import stella.rules.routes.SampleObjectFactory.createAchievementRuleConfigurationRequestWithEventPayloadJson
import stella.rules.routes.TestConstants._
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AchievementRuleAdminReadPermission
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AchievementRuleAdminWritePermission

class AchievementRuleConfigurationAdminRoutesWithMockedBoundedContextSpec
    extends AchievementRuleConfigurationRoutesWithMockedBoundedContextSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.oneOf(
    SampleObjectFactory.primaryProjectId,
    SampleObjectFactory.additionalProjectId,
    SampleObjectFactory.additionalProjectId2)

  // project not included in auth context
  private val forbiddenProjectId = ProjectId.random()

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    AchievementRuleAdminWritePermission)

  override protected def checkReadPermissionIsExpected(): Unit = checkExpectedPermission(
    AchievementRuleAdminReadPermission)

  override protected def testAchievementRulesEndpointPath(projectId: ProjectId): String =
    Endpoint.achievementAdminRulesEndpointPath(projectId)

  override protected def testAchievementRulesEndpointPathWithIncludeInactiveParam(
      projectId: ProjectId,
      includeInactive: Boolean): String =
    Endpoint.achievementAdminRulesEndpointPathWithIncludeInactiveParam(includeInactive, projectId)

  override protected def testAchievementRuleEndpointPath(
      projectId: ProjectId,
      ruleId: AchievementConfigurationRuleId): String = Endpoint.achievementAdminRuleEndpointPath(projectId, ruleId)

  "access to other project than specified in auth context" should {

    "be forbidden in getAchievementRuleConfigurations" in {
      forAll(Arbitrary.arbBool.arbitrary) { includeInactive =>
        checkReadPermissionIsExpected()
        (boundedContext
          .getAchievementRuleConfigurations(_: Boolean, _: ProjectId)(_: ExecutionContext))
          .expects(includeInactive, *, *)
          .never()
        val request = FakeRequest(
          GET,
          testAchievementRulesEndpointPathWithIncludeInactiveParam(forbiddenProjectId, includeInactive),
          headersWithFakeJwt,
          AnyContentAsEmpty)
        sendAndExpectAchievementRuleConfigForbidden(request)
      }
    }

    "be forbidden in createAchievementRuleConfiguration" in {
      checkWritePermissionIsExpected()
      (boundedContext
        .createAchievementRuleConfiguration(_: CreateAchievementRuleConfigurationRequest, _: ProjectId)(
          _: ExecutionContext))
        .expects(*, *, *)
        .never()
      val request = FakeRequest(
        POST,
        testAchievementRulesEndpointPath(forbiddenProjectId),
        headersWithFakeJwt,
        AnyContentAsJson(createAchievementRuleConfigurationRequestWithEventPayloadJson))
      sendAndExpectAchievementRuleConfigForbidden(request)
    }

    "be forbidden in getAchievementRuleConfiguration" in {
      checkReadPermissionIsExpected()
      (boundedContext
        .getAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(*, *, *)
        .never()
      val request =
        FakeRequest(
          GET,
          testAchievementRuleEndpointPath(forbiddenProjectId, ruleId),
          headersWithFakeJwt,
          AnyContentAsEmpty)
      sendAndExpectAchievementRuleConfigForbidden(request)
    }

    "be forbidden in updateAchievementRuleConfiguration" in {
      checkWritePermissionIsExpected()
      (boundedContext
        .updateAchievementRuleConfiguration(
          _: AchievementConfigurationRuleId,
          _: UpdateAchievementRuleConfigurationRequest,
          _: ProjectId)(_: ExecutionContext))
        .expects(*, *, *, *)
        .never()
      val request =
        FakeRequest(
          PATCH,
          testAchievementRuleEndpointPath(forbiddenProjectId, ruleId),
          headersWithFakeJwt,
          AnyContentAsJson(activateAchievementRuleConfigurationRequestJson))
      sendAndExpectAchievementRuleConfigForbidden(request)
    }

    "be forbidden in deleteAchievementRuleConfiguration" in {
      checkWritePermissionIsExpected()
      (boundedContext
        .deleteAchievementRuleConfiguration(_: AchievementConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(*, *, *)
        .never()
      val request =
        FakeRequest(
          DELETE,
          testAchievementRuleEndpointPath(forbiddenProjectId, ruleId),
          headersWithFakeJwt,
          AnyContentAsEmpty)
      sendAndExpectAchievementRuleConfigForbidden(request)
    }

  }
}
