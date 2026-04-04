package stella.rules.routes

import org.scalamock.scalatest.MockFactory
import org.scalatest.Assertion
import org.scalatestplus.play.BaseOneAppPerSuite
import org.scalatestplus.play.FakeApplicationFactory
import org.scalatestplus.play.PlaySpec
import play.api.Application
import play.api.ApplicationLoader.Context
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.http.Status.UNAUTHORIZED
import play.api.http.Writeable
import play.api.mvc.Headers
import play.api.test.FakeRequest
import play.api.test.Helpers.contentAsString
import play.api.test.Helpers.contentType
import play.api.test.Helpers.defaultAwaitTimeout
import play.api.test.Helpers.route
import play.api.test.Helpers.status

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.kafka.KafkaPublicationService
import stella.dataapi.aggregation
import stella.dataapi.eventconfigurations

import stella.rules.RuleConfiguratorComponents
import stella.rules.routes.ResponseFormats.errorOutputFormats._
import stella.rules.routes.SampleObjectFactory._

trait RoutesWithInvalidJwtSpecBase
    extends PlaySpec
    with BaseOneAppPerSuite
    with FakeApplicationFactory
    with MockFactory {

  override def fakeApplication(): Application = new TestRuleConfiguratorAppBuilder {
    override def createRuleConfiguratorComponents(context: Context): RuleConfiguratorComponents =
      new RuleConfiguratorComponents(context: Context) {
        // do not initialise the real Kafka services/connections in these tests
        override lazy val kafkaEventConfigurationPublicationService: KafkaPublicationService[
          eventconfigurations.EventConfigurationKey,
          eventconfigurations.EventConfiguration] = mock[
          KafkaPublicationService[eventconfigurations.EventConfigurationKey, eventconfigurations.EventConfiguration]]

        override lazy val kafkaAggregationRuleConfigurationPublicationService: KafkaPublicationService[
          aggregation.AggregationRuleConfigurationKey,
          aggregation.AggregationRuleConfiguration] = mock[KafkaPublicationService[
          aggregation.AggregationRuleConfigurationKey,
          aggregation.AggregationRuleConfiguration]]
      }
  }.build()

  protected val headersWithInvalidJwt: Headers = defaultHeaders.add(HeaderNames.AUTHORIZATION -> "Bearer invalid-jwt")

  protected val missingAuthHeaderErrorMessage = "Invalid value for: header Authorization (missing)"

  protected def testRequestWithoutAuthToken[T: Writeable](request: FakeRequest[T]): Assertion =
    testUnauthorizedRequest(
      request,
      errorOutputResponse(PresentationErrorCode.Unauthorized, missingAuthHeaderErrorMessage))

  protected def testRequestWithInvalidAuthToken[T: Writeable](request: FakeRequest[T]): Assertion =
    testUnauthorizedRequest(request, errorOutputResponse(PresentationErrorCode.InvalidAuthToken))

  protected def testUnauthorizedRequest[T: Writeable](
      request: FakeRequest[T],
      errorResponse: Response[ErrorOutput]): Assertion = {
    val res = route(app, request).value

    status(res) mustBe UNAUTHORIZED
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[ErrorOutput]](res) mustBe errorResponse
  }
}
