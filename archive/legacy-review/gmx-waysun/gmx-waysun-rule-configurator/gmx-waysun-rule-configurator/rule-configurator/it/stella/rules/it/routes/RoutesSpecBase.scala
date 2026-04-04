package stella.rules.it.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalamock.scalatest.MockFactory
import org.scalatest.Assertion
import org.scalatestplus.play.BaseOneAppPerSuite
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.http.Writeable
import play.api.mvc.AnyContentAsJson
import play.api.test.FakeHeaders
import play.api.test.FakeRequest
import play.api.test.Helpers._
import spray.json.JsonReader

import stella.common.http.BearerToken
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.FullyPermissivePermissions
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.JwtAuthorization.JwtAuthorizationError
import stella.common.http.jwt.Permission
import stella.common.http.jwt.StellaAuthContext

import stella.rules.it.IntegrationTestBase
import stella.rules.it.TestAuthContext
import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.achievement.http.AchievementRuleConfiguration
import stella.rules.models.achievement.http.CreateAchievementRuleConfigurationRequest
import stella.rules.models.aggregation.http.AggregationRuleConfiguration
import stella.rules.models.aggregation.http.CreateAggregationRuleConfigurationRequest
import stella.rules.models.event.http.CreateEventConfigurationRequest
import stella.rules.models.event.http.EventConfiguration
import stella.rules.routes.ResponseFormats._
import stella.rules.routes.ResponseFormats.errorOutputFormats._
import stella.rules.routes.SampleObjectFactory.contentAs
import stella.rules.routes.SampleObjectFactory.deactivateEventConfigurationRequestJson
import stella.rules.routes.TestConstants
import stella.rules.routes.TestConstants.Endpoint.achievementRulesEndpointPath
import stella.rules.routes.TestConstants.Endpoint.aggregationRulesEndpointPath
import stella.rules.routes.TestConstants.Endpoint.eventEndpointPath
import stella.rules.routes.TestConstants.Endpoint.eventsEndpointPath
import stella.rules.utils.AdjustableClock

trait RoutesSpecBase extends IntegrationTestBase with BaseOneAppPerSuite with MockFactory {
  protected type ResponseJsonReader[T] = JsonReader[Response[T]]

  override implicit protected lazy val testClock = new AdjustableClock
  override protected val jwtAuth: JwtAuthorization[StellaAuthContext] = mock[JwtAuthorization[StellaAuthContext]]

  protected val headersWithJwt: FakeHeaders = FakeHeaders(
    Seq(HeaderNames.HOST -> "localhost", HeaderNames.AUTHORIZATION -> "Bearer some-jwt"))

  protected def createEventConfiguration(
      requestPayload: CreateEventConfigurationRequest,
      authContext: TestAuthContext): EventConfiguration = {
    val requestPayloadJson =
      CreateEventConfigurationRequest.createEventConfigurationRequestPlayFormat.writes(requestPayload)
    val request = FakeRequest(POST, eventsEndpointPath, headersWithJwt, AnyContentAsJson(requestPayloadJson))
    sendRequestAndReturnEventConfig(request, authContext, CREATED)
  }

  protected def deactivateEventConfiguration(
      eventId: EventConfigurationEventId,
      authContext: TestAuthContext): EventConfiguration = {
    val request = FakeRequest(
      PATCH,
      eventEndpointPath(eventId),
      headersWithJwt,
      AnyContentAsJson(deactivateEventConfigurationRequestJson))
    sendRequestAndReturnEventConfig(request, authContext)
  }

  protected def createAggregationRuleConfiguration(
      requestPayload: CreateAggregationRuleConfigurationRequest,
      authContext: TestAuthContext): AggregationRuleConfiguration = {
    val requestPayloadJson =
      CreateAggregationRuleConfigurationRequest.createAggregationRuleConfigurationRequestPlayFormat.writes(
        requestPayload)
    val request = FakeRequest(POST, aggregationRulesEndpointPath, headersWithJwt, AnyContentAsJson(requestPayloadJson))
    sendRequestAndReturnAggregationRuleConfig(request, authContext, CREATED)
  }

  protected def createAchievementRuleConfiguration(
      requestPayload: CreateAchievementRuleConfigurationRequest,
      authContext: TestAuthContext): AchievementRuleConfiguration = {
    val requestPayloadJson =
      CreateAchievementRuleConfigurationRequest.createAchievementRuleConfigurationRequestPlayFormat.writes(
        requestPayload)
    val request = FakeRequest(POST, achievementRulesEndpointPath, headersWithJwt, AnyContentAsJson(requestPayloadJson))
    sendRequestAndReturnAchievementConfig(request, authContext, CREATED)
  }

  protected def sendRequestAndReturnAggregationRuleConfig[ContentType: Writeable](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext,
      expectedStatusCode: Int = OK): AggregationRuleConfiguration =
    sendRequestAndReturnDetails[ContentType, AggregationRuleConfiguration](request, authContext, expectedStatusCode)

  protected def sendRequestAndReturnEventConfig[ContentType: Writeable](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext,
      expectedStatusCode: Int = OK): EventConfiguration =
    sendRequestAndReturnDetails[ContentType, EventConfiguration](request, authContext, expectedStatusCode)

  protected def sendRequestAndReturnAchievementConfig[ContentType: Writeable](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext,
      expectedStatusCode: Int = OK): AchievementRuleConfiguration =
    sendRequestAndReturnDetails[ContentType, AchievementRuleConfiguration](request, authContext, expectedStatusCode)

  protected def sendRequestAndReturnDetails[ContentType: Writeable, Res: ResponseJsonReader](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext,
      expectedStatusCode: Int = OK): Res = {
    // WHEN: we send a request
    authenticateNextRequest(authContext)
    val res = route(app, request).value

    // THEN: the request succeeded and the proper value is returned
    status(res) mustBe expectedStatusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    val response = contentAs[Response[Res]](res)
    response.status mustBe TestConstants.okStatus
    response.details
  }

  protected def testFailedRequest[ContentType: Writeable](
      request: FakeRequest[ContentType],
      expectedStatusCode: Int,
      expectedErrorCode: PresentationErrorCode,
      authContext: TestAuthContext): Assertion = {
    // WHEN: we send a request
    authenticateNextRequest(authContext)
    val res = route(app, request).value

    // THEN: it should fail with expected code and json result
    val expectedRes = Response.asFailure(ErrorOutput.one(expectedErrorCode))
    status(res) mustBe expectedStatusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[ErrorOutput]](res) mustBe expectedRes
  }

  protected def testFailedRequest[ContentType: Writeable](
      request: FakeRequest[ContentType],
      expectedStatusCode: Int,
      expectedErrorCode: PresentationErrorCode,
      expectedErrorMessage: String,
      authContext: TestAuthContext): Assertion = {
    // WHEN: we send a request
    authenticateNextRequest(authContext)
    val res = route(app, request).value

    // THEN: it should fail with expected code and json result
    val expectedRes = Response.asFailure(ErrorOutput.one(expectedErrorCode, expectedErrorMessage))
    status(res) mustBe expectedStatusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[ErrorOutput]](res) mustBe expectedRes
  }

  protected def testAuthContextToReturn(
      testAuthContext: StellaAuthContext): EitherT[Future, JwtAuthorizationError, StellaAuthContext] =
    EitherT[Future, JwtAuthorizationError, StellaAuthContext](Future.successful(Right(testAuthContext)))

  protected def authenticateNextRequest(authContext: TestAuthContext): Unit = {
    val _ = (jwtAuth
      .verify(_: BearerToken, _: Seq[Permission])(_: ExecutionContext))
      .expects(*, *, *)
      .returning(testAuthContextToReturn(StellaAuthContext(
        FullyPermissivePermissions,
        userId = authContext.userId,
        primaryProjectId = authContext.primaryProjectId,
        additionalProjectIds = authContext.additionalProjectIds)))
      .once()
  }
}
