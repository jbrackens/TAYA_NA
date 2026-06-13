package phoenix.jwt

import scala.concurrent.ExecutionContext.Implicits.global

import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.http.BearerToken
import phoenix.jwt.JwtAuthenticator.InvalidAuthTokenError
import phoenix.keycloak.KeycloakTokenVerifier
import phoenix.support.FutureSupport
import phoenix.testcontainers.Keycloak

class KeycloakTokenVerifierSpec extends AnyWordSpecLike with Matchers with FutureSupport {

  val defaultUserId = "SoftAlan"
  val realm = Keycloak.instance.initNewRealm()

  "KeycloakTokenVerifier" must {

    "pass authentication if JWT authentication was disabled" in {
      val verifier =
        KeycloakTokenVerifier.build(JwtConfig(requireJwtAuthentication = false, defaultUserId), realm.config)
      val verification = awaitRight(verifier.verifyWithIntrospection(BearerToken("invalid_token")))

      verification.userId.value shouldBe defaultUserId
    }

    "reject authentication if JWT authentication is enabled and the provided token is invalid" in {
      val verifier =
        KeycloakTokenVerifier.build(JwtConfig(requireJwtAuthentication = true, defaultUserId), realm.config)
      val error = awaitLeft(verifier.verifyWithIntrospection(BearerToken("invalid_token")))

      error should matchPattern {
        case InvalidAuthTokenError(_) =>
      }
    }
  }
}
