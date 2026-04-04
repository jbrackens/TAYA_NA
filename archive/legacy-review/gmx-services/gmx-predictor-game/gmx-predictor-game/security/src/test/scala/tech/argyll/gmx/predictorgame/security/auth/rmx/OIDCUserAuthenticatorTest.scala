package tech.argyll.gmx.predictorgame.security.auth.rmx

import java.time._

import com.softwaremill.sttp._
import com.softwaremill.sttp.testing.SttpBackendStub
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito._
import org.mockito.Mockito
import org.mockito.MockitoSugar.mock
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.{BeforeAndAfterEach, FunSuite}
import tech.argyll.gmx.predictorgame.security.auth.config._
import tech.argyll.gmx.predictorgame.security.auth.jwt._
import tech.argyll.gmx.predictorgame.security.test.shared.ResponseFactory

import scala.concurrent.ExecutionContext.Implicits._
import scala.concurrent.duration.{FiniteDuration, _}

@RunWith(classOf[JUnitRunner])
class OIDCUserAuthenticatorTest extends FunSuite with BeforeAndAfterEach {

  private val rmxConfigMock = mock[RMXConfig]
  private val tokenConfig = mock[TokenExpiryConfig]
  private val oidcDiscoveryMock = mock[OIDCDiscovery]
  private val tokenResponseFactory = mock[ResponseFactory]

  override protected def beforeEach() =
    initDefaults()

  test("'authenticateUser()' should authenticate and extract token") {
    // given
    setExpiryOffset(45.seconds)

    val sttpBackendMock: SttpBackendStub[Id, Nothing] =
      httpBackendWithMockResponse()

    given(tokenResponseFactory.produceResponse(any()))
      .willReturn(Response.ok(tokenResponse()))

    val objectUnderTest = new OIDCUserAuthenticator(rmxConfigMock,
      tokenConfig,
      oidcDiscoveryMock)(sttpBackendMock, global)

    // when
    val actual = objectUnderTest.authenticateUser("someUser", "hisPassword")

    // then
    val expectedExpireTime =
      ZonedDateTime.of(LocalDateTime.of(2018, Month.SEPTEMBER, 28, 12, 7, 14),
        ZoneId.of("UTC"))

    actual.token should be(givenToken)
    actual.expiresAt should be(expectedExpireTime.toEpochSecond)
    actual.getCacheExpiryTime should be(
      (expectedExpireTime.toEpochSecond - 45) * 1000)
  }

  test("'authenticateUser()' should filter matching key id") {
    setKeySet(Seq(signingKey.copy(kid = "differentId")))
    val sttpBackendMock: SttpBackendStub[Id, Nothing] =
      httpBackendWithMockResponse()

    given(tokenResponseFactory.produceResponse(any()))
      .willReturn(Response.ok(tokenResponse()))

    val objectUnderTest = new OIDCUserAuthenticator(rmxConfigMock,
      tokenConfig,
      oidcDiscoveryMock)(sttpBackendMock, global)

    // when
    intercept[NoSuchElementException] {
      objectUnderTest.authenticateUser("someUser", "hisPassword")
    }

    // then
  }

  test("'authenticateUser()' should filter matching key algorithm") {
    setKeySet(Seq(signingKey.copy(kty = "notSupported")))
    val sttpBackendMock: SttpBackendStub[Id, Nothing] =
      httpBackendWithMockResponse()

    given(tokenResponseFactory.produceResponse(any()))
      .willReturn(Response.ok(tokenResponse()))

    val objectUnderTest = new OIDCUserAuthenticator(rmxConfigMock,
      tokenConfig,
      oidcDiscoveryMock)(sttpBackendMock, global)

    // when
    intercept[UnsupportedOperationException] {
      objectUnderTest.authenticateUser("someUser", "hisPassword")
    }
  }

  private def initDefaults(): Unit = {
    Mockito.reset(rmxConfigMock,
      tokenConfig,
      oidcDiscoveryMock,
      tokenResponseFactory)

    setTokenUri("http://somehost:90")
    setKeySet(Seq(signingKey))
    setAcceptedTokenExpiry((365 * 100).days)
    setExpiryOffset(0.seconds)
  }

  private def httpBackendWithMockResponse() = {
    SttpBackendStub(HttpURLConnectionBackend()).whenAnyRequest
      .thenRespondWrapped(tokenResponseFactory.produceResponse _)
  }

  private def setTokenUri(tokenUri: String): Unit =
    given(oidcDiscoveryMock.getTokenEndpoint).willReturn(tokenUri)

  private def setKeySet(keySet: Seq[JSONWebKey]): Unit =
    given(oidcDiscoveryMock.getKeySet).willReturn(keySet)

  private def setAcceptedTokenExpiry(config: FiniteDuration): Unit =
    given(tokenConfig.clockSkew).willReturn(config)

  private def setExpiryOffset(config: FiniteDuration): Unit =
    given(tokenConfig.offset).willReturn(config)

  private val givenToken =
    "eyJhbGciOiJSUzI1NiIsImtpZCI6ImZkNjhiN2IzMmJkNTU1ZmM5NzQ2YTllMWQzOGRiNmI0In0.eyJzdWIiOiJybXhfMWJmMDEyZWRiZDkyNDI0Yjg3ZTE0M2E0YmE5MWFiZjkiLCJub25jZSI6InNlbGYuY29kZS5ub25jZSIsImV4dHJhIjoiNGlUS2NJa0YtdHE3cVdSZ2NvTHVpRzFacW9KdFVCYk9KZ2NnTy1TdTV5RC1QcEVGa0ZHYUZoRUJqTl82WDVNTHNmdzM5eU0wcXNfU0lIVmcyZHM0RUNzXzNVS3E3NGRfRFlwZ29QRkNaalhWdzFmQ0xUUHZiZFQxbUVuMHI4VG9KYWR0QmxPMWphRzVXVXJ5LUFrQmtBRkdYOHpZZklhdWYwelVuclFJRjBIUGF1cXEyY0dQeTdvNllicWR4dGhDS2pmU3FTWEJMVThMSWpkbXZoVVZYZVZJdGI4dHF0aUIyUnZVRjgzTGZxUTJNSk16cm9TdHNxa0NsTU5SYmM0OEo4bnlrNl9yZGpDNXZDdmJfMk5UdFZLYURCanBUTEJMLTdweXhXWTE5emhyazBFcVIzenNIWEE2YzdVIiwiZXhwIjoxNTM4MTM2NDM0LCJsaW0iOnRydWUsImF0X2hhc2giOiJwQnktZkVteURmZWhJNWZEaWxocEdnIiwiaWF0IjoxNTM4MTMyODM0LCJhdXRoX3RpbWUiOjE1MzQ4Njc4MzksImF1ZCI6IjgzNzI2NiIsImlzcyI6Imh0dHBzOi8vYXBpLnJld2FyZHNtYXRyaXguY29tL29wZW5pZCJ9.QPV3IMOV0_mOMT8weSvNF5X2RfMDjdS477S_gVdZ4S7aRY_36cyNs9kLWjhG2cYWn5hLlaPsY5BC29HhjwwHIQdzoBAnwdG8frK_ktDnw5s9VMXDAAhpkt9FuOm5a7l37VZPnLRboUzTea1WqRw3fKNhtx2BgpxLJXeDwZTp7UU"

  private def tokenResponse() =
    s"""{
       |  "token_type": "bearer",
       |  "access_token": "bc565eee05fc4630b5246ab997b88540",
       |  "refresh_token": "adf1da1831a7414aaef09cb9a53f4b73",
       |  "expires_in": 3600,
       |  "id_token": "$givenToken"
        }""".stripMargin

  private def signingKey: JSONWebKey =
    JSONWebKey(
      "fd68b7b32bd555fc9746a9e1d38db6b4",
      "RSA",
      "RS256",
      "sig",
      "qU9Hl_wXO_BOxFaWk4ZzJBIAfd-EwJTRbm3ruLN2qESEgiU3uuzkAWKIgwWgxvf6s96Qc4YTOjXaSprxWvlDvg3TtKNTdLlRClSRSZg1Q0wUQY7C9Z-coOo4CEYoEl8wlFVN7DCXezpRg9-rQq2847TIOKeSvGwnkdE3_iHx7lk",
      "AQAB"
    )
}
