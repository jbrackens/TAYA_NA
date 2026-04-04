package stella.rules.routes.aggregation

import scala.concurrent.ExecutionContext

import org.scalacheck.Arbitrary
import org.scalacheck.Gen
import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.Helpers._
import play.api.test._

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.AggregationRuleConfigurationRuleId
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.aggregation.http.UpdateAggregationRuleConfigurationRequest
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestConstants.Endpoint
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AggregationRuleAdminReadPermission
import stella.rules.services.RuleConfiguratorBoundedContext.RuleConfiguratorPermissions.AggregationRuleAdminWritePermission

class AggregationRuleConfigurationAdminRoutesWithMockedBoundedContextSpec
    extends AggregationRuleConfigurationRoutesWithMockedBoundedContextSpecBase {

  override protected val allowedProjectIdGen: Gen[ProjectId] = Gen.oneOf(
    SampleObjectFactory.primaryProjectId,
    SampleObjectFactory.additionalProjectId,
    SampleObjectFactory.additionalProjectId2)

  // project not included in auth context
  private val forbiddenProjectId = ProjectId.random()

  override protected def checkWritePermissionIsExpected(): Unit = checkExpectedPermission(
    AggregationRuleAdminWritePermission)

  override protected def checkReadPermissionIsExpected(): Unit = checkExpectedPermission(
    AggregationRuleAdminReadPermission)

  override protected def testAggregationRulesEndpointPath(projectId: ProjectId): String =
    Endpoint.aggregationAdminRulesEndpointPath(projectId)

  override protected def testAggregationRulesEndpointPathWithIncludeInactiveParam(
      projectId: ProjectId,
      includeInactive: Boolean): String =
    Endpoint.aggregationAdminRulesEndpointPathWithIncludeInactiveParam(includeInactive, projectId)

  override protected def testAggregationRuleEndpointPath(
      projectId: ProjectId,
      ruleId: AggregationRuleConfigurationRuleId): String =
    Endpoint.aggregationAdminRuleEndpointPath(projectId, ruleId)

  "access to other project than specified in auth context" should {

    "be forbidden in getAggregationRuleConfigurations" in {
      forAll(Arbitrary.arbBool.arbitrary) { includeInactive =>
        checkReadPermissionIsExpected()
        (boundedContext
          .getAggregationRuleConfigurations(_: Boolean, _: ProjectId)(_: ExecutionContext))
          .expects(*, *, *)
          .never()
        val request = FakeRequest(
          GET,
          testAggregationRulesEndpointPathWithIncludeInactiveParam(forbiddenProjectId, includeInactive),
          headersWithFakeJwt,
          AnyContentAsEmpty)
        sendAndExpectAggregationRuleConfigForbidden(request)
      }
    }

    "be forbidden in createAggregationRuleConfiguration" in {
      checkWritePermissionIsExpected()
      (boundedContext
        .createAggregationRuleConfiguration(_: CreateAggregationRuleConfigurationRequest, _: ProjectId)(
          _: ExecutionContext))
        .expects(*, *, *)
        .never()
      val request = FakeRequest(
        POST,
        testAggregationRulesEndpointPath(forbiddenProjectId),
        headersWithFakeJwt,
        AnyContentAsJson(createAggregationRuleConfigurationRequestJson))
      sendAndExpectAggregationRuleConfigForbidden(request)
    }

    "be forbidden in getAggregationRuleConfiguration" in {
      checkReadPermissionIsExpected()
      (boundedContext
        .getAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(*, *, *)
        .never()
      val request =
        FakeRequest(
          GET,
          testAggregationRuleEndpointPath(forbiddenProjectId, ruleId),
          headersWithFakeJwt,
          AnyContentAsEmpty)
      sendAndExpectAggregationRuleConfigForbidden(request)
    }

    "be forbidden in updateAggregationRuleConfiguration" in {
      checkWritePermissionIsExpected()
      (boundedContext
        .updateAggregationRuleConfiguration(
          _: AggregationRuleConfigurationRuleId,
          _: UpdateAggregationRuleConfigurationRequest,
          _: ProjectId)(_: ExecutionContext))
        .expects(*, *, *, *)
        .never()
      val request =
        FakeRequest(
          PATCH,
          testAggregationRuleEndpointPath(forbiddenProjectId, ruleId),
          headersWithFakeJwt,
          AnyContentAsJson(activateAggregationRuleConfigurationRequestJson))
      sendAndExpectAggregationRuleConfigForbidden(request)
    }

    "be forbidden in deleteAggregationRuleConfiguration" in {
      checkWritePermissionIsExpected()
      (boundedContext
        .deleteAggregationRuleConfiguration(_: AggregationRuleConfigurationRuleId, _: ProjectId)(_: ExecutionContext))
        .expects(*, *, *)
        .never()
      val request =
        FakeRequest(
          DELETE,
          testAggregationRuleEndpointPath(forbiddenProjectId, ruleId),
          headersWithFakeJwt,
          AnyContentAsEmpty)
      sendAndExpectAggregationRuleConfigForbidden(request)
    }

  }

}
