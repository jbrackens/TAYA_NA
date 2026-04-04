package stella.usercontext.it.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import io.circe.Json
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.http.Writeable
import play.api.test.FakeHeaders
import play.api.test.FakeRequest
import play.api.test.Helpers._
import spray.json.JsonReader

import stella.common.http.BearerToken
import stella.common.http.Response
import stella.common.http.jwt.FullyPermissivePermissions
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.JwtAuthorization.JwtAuthorizationError
import stella.common.http.jwt.Permission
import stella.common.http.jwt.StellaAuthContext

import stella.usercontext.it.IntegrationTestBase
import stella.usercontext.it.utils.TestAuthContext
import stella.usercontext.routes.ResponseFormats._
import stella.usercontext.routes.SampleObjectFactory
import stella.usercontext.routes.SampleObjectFactory.contentAs

trait RoutesSpecBase extends IntegrationTestBase {
  protected type ResponseJsonReader[T] = JsonReader[Response[T]]

  override protected lazy val jwtAuth: JwtAuthorization[StellaAuthContext] = mock[JwtAuthorization[StellaAuthContext]]

  protected val headersWithJwt: FakeHeaders = FakeHeaders(
    Seq(HeaderNames.HOST -> "localhost", HeaderNames.AUTHORIZATION -> "Bearer some-jwt"))

  protected def sendRequestAndReturnUserContextData[ContentType: Writeable](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext,
      expectedStatusCode: Int = OK): Json = {
    // WHEN: we send a request
    authenticateNextRequest(authContext)
    val res = route(app, request).value

    // THEN: the request succeeded and the proper value is returned
    status(res) mustBe expectedStatusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    val response = contentAs[Response[Json]](res)
    response.status mustBe SampleObjectFactory.okStatus
    response.details
  }

  def sendRequestWithNoResultBody[ContentType: Writeable](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext,
      expectedStatusCode: Int = OK): Unit = {
    // WHEN: we send a request
    authenticateNextRequest(authContext)
    val res = route(app, request).value

    // THEN: the request succeeded and the proper value is returned
    status(res) mustBe expectedStatusCode
    contentType(res) mustBe None
    ()
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
}
