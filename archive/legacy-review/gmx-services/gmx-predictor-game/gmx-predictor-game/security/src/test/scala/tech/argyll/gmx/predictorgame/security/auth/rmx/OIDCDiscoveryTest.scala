package tech.argyll.gmx.predictorgame.security.auth.rmx

import com.softwaremill.sttp._
import com.softwaremill.sttp.testing.SttpBackendStub
import org.cache2k.integration.CacheLoaderException
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito._
import org.mockito.Mockito
import org.mockito.Mockito.times
import org.mockito.MockitoSugar.mock
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.{BeforeAndAfterEach, FunSuite}
import tech.argyll.gmx.predictorgame.security.auth.config._
import tech.argyll.gmx.predictorgame.security.test.shared.ResponseFactory

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration.{FiniteDuration, _}

@RunWith(classOf[JUnitRunner])
class OIDCDiscoveryTest extends FunSuite with BeforeAndAfterEach {

  private val rmxConfigMock = mock[RMXConfig]
  private val jwksConfig = mock[CacheConfig]
  private val oidcConfig = mock[CacheConfig]
  private val configurationResponseFactory = mock[ResponseFactory]
  private val jwksResponseFactory = mock[ResponseFactory]


  override protected def beforeEach() =
    initDefaults()


  test("'getTokenEndpoint()' should query configuration and extract endpoint") {
    // given
    setRmxUri("http://somehost:999/withcontext")
    val configurationUri = buildConfigUri()
    val expected = "https://host:890/api/endpoint"

    val sttpBackendMock: SttpBackendStub[Id, Nothing] = httpBackendWithMockResponse(configurationUri, "")

    given(configurationResponseFactory.produceResponse(any()))
      .willReturn(Response.ok(configurationResponse(expected, "")))

    val objectUnderTest = new OIDCDiscovery(rmxConfigMock, jwksConfig, oidcConfig)(sttpBackendMock, global)

    // when
    val actual = objectUnderTest.getTokenEndpoint

    // then
    actual should be(expected)
  }

  test("'getTokenEndpoint()' should cache result") {
    // given
    val configurationUri = buildConfigUri()

    val sttpBackendMock: SttpBackendStub[Id, Nothing] = httpBackendWithMockResponse(configurationUri, "")

    given(configurationResponseFactory.produceResponse(any()))
      .willReturn(Response.ok(configurationResponse("", "")))
      .willThrow(new IllegalStateException("Some failure"))

    val objectUnderTest = new OIDCDiscovery(rmxConfigMock, jwksConfig, oidcConfig)(sttpBackendMock, global)

    // when
    objectUnderTest.getTokenEndpoint
    Thread.sleep(200)

    // then
    objectUnderTest.getTokenEndpoint // should not throw
    `then`(configurationResponseFactory).should(times(1)).produceResponse(any())
  }

  test("'getTokenEndpoint()' should cache for configured duration") {
    // given
    setOIDCCache(150.millis, 10.millis)
    setJWKSCache(150.millis, 10.millis)
    val configurationUri = buildConfigUri()

    val sttpBackendMock: SttpBackendStub[Id, Nothing] = httpBackendWithMockResponse(configurationUri, "")

    given(configurationResponseFactory.produceResponse(any()))
      .willReturn(Response.ok(configurationResponse("", "")))
      .willThrow(new IllegalStateException("Some failure"))

    val objectUnderTest = new OIDCDiscovery(rmxConfigMock, jwksConfig, oidcConfig)(sttpBackendMock, global)

    // when
    objectUnderTest.getTokenEndpoint
    Thread.sleep(200)
    // then
    intercept[CacheLoaderException] {
      objectUnderTest.getTokenEndpoint
    }
    `then`(configurationResponseFactory).should(times(2)).produceResponse(any())
  }


  private def initDefaults(): Unit = {
    Mockito.reset(rmxConfigMock, jwksConfig, oidcConfig, configurationResponseFactory)

    setOIDCCache(1.hour, 1.hour)
    setJWKSCache(1.hour, 1.hour)
    setRmxUri("http://local:123")
  }

  private def httpBackendWithMockResponse(configurationUri: String, jwksUri: String) = {
    SttpBackendStub(HttpURLConnectionBackend())
      .whenRequestMatches(_.uri.toString() == configurationUri)
      .thenRespondWrapped(configurationResponseFactory.produceResponse _)
      .whenRequestMatches(_.uri.toString() == jwksUri)
      .thenRespondWrapped(jwksResponseFactory.produceResponse _)
  }

  private def setOIDCCache(expire: FiniteDuration, resilience: FiniteDuration): Unit = {
    given(oidcConfig.expire).willReturn(expire)
    given(oidcConfig.resilience).willReturn(resilience)
  }

  private def setJWKSCache(expire: FiniteDuration, resilience: FiniteDuration): Unit = {
    given(jwksConfig.expire).willReturn(expire)
    given(jwksConfig.resilience).willReturn(resilience)
  }

  private def setRmxUri(uri: String): Unit =
    given(rmxConfigMock.url).willReturn(uri)


  def buildConfigUri() =
    uri"${rmxConfigMock.url}/openid/.well-known/openid-configuration".toString()

  private def configurationResponse(tokenEndpoint: String, jwksEndpoint: String) =
    s"""{
       |  "userinfo_endpoint": "https://api.rewardsmatrix.com/openid/userinfo",
       |  "issuer": "https://api.rewardsmatrix.com/openid",
       |  "jwks_uri": "$jwksEndpoint",
       |  "authorization_endpoint": "https://api.rewardsmatrix.com/openid/authorize",
       |  "subject_types_supported": [
       |    "public"
       |  ],
       |  "token_endpoint_auth_methods_supported": [
       |    "client_secret_post",
       |    "client_secret_basic"
       |  ],
       |  "check_session_iframe": "https://api.rewardsmatrix.com/openid/check-session-iframe",
       |  "token_endpoint": "$tokenEndpoint",
       |  "response_types_supported": [
       |    "code",
       |    "id_token",
       |    "id_token token",
       |    "code token",
       |    "code id_token",
       |    "code id_token token"
       |  ],
       |  "end_session_endpoint": "https://api.rewardsmatrix.com/openid/end-session",
       |  "id_token_signing_alg_values_supported": [
       |    "HS256",
       |    "RS256"
       |  ]
        }""".stripMargin

  private def jwksResponse() =
    s"""{
       |  "keys": [
       |    {
       |      "kid": "fd68b7b32bd555fc9746a9e1d38db6b4",
       |      "e": "AQAB",
       |      "kty": "RSA",
       |      "alg": "RS256",
       |      "n": "qU9Hl_wXO_BOxFaWk4ZzJBIAfd-EwJTRbm3ruLN2qESEgiU3uuzkAWKIgwWgxvf6s96Qc4YTOjXaSprxWvlDvg3TtKNTdLlRClSRSZg1Q0wUQY7C9Z-coOo4CEYoEl8wlFVN7DCXezpRg9-rQq2847TIOKeSvGwnkdE3_iHx7lk",
       |      "use": "sig"
       |    }
       |  ]
        }""".stripMargin

}
