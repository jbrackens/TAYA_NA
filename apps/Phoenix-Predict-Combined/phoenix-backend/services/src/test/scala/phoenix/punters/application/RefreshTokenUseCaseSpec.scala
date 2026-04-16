package phoenix.punters.application

import scala.concurrent.Future

import cats.data.EitherT
import org.scalatest.concurrent.Eventually
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.boundedcontexts.punter.MemorizedTestPuntersContext
import phoenix.core.EitherTUtils._
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.Errors
import phoenix.punters.domain.RefreshToken
import phoenix.punters.domain.UserTokenResponse
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

class RefreshTokenUseCaseSpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with Eventually {

  implicit val clock = new FakeHardcodedClock()

  val userId = ConstantUUIDGenerator.generate().toString

  val authenticationRepository: AuthenticationRepository = new TestAuthenticationRepository() {
    override def refreshToken(
        token: RefreshToken): EitherT[Future, Errors.InvalidRefreshToken.type, UserTokenResponse] =
      EitherT.safeRightT(
        UserTokenResponse(
          userId = userId,
          token = "test_user_token",
          expiresIn = 100L,
          refreshExpiresIn = 1000L,
          refreshToken = RefreshToken("test_refresh_token"),
          tokenType = "test_token_type",
          idToken = None))
  }

  val punters = new MemorizedTestPuntersContext()

  val refreshTokenUseCase = new RefreshTokenUseCase(authenticationRepository, punters)

  "Refresh token use case " should {
    "trigger a session keepalive" in {
      // given
      val refreshToken = RefreshToken("token")

      // when
      awaitRight(refreshTokenUseCase.refreshToken(refreshToken))

      // then
      punters.keepalivedSessions.get().head._1 should ===(PunterId(userId))
    }
  }

}
