package stella.common.http.jwt

import scala.concurrent.Future
import scala.concurrent.duration.DurationInt

import org.scalamock.scalatest.AsyncMockFactory
import org.scalatest.Inside
import org.scalatest.matchers.should
import org.scalatest.wordspec.AsyncWordSpec

import stella.common.http.BearerToken
import stella.common.http.jwt.JwtAuthorization.InvalidAuthTokenError
import stella.common.http.jwt.config.JwtConfig

class JwksBasedJwtAuthorizationAsyncSpec extends AsyncWordSpec with should.Matchers with AsyncMockFactory with Inside {

  val token = BearerToken(
    "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJPMURkSGE3RnpXNEZocHRaQ3FJVTRUNlF0b2JxM1dDYTU4YlBJcFJsSmJVIn0.eyJleHAiOjE2NTE1NzQxMDQsImlhdCI6MTY1MTU3MzgwNCwiYXV0aF90aW1lIjowLCJqdGkiOiJjMWY1Yzc4NC01NjM3LTQzZWYtODc5OC02ZjUxMWNhMTI5ZWYiLCJpc3MiOiJodHRwOi8vd2F5c3VuLmxvY2FsOjgwMDAvYXV0aC9yZWFsbXMvMDAwMDAwMDEyMzQiLCJhdWQiOiJmb3ItcGV0ciIsInN1YiI6ImZkNjc3NjNhLWQxM2YtNGUyNS05MjllLTU2MDE1ZTBkZmU1YiIsInR5cCI6IklEIiwiYXpwIjoiZm9yLXBldHIiLCJzZXNzaW9uX3N0YXRlIjoiM2ZmNmIzNWMtMGIyZC00ZjJiLWI5Y2EtMDcxYzEwMDY1YmM0IiwiYXRfaGFzaCI6IlJ5U09WTnMyaE9pcUtGSHhhN1pRd0EiLCJhY3IiOiIxIiwic2lkIjoiM2ZmNmIzNWMtMGIyZC00ZjJiLWI5Y2EtMDcxYzEwMDY1YmM0IiwiZW1haWxfdmVyaWZpZWQiOmZhbHNlLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJ0ZXN0X3VzZXIifQ.bkcIlJVFIwM83RVIlT63_2O-rHU13HAEyQO3LqzYqad0CaD2Jf0D429uoKW8B8KWUfjFJI_eY314ImMYIZ-hQx9QMwbpWpfwgdYD3-To87LE0NDe1_cvdZK4udZT6_x8_gkvgBJORE_oR32MpzV52pso08b4dNag00jKqQiIuR0j2xfsjtX6-mB_8RLClPRGjRji1f2FVk3kUUNvqSZMRbsTjRDxLBuCSLq0nLo9vj8GPLwnWjnUkEDnSm2tRjcKPmIeXWrrZTzSAVwYf3-LI5ZSUJHXcF4eEOIDVmODJ5anOOawGr1Na3ulnv26MhvltVdMK5C2FjhDIp0Cu_IAkQ")

  private val notExpiringCacheConfig: JwtConfig = JwtConfig(
    requireJwtAuth = true,
    serviceDiscoveryEndpointUri = "http://waysun.local:8000/auth/realms", // prefix used in token's iss field
    internalServiceDiscoveryEndpointUri = "http://identity-provider.microservices.svc:8000/auth/realms",
    issuerCacheRefreshFrequency = 100.hours, // cache is supposed to not expire during the tests execution
    jwksCacheRefreshFrequency = 100.hours)

  "verify" should {
    "fail when JWKS lookup fails" in {
      val provider = mock[OidcPropertiesProvider]
      val keyId = "O1DdHa7FzW4FhptZCqIU4T6Qtobq3WCa58bPIpRlJbU"
      val realm = "00000001234"
      val exception = new Exception("Fail!")
      val testKeyUse = "sig"
      val testAlgorithm = "RS256"
      (provider
        .getJsonWebKey(_: String, _: String, _: String, _: String))
        .expects(realm, keyId, testKeyUse, testAlgorithm)
        .returning(Future.failed(exception))
        .once()
      val extractor = mock[AuthContextExtractor[StellaAuthContext]]
      new JwksBasedJwtAuthorization(notExpiringCacheConfig, provider, extractor)
        .verify(token, requiredPermissions = Nil)
        .value
        .map { error =>
          inside(error) { case Left(JwtAuthorization.JwksLookupError(msg, Some(cause))) =>
            msg shouldBe "JWK lookup failed"
            cause shouldBe exception
          }
        }
    }

    "fail when the host in the iss field doesn't match public service discovery host" in {
      val provider = mock[OidcPropertiesProvider]
      val configWithNonMatchingIssPrefix =
        notExpiringCacheConfig.copy(serviceDiscoveryEndpointUri = "http://some_other_host/auth/realms")
      (provider.getJsonWebKey(_: String, _: String, _: String, _: String)).expects(*, *, *, *).never()
      val extractor = mock[AuthContextExtractor[StellaAuthContext]]
      new JwksBasedJwtAuthorization(configWithNonMatchingIssPrefix, provider, extractor)
        .verify(token, requiredPermissions = Nil)
        .value
        .map { error =>
          inside(error) { case Left(InvalidAuthTokenError(msg, None)) =>
            msg shouldBe "iss does not have the same prefix as serviceDiscoveryEndpointUri"
          }
        }
    }
  }
}
