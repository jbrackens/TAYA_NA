package stella.rules.routes.aggregation

import java.util.UUID

import play.api.mvc.AnyContentAsEmpty
import play.api.mvc.AnyContentAsJson
import play.api.test.Helpers._
import play.api.test._

import stella.rules.routes.RoutesWithInvalidJwtSpecBase
import stella.rules.routes.SampleObjectFactory
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.TestConstants.Endpoint._

class AggregationRuleConfigurationRoutesWithInvalidJwtSpec extends RoutesWithInvalidJwtSpecBase {

  private val testAggregationRuleEndpointPath = aggregationRuleEndpointPath(UUID.randomUUID())

  "getAggregationRuleConfigurations" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, aggregationRulesEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request =
        FakeRequest(GET, aggregationRulesEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "createAggregationRuleConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(
        POST,
        aggregationRulesEndpointPath,
        defaultHeaders,
        AnyContentAsJson(SampleObjectFactory.createAggregationRuleConfigurationRequestJson))
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        POST,
        aggregationRulesEndpointPath,
        headersWithInvalidJwt,
        AnyContentAsJson(SampleObjectFactory.createAggregationRuleConfigurationRequestJson))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "getAggregationRuleConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(GET, testAggregationRuleEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(GET, testAggregationRuleEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }

  "updateAggregationRuleConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(
        PATCH,
        testAggregationRuleEndpointPath,
        defaultHeaders,
        AnyContentAsJson(SampleObjectFactory.activateEventConfigurationRequestJson))
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(
        PATCH,
        testAggregationRuleEndpointPath,
        headersWithInvalidJwt,
        AnyContentAsJson(SampleObjectFactory.activateEventConfigurationRequestJson))
      testRequestWithInvalidAuthToken(request)
    }
  }

  "deleteAggregationRuleConfiguration" should {
    "return Unauthorized when JWT was not passed" in {
      val request = FakeRequest(DELETE, testAggregationRuleEndpointPath)
      testRequestWithoutAuthToken(request)
    }

    "return Unauthorized when invalid JWT was passed" in {
      val request = FakeRequest(DELETE, testAggregationRuleEndpointPath, headersWithInvalidJwt, AnyContentAsEmpty)
      testRequestWithInvalidAuthToken(request)
    }
  }
}
