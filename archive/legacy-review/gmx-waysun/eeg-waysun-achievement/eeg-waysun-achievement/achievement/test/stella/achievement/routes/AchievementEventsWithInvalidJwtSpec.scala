package stella.achievement.routes

import java.util.UUID

import play.api.mvc.AnyContentAsEmpty
import play.api.test.Helpers._
import play.api.test._

import stella.achievement.TestConstants.Endpoint._
import stella.achievement.TestConstants.QueryParam

class AchievementEventsWithInvalidJwtSpec extends RoutesWithInvalidJwtSpecBase {

  private val testAchievementEventsEndpointPath =
    achievementEventsEndpointPath(UUID.randomUUID()) + s"?${QueryParam.orderBy}=desc_field_value"
  private val testAggregationWindowsEndpointPath = aggregationWindowsEndpointPath(UUID.randomUUID())

  "getAggregationWindows" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, testAggregationWindowsEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, testAggregationWindowsEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getAchievementEvents" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, testAchievementEventsEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, testAchievementEventsEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }
}
