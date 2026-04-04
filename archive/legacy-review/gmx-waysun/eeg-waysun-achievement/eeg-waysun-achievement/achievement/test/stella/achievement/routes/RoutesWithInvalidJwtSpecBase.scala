package stella.achievement.routes

import org.scalamock.scalatest.MockFactory
import org.scalatest.Assertion
import org.scalatestplus.play.BaseOneAppPerSuite
import org.scalatestplus.play.FakeApplicationFactory
import org.scalatestplus.play.PlaySpec
import play.api.Application
import play.api.ApplicationLoader.Context
import play.api.cache.redis.CacheAsyncApi
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.http.Status.UNAUTHORIZED
import play.api.http.Writeable
import play.api.mvc.Headers
import play.api.test.FakeRequest
import play.api.test.Helpers.contentType
import play.api.test.Helpers.defaultAwaitTimeout
import play.api.test.Helpers.route
import play.api.test.Helpers.status

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode

import stella.achievement.AchievementComponents
import stella.achievement.SampleObjectFactory
import stella.achievement.SampleObjectFactory.contentAs
import stella.achievement.SampleObjectFactory.errorOutputResponse
import stella.achievement.routes.ResponseFormats.errorOutputFormats._

trait RoutesWithInvalidJwtSpecBase
    extends PlaySpec
    with BaseOneAppPerSuite
    with FakeApplicationFactory
    with MockFactory {

  override def fakeApplication(): Application = new TestAchievementAppBuilder {
    override def createAchievementComponents(context: Context): AchievementComponents =
      new AchievementComponents(context: Context) {
        override lazy val cache: CacheAsyncApi = mock[CacheAsyncApi]
      }
  }.build()

  protected val headersWithInvalidJwt: Headers =
    SampleObjectFactory.defaultHeaders.add(HeaderNames.AUTHORIZATION -> "Bearer invalid-jwt")

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
