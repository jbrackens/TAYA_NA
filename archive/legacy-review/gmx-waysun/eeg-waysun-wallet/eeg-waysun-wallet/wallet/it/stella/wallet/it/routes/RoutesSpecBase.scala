package stella.wallet.it.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.Assertion
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.http.Writeable
import play.api.test.FakeHeaders
import play.api.test.FakeRequest
import play.api.test.Helpers._
import spray.json.JsonReader

import stella.common.core.AdjustableClock
import stella.common.http.BearerToken
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.FullyPermissivePermissions
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.JwtAuthorization.JwtAuthorizationError
import stella.common.http.jwt.Permission
import stella.common.http.jwt.StellaAuthContext

import stella.wallet.it.IntegrationTestBase
import stella.wallet.it.utils.TestAuthContext
import stella.wallet.routes.ResponseFormats.errorOutputFormats._
import stella.wallet.routes.SampleObjectFactory
import stella.wallet.routes.SampleObjectFactory.contentAs

trait RoutesSpecBase extends IntegrationTestBase {
  protected type ResponseJsonReader[T] = JsonReader[Response[T]]

  override protected lazy val testClock = new AdjustableClock
  override protected lazy val jwtAuth: JwtAuthorization[StellaAuthContext] = mock[JwtAuthorization[StellaAuthContext]]

  protected val headersWithJwt: FakeHeaders = FakeHeaders(
    Seq(HeaderNames.HOST -> "localhost", HeaderNames.AUTHORIZATION -> "Bearer some-jwt"))

  protected def sendRequestWithEmptyResponse[ContentType: Writeable](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext,
      expectedStatusCode: Int = OK): Assertion = {
    // WHEN: we send a request
    authenticateNextRequest(authContext)
    val res = route(app, request).value

    // THEN: the request succeeded and the proper value is returned
    status(res) mustBe expectedStatusCode
    contentType(res) mustBe None
  }

  protected def sendRequestAndReturn[ContentType: Writeable, T: ResponseJsonReader](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext,
      expectedStatusCode: Int = OK): T = {
    // WHEN: we send a request
    authenticateNextRequest(authContext)
    val res = route(app, request).value

    // THEN: the request succeeded and the proper value is returned
    status(res) mustBe expectedStatusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    val response = contentAs[Response[T]](res)
    response.status mustBe SampleObjectFactory.okStatus
    response.details
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
        additionalProjectIds = authContext.additionalProjectIds.map(_.t))))
      .once()
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
}
