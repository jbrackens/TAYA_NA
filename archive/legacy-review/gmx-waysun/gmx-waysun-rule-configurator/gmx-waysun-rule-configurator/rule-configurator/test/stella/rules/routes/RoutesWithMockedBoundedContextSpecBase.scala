package stella.rules.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalamock.scalatest.MockFactory
import org.scalatest.Inside
import org.scalatestplus.play.BaseOneAppPerTest
import org.scalatestplus.play.FakeApplicationFactory
import org.scalatestplus.play.PlaySpec
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks
import play.api.Application
import play.api.ApplicationLoader.Context
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.http.Writeable
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

import stella.rules.RuleConfiguratorComponents
import stella.rules.routes.ResponseFormats.errorOutputFormats._
import stella.rules.routes.SampleObjectFactory._
import stella.rules.routes.error.AdditionalPresentationErrorCode.EventConfigurationNotFound
import stella.rules.services.RuleConfiguratorBoundedContext
import stella.rules.services.RuleConfiguratorBoundedContextImpl

trait RoutesWithMockedBoundedContextSpecBase
    extends PlaySpec
    with BaseOneAppPerTest
    with FakeApplicationFactory
    with MockFactory
    with ScalaCheckDrivenPropertyChecks
    with Inside {

  protected val jwtAuth: JwtAuthorization[StellaAuthContext] = mock[JwtAuthorization[StellaAuthContext]]
  protected val boundedContext: RuleConfiguratorBoundedContext = mock[RuleConfiguratorBoundedContextImpl]

  override def fakeApplication(): Application = new TestRuleConfiguratorAppBuilder {
    override def createRuleConfiguratorComponents(context: Context): RuleConfiguratorComponents =
      new RuleConfiguratorComponents(context: Context) {
        override implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = jwtAuth

        override lazy val ruleConfiguratorBoundedContext: RuleConfiguratorBoundedContext = boundedContext
      }
  }.build()

  protected val token = BearerToken("some-jwt")
  protected val headersWithFakeJwt = defaultHeaders.add(HeaderNames.AUTHORIZATION -> s"Bearer ${token.rawValue}")

  protected def sendAndExpectInternalError[T: Writeable](request: FakeRequest[T]) =
    sendAndExpectErrorCode(request, INTERNAL_SERVER_ERROR, PresentationErrorCode.InternalError)

  protected def sendAndExpectForbidden[T: Writeable](request: FakeRequest[T]) =
    sendAndExpectErrorCode(request, FORBIDDEN, PresentationErrorCode.Forbidden)

  protected def sendAndExpectEventConfigNotFound[T: Writeable](request: FakeRequest[T]) =
    sendAndExpectErrorCode(request, NOT_FOUND, EventConfigurationNotFound)

  protected def sendAndExpectErrorCode[T: Writeable](
      request: FakeRequest[T],
      statusCode: Int,
      errorCode: PresentationErrorCode) = {
    val res = route(app, request).value
    status(res) mustBe statusCode
    contentType(res) mustBe Some(MimeTypes.JSON)
    contentAs[Response[ErrorOutput]](res) mustBe errorOutputResponse(errorCode)
  }

  protected def checkExpectedPermission(
      permission: Permission,
      authContext: StellaAuthContext = testAuthContext): Unit = {
    val _ = (jwtAuth
      .verify(_: BearerToken, _: Seq[Permission])(_: ExecutionContext))
      .expects(token, List(permission), *)
      .returning(EitherT[Future, JwtAuthorizationError, StellaAuthContext](Future.successful(Right(authContext))))
      .once()
  }

  def requireNonEmptyAndNonBlankValueWithLengthLimitErrorMessage(
      fieldName: String,
      fieldValue: String,
      maxLength: Int): String =
    s"Invalid value for: body (requirement failed: $fieldName must be non-empty, non-blank and not longer " +
    s"than $maxLength characters but '$fieldValue' has ${fieldValue.length} chars)"

  def wrongEventFieldNameErrorMessage(fieldName: String, fieldValue: String): String =
    s"Invalid value for: body (requirement failed: $fieldName '$fieldValue' must match pattern " +
    s"""^[a-zA-Z][a-zA-Z0-9_]*((\\.[a-zA-Z_])|[a-zA-Z0-9_])*$$ and be not longer """ +
    s"than ${TestConstants.maxEventFieldNameLength} characters)"
}
