package stella.leaderboard.server.routes

import java.util.UUID

import play.api.mvc.AnyContentAsEmpty
import play.api.test.Helpers._
import play.api.test._

import stella.leaderboard.server.routes.TestConstants.Endpoint._
import stella.leaderboard.server.routes.TestConstants.QueryParam

class LeaderboardRoutesWithInvalidJwtSpec extends RoutesWithInvalidJwtSpecBase {

  private val testAggregationResultsEndpointPath =
    aggregationResultsEndpointPath(UUID.randomUUID()) + s"?${QueryParam.orderBy}=desc_count"
  private val testAggregationWindowsEndpointPath = aggregationWindowsEndpointPath(UUID.randomUUID())
  private val testAggregationResultNeighborsEndpointPath =
    aggregationResultNeighborsEndpointPath(
      UUID.randomUUID()) + s"?${QueryParam.fieldValue}=foo&${QueryParam.orderBy}=desc_count"
  private val testCompareAggregationResultsEndpointPath =
    compareAggregationResultsEndpointPath(
      UUID.randomUUID()) + s"?${QueryParam.fieldValues}=foo&${QueryParam.orderBy}=desc_count"

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

  "getAggregationResults" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, testAggregationResultsEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, testAggregationResultsEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getAggregationResultNeighbors" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, testAggregationResultNeighborsEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request =
        FakeRequest(GET, testAggregationResultNeighborsEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "compareAggregationResults" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, testCompareAggregationResultsEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request =
        FakeRequest(GET, testCompareAggregationResultsEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }
}
