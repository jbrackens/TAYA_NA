package stella.leaderboard.server.routes

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.scalamock.scalatest.MockFactory
import org.scalatest.Assertion
import org.scalatest.Inside
import org.scalatestplus.play.BaseOneAppPerTest
import org.scalatestplus.play.FakeApplicationFactory
import org.scalatestplus.play.PlaySpec
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks
import play.api.Application
import play.api.ApplicationLoader.Context
import play.api.cache.redis.CacheAsyncApi
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.http.Writeable
import play.api.mvc.Headers
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.core.AdjustableClock
import stella.common.core.Clock
import stella.common.http.BearerToken
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.JwtAuthorization
import stella.common.http.jwt.JwtAuthorization.JwtAuthorizationError
import stella.common.http.jwt.Permission
import stella.common.http.jwt.StellaAuthContext
import stella.common.play.test.TestCacheAsyncApi

import stella.leaderboard.server.LeaderboardComponents
import stella.leaderboard.server.config.CacheConfig
import stella.leaderboard.server.routes.ResponseFormats.errorOutputFormats._
import stella.leaderboard.server.routes.SampleObjectFactory._
import stella.leaderboard.services.LeaderboardBoundedContext
import stella.leaderboard.services.LeaderboardBoundedContextImpl

trait RoutesWithMockedBoundedContextSpecBase
    extends PlaySpec
    with BaseOneAppPerTest
    with FakeApplicationFactory
    with MockFactory
    with ScalaCheckDrivenPropertyChecks
    with Inside {

  protected val testClock: AdjustableClock = new AdjustableClock
  protected val jwtAuth: JwtAuthorization[StellaAuthContext] = mock[JwtAuthorization[StellaAuthContext]]
  protected val boundedContext: LeaderboardBoundedContext = mock[LeaderboardBoundedContextImpl]
  protected val testAuthContextToReturn: EitherT[Future, JwtAuthorizationError, StellaAuthContext] =
    EitherT[Future, JwtAuthorizationError, StellaAuthContext](Future.successful(Right(testAuthContext)))
  protected lazy val cacheConfigOverride: Option[CacheConfig] = None

  override def fakeApplication(): Application = new TestLeaderboardAppBuilder {
    override def createLeaderboardComponents(context: Context): LeaderboardComponents =
      new LeaderboardComponents(context: Context) {
        override implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = jwtAuth

        override implicit lazy val clock: Clock = testClock
        override lazy val cacheConfig: CacheConfig = cacheConfigOverride.getOrElse(config.cache)
        override lazy val cache: CacheAsyncApi = new TestCacheAsyncApi(testClock)
        override lazy val leaderboardBoundedContext: LeaderboardBoundedContext = boundedContext
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
