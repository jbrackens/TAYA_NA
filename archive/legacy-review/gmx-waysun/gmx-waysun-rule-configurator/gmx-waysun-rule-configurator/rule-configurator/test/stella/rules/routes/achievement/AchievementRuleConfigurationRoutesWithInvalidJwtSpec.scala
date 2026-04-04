package stella.rules.routes.achievement

import java.util.UUID

import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.Helpers._
import play.api.test._

import stella.rules.routes.RoutesWithInvalidJwtSpecBase
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestConstants.Endpoint._

class AchievementRuleConfigurationRoutesWithInvalidJwtSpec extends RoutesWithInvalidJwtSpecBase {

  private val testAchievementRuleEndpointPath = achievementRuleEndpointPath(UUID.randomUUID())

  "getAchievementRuleConfigurations" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, achievementRulesEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, achievementRulesEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "createAchievementRuleConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(
        POST,
        achievementRulesEndpointPath,
        defaultHeaders,
        AnyContentAsJson(SampleObjectFactory.createAchievementRuleConfigurationRequestWithEventPayloadJson))
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        POST,
        achievementRulesEndpointPath,
        headersWithInvalidJwt,
        AnyContentAsJson(SampleObjectFactory.createAchievementRuleConfigurationRequestWithEventPayloadJson))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getAchievementRuleConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, testAchievementRuleEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, testAchievementRuleEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "updateAchievementRuleConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(
        PATCH,
        testAchievementRuleEndpointPath,
        defaultHeaders,
        AnyContentAsJson(SampleObjectFactory.activateAchievementRuleConfigurationRequestJson))
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        PATCH,
        testAchievementRuleEndpointPath,
        headersWithInvalidJwt,
        AnyContentAsJson(SampleObjectFactory.activateAchievementRuleConfigurationRequestJson))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "deleteAchievementRuleConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(DELETE, testAchievementRuleEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(DELETE, testAchievementRuleEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }
}
