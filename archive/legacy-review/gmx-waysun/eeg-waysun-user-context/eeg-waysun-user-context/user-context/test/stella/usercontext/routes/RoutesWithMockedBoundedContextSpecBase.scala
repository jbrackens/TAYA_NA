package stella.usercontext.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalamock.scalatest.MockFactory
import org.scalatest.Assertion
import org.scalatestplus.play.BaseOneAppPerTest
import org.scalatestplus.play.FakeApplicationFactory
import org.scalatestplus.play.PlaySpec
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks
import play.api.Application
import play.api.ApplicationLoader.Context
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.http.Writeable
import play.api.mvc.Headers
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.http.BearerToken
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.JwtAuthorization.JwtAuthorizationError
import stella.common.http.jwt.Permission
import stella.common.http.jwt.StellaAuthContext

import stella.usercontext.UserContextComponents
import stella.usercontext.routes.ResponseFormats.errorOutputFormats._
import stella.usercontext.routes.SampleObjectFactory._
import stella.usercontext.services.UserContextBoundedContext

trait RoutesWithMockedBoundedContextSpecBase
    extends PlaySpec
    with BaseOneAppPerTest
    with FakeApplicationFactory
    with MockFactory
    with ScalaCheckDrivenPropertyChecks {

  protected val jwtAuth: JwtAuthorization[StellaAuthContext] = mock[JwtAuthorization[StellaAuthContext]]
  protected val boundedContext: UserContextBoundedContext = mock[UserContextBoundedContext]
  protected val testAuthContextToReturn: EitherT[Future, JwtAuthorizationError, StellaAuthContext] =
    EitherT[Future, JwtAuthorizationError, StellaAuthContext](Future.successful(Right(testAuthContext)))

  override def fakeApplication(): Application = new TestUserContextAppBuilder {
    override def createUserContextComponents(context: Context): UserContextComponents =
      new UserContextComponents(context: Context) {
        override implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = jwtAuth

        override lazy val userContextBoundedContext: UserContextBoundedContext = boundedContext
      }
  }.build()

  protected val token: BearerToken = BearerToken("some-jwt")
  protected val headersWithFakeJwt: Headers =
    defaultHeaders.add(HeaderNames.AUTHORIZATION -> s"Bearer ${token.rawValue}")

  protected def sendAndExpectInternalError[T: Writeable](request: FakeRequest[T]): Assertion =
    sendAndExpectErrorCode(request, INTERNAL_SERVER_ERROR, PresentationErrorCode.InternalError)

  protected def sendAndExpectErrorCode[T: Writeable](
      request: FakeRequest[T],
      statusCode: Int,
      errorCode: PresentationErrorCode): Assertion = {
    val res = route(app, request).value
    status(res) mustBe statusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[ErrorOutput]](res) mustBe errorOutputResponse(errorCode)
  }

  protected def checkExpectedPermission(permission: Permission): Unit = {
    val _ = (jwtAuth
      .verify(_: BearerToken, _: Seq[Permission])(_: ExecutionContext))
      .expects(token, List(permission), *)
      .returning(testAuthContextToReturn)
      .once()
  }
}
