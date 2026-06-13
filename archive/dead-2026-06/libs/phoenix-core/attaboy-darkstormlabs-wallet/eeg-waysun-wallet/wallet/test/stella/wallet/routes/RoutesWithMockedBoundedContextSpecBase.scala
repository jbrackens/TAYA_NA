package stella.wallet.routes

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
import play.api.libs.json.JsObject
import play.api.libs.json.JsString
import play.api.mvc.Headers
import play.api.mvc.Request
import play.api.test.FakeRequest
import play.api.test.Helpers._
import spray.json.JsonReader

import stella.common.http.BearerToken
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.JwtAuthorization.JwtAuthorizationError
import stella.common.http.jwt.Permission
import stella.common.http.jwt.StellaAuthContext

import stella.wallet.WalletComponents
import stella.wallet.routes.ResponseFormats.errorOutputFormats._
import stella.wallet.routes.SampleObjectFactory._
import stella.wallet.services.WalletBoundedContext

trait RoutesWithMockedBoundedContextSpecBase
    extends PlaySpec
    with BaseOneAppPerTest
    with FakeApplicationFactory
    with MockFactory
    with ScalaCheckDrivenPropertyChecks {

  protected val jwtAuth: JwtAuthorization[StellaAuthContext] = mock[JwtAuthorization[StellaAuthContext]]
  protected val boundedContext: WalletBoundedContext = mock[WalletBoundedContext]
  protected val testAuthContextToReturn: EitherT[Future, JwtAuthorizationError, StellaAuthContext] =
    EitherT[Future, JwtAuthorizationError, StellaAuthContext](Future.successful(Right(testAuthContext)))

  override def fakeApplication(): Application = new TestWalletAppBuilder {
    override def createWalletComponents(context: Context): WalletComponents =
      new WalletComponents(context: Context) {
        override implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = jwtAuth

        override lazy val walletBoundedContext: WalletBoundedContext = boundedContext
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

  protected def checkExpectedPermission(permission: Permission*): Unit = {
    val _ = (jwtAuth
      .verify(_: BearerToken, _: Seq[Permission])(_: ExecutionContext))
      .expects(token, permission, *)
      .returning(testAuthContextToReturn)
      .once()
  }

  protected def testRequestWithBadRequestResponse[T: Writeable](
      request: FakeRequest[T],
      expectedErrorMessage: String): Assertion =
    testRequestWithErrorResponse(request, Some(expectedErrorMessage), BAD_REQUEST, PresentationErrorCode.BadRequest)

  protected def testRequestWithInternalServerErrorResponse[T: Writeable](request: FakeRequest[T]): Assertion =
    testRequestWithErrorResponse(request, None, INTERNAL_SERVER_ERROR, PresentationErrorCode.InternalError)

  protected def testRequestWithErrorResponse[T: Writeable](
      request: FakeRequest[T],
      expectedErrorMessage: Option[String],
      statusCode: Int,
      presentationCode: PresentationErrorCode): Assertion = {
    val res = route(app, request).value
    status(res) mustBe statusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    val expectedResponse = expectedErrorMessage match {
      case Some(msg) => errorOutputResponse(presentationCode, msg)
      case None      => errorOutputResponse(presentationCode)
    }
    contentAs[Response[ErrorOutput]](res) mustBe expectedResponse
  }

  protected def testRequestWithStatusCodeAndEmptyResponse[T: Writeable](
      request: FakeRequest[T],
      statusCode: Int): Assertion = {
    val res = route(app, request).value
    status(res) shouldBe statusCode
    contentType(res) shouldBe None
  }

  protected def testRequestWithStatusCodeAndExpectedJsonContent[BodyType: Writeable, ResponseType: JsonReader](
      app: Application,
      request: Request[BodyType],
      statusCode: Int,
      expected: ResponseType): Assertion = {
    val res = route(app, request).value
    withStatusCodeAndJsonContentAs[ResponseType](res, statusCode) shouldBe expected
  }

  protected def jsonWithUpdatedStringField(json: JsObject, fieldName: String, fieldValue: String): JsObject =
    JsObject(json.value.concat(List(fieldName -> JsString(fieldValue))))
}
