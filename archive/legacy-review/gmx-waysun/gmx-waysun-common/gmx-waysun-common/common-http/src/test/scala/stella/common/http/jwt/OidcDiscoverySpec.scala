package stella.common.http.jwt

import scala.collection.immutable.Seq
import scala.concurrent.Future
import scala.concurrent.duration._

import org.scalamock.scalatest.AsyncMockFactory
import org.scalatest.Assertion
import org.scalatest.OptionValues
import org.scalatest.matchers.should
import org.scalatest.wordspec.AsyncWordSpec
import spray.json.JsBoolean
import spray.json.JsObject
import spray.json.JsString
import sttp.client3.DeserializationException
import sttp.client3.Identity
import sttp.client3.Request
import sttp.client3.Response
import sttp.client3.ResponseException
import sttp.client3.SttpBackend
import sttp.client3.UriContext
import sttp.model.Method
import sttp.model.RequestMetadata
import sttp.model.StatusCode

import stella.common.http.jwt.OidcDiscoverySpec._
import stella.common.http.jwt.config.JwtConfig

class OidcDiscoverySpec extends AsyncWordSpec with should.Matchers with AsyncMockFactory with OptionValues {

  "getIssuer" should {
    "fail when GET request to service discovery endpoint didn't return OK status code" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, serviceDiscoveryResponseWithWrongStatusCode)
      val cache = createCache(sender)
      getIssuerWithException(cache) { exception =>
        exception.getMessage shouldBe failedServiceDiscoveryRequestErrorMessage
      }
    }

    "fail when GET request to service discovery endpoint returned error" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, serviceDiscoveryResponseWithDeserializationException)
      val cache = createCache(sender)
      getIssuerWithException(cache) { exception =>
        val expectedMessage =
          s"Fetching config from service discovery endpoint ${notExpiringCacheConfig.internalServiceDiscoveryEndpointUri}/$testRealm/.well-known/openid-configuration failed"
        exception.getMessage shouldBe expectedMessage
        exception.getCause shouldBe testDeserializationException
      }
    }

    s"fail when config from service discovery endpoint doesn't contain $issuerFieldName" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, createServiceDiscoveryResponse(oidcConfigWithoutRequiredFields))
      val cache = createCache(sender)
      getIssuerWithException(cache) { exception =>
        val expectedMessage =
          s"Error when processing fetched config. $issuerFieldName not found in $oidcConfigWithoutRequiredFields"
        exception.getMessage shouldBe expectedMessage
      }
    }

    s"fail when config from service discovery endpoint contains $issuerFieldName of wrong type" in {
      val sender = mock[SttpRequestSender]
      val incorrectOidcConfig = JsObject(Map(issuerFieldName -> JsBoolean(false)))
      expectOneCallToServiceDiscoveryEndpoint(sender, createServiceDiscoveryResponse(incorrectOidcConfig))
      val cache = createCache(sender)
      getIssuerWithException(cache) { exception =>
        val expectedMessage =
          s"Error when processing fetched config. $issuerFieldName in $incorrectOidcConfig is not String"
        exception.getMessage shouldBe expectedMessage
      }
    }

    "return cached issuer asynchronously" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, successfulServiceDiscoveryResponse)
      val cache = createCache(sender)
      cache.getIssuer(testRealm).zipWith(cache.getIssuer(testRealm)) { (issuer1, issuer2) =>
        issuer1 shouldBe issuerValue
        issuer2 shouldBe issuerValue
      }
    }

    "refresh cache when it expired" in {
      val sender = mock[SttpRequestSender]
      // external call for the first cache lookup
      expectOneCallToServiceDiscoveryEndpoint(sender, successfulServiceDiscoveryResponse)
      // external call for the second cache lookup
      val newIssuerValue = s"new-$issuerValue"
      val secondServiceDiscoveryResponse =
        createServiceDiscoveryResponse(JsObject(Map(issuerFieldName -> JsString(newIssuerValue))))
      expectOneCallToServiceDiscoveryEndpoint(sender, secondServiceDiscoveryResponse)

      val expiringCacheConfig = notExpiringCacheConfig.copy(issuerCacheRefreshFrequency = 0.nanoseconds)
      val cache = createCache(sender, expiringCacheConfig)
      for {
        issuer1 <- cache.getIssuer(testRealm)
        _ = waitFiveMilliseconds()
        issuer2 <- cache.getIssuer(testRealm)
      } yield {
        issuer1 shouldBe issuerValue
        issuer2 shouldBe newIssuerValue
      }
    }
  }

  "getJsonWebKey" should {
    "fail when GET request to service discovery endpoint didn't return OK status code" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, serviceDiscoveryResponseWithWrongStatusCode)
      val cache = createCache(sender)
      getJsonWebKeyWithException(cache) { exception =>
        exception.getMessage shouldBe failedServiceDiscoveryRequestErrorMessage
      }
    }

    "fail when GET request to service discovery returned error" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, serviceDiscoveryResponseWithDeserializationException)
      val cache = createCache(sender)
      getJsonWebKeyWithException(cache) { exception =>
        val expectedMessage =
          s"Fetching config from service discovery endpoint ${notExpiringCacheConfig.internalServiceDiscoveryEndpointUri}/$testRealm/.well-known/openid-configuration failed"
        exception.getMessage shouldBe expectedMessage
        exception.getCause shouldBe testDeserializationException
      }
    }

    s"fail when config from service discovery endpoint doesn't contain $jwksUriFieldName" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, createServiceDiscoveryResponse(oidcConfigWithoutRequiredFields))
      val cache = createCache(sender)
      getJsonWebKeyWithException(cache) { exception =>
        val expectedMessage =
          s"Error when processing fetched config. $jwksUriFieldName not found in $oidcConfigWithoutRequiredFields"
        exception.getMessage shouldBe expectedMessage
      }
    }

    s"fail when config from service discovery endpoint contains $jwksUriFieldName of wrong type" in {
      val sender = mock[SttpRequestSender]
      val incorrectOidcConfig = JsObject(Map(jwksUriFieldName -> JsBoolean(false)))
      expectOneCallToServiceDiscoveryEndpoint(sender, createServiceDiscoveryResponse(incorrectOidcConfig))
      val cache = createCache(sender)
      getJsonWebKeyWithException(cache) { exception =>
        val expectedMessage =
          s"Error when processing fetched config. $jwksUriFieldName in $incorrectOidcConfig is not String"
        exception.getMessage shouldBe expectedMessage
      }
    }

    "fail when GET request to JWKS didn't return OK status code" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, successfulServiceDiscoveryResponse)
      val responseWithWrongStatusCode = createJwksResponse(Left(jwksResponseErrorMessage), code = StatusCode.Forbidden)
      expectOneCallToJwks(sender, responseWithWrongStatusCode)
      val cache = createCache(sender)
      getJsonWebKeyWithException(cache) { exception =>
        val expectedMessage = s"Couldn't get data from $jwksUriValue. Response status code: ${StatusCode.Forbidden}"
        exception.getMessage shouldBe expectedMessage
      }
    }

    "fail when GET request to JWKS returned error message" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, successfulServiceDiscoveryResponse)
      val responseWithError = createJwksResponse(Left(jwksResponseErrorMessage))
      expectOneCallToJwks(sender, responseWithError)
      val cache = createCache(sender)
      getJsonWebKeyWithException(cache) { exception =>
        exception.getMessage shouldBe s"JWKS call to $jwksUriValue failed with: $jwksResponseErrorMessage"
      }
    }

    "fail when GET request to JWKS returned incorrect JWKS not being JSON" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, successfulServiceDiscoveryResponse)
      val notJson = "foo"
      val responseWithIncorrectPayload = createJwksResponse(Right(notJson))
      expectOneCallToJwks(sender, responseWithIncorrectPayload)
      val cache = createCache(sender)
      getJsonWebKeyWithException(cache) { exception =>
        exception.getMessage shouldBe s"Couldn't load JWKS from received response $notJson"
        exception.getCause.getMessage should endWith("Unexpected character (f) at position 0.")
      }
    }

    "fail when GET request to JWKS returned unexpected JWKS JSON" in {
      val sender = mock[SttpRequestSender]
      expectOneCallToServiceDiscoveryEndpoint(sender, successfulServiceDiscoveryResponse)
      val unexpectedJwkJson = """{ "foo": "bar" }"""
      val responseWithIncorrectPayload = createJwksResponse(Right(unexpectedJwkJson))
      expectOneCallToJwks(sender, responseWithIncorrectPayload)
      val cache = createCache(sender)
      getJsonWebKeyWithException(cache) { exception =>
        exception.getMessage shouldBe s"Couldn't load JWKS from received response $unexpectedJwkJson"
        exception.getCause.getMessage shouldBe "The JSON JWKS content does not include the keys member."
      }
    }

    "return cached JWK asynchronously" in {
      val sender = mock[SttpRequestSender]
      val secondRealm = "second-realm"
      expectOneCallToServiceDiscoveryEndpoint(sender, successfulServiceDiscoveryResponse)
      expectOneCallToJwks(sender, createJwksResponse(Right(correctJwksJson)))
      expectOneCallToServiceDiscoveryEndpoint(
        sender,
        createServiceDiscoveryResponse(Right(correctOidcConfig), realm = secondRealm))
      expectOneCallToJwks(sender, createJwksResponse(Right(correctJwksJson)))
      val cache = createCache(sender)
      val existingKeyCall = cache.getJsonWebKey(testRealm, testKeyId, testKeyUse, testAlgorithm)
      val nonExistingKeyIdCall = cache.getJsonWebKey(testRealm, "non-existing-key-id", testKeyUse, testAlgorithm)
      val nonExistingKeyUseCall = cache.getJsonWebKey(testRealm, testKeyId, "non-existing-key-use-type", testAlgorithm)
      val nonExistingAlgCall = cache.getJsonWebKey(testRealm, testKeyId, testKeyUse, "non-existing-algorithm")
      val existingKeyCall2 = cache.getJsonWebKey(testRealm, testKeyId, testKeyUse, testAlgorithm)
      val secondRealmCall = cache.getJsonWebKey(secondRealm, testKeyId, testKeyUse, testAlgorithm)
      for {
        existingKey1 <- existingKeyCall
        keyForNonExistingKid <- nonExistingKeyIdCall
        keyForNonExistingKeyUse <- nonExistingKeyUseCall
        keyForNonExistingAlg <- nonExistingAlgCall
        existingKey2 <- existingKeyCall2
        keyForSecondRealm <- secondRealmCall
      } yield {
        existingKey1.value.getKeyId shouldBe testKeyId
        existingKey1.value.getAlgorithm shouldBe testAlgorithm
        keyForNonExistingKid shouldBe None
        keyForNonExistingKeyUse shouldBe None
        keyForNonExistingAlg shouldBe None
        existingKey2 shouldBe existingKey1
        keyForSecondRealm.value.getKeyId shouldBe testKeyId
        keyForSecondRealm.value.getAlgorithm shouldBe testAlgorithm
      }
    }

    "refresh cache when it expired" in {
      val sender = mock[SttpRequestSender]
      // external calls for the first cache lookup
      expectOneCallToServiceDiscoveryEndpoint(sender, successfulServiceDiscoveryResponse)
      expectOneCallToJwks(sender, createJwksResponse(Right(correctJwksJson)))
      // external calls for the second cache lookup
      expectOneCallToServiceDiscoveryEndpoint(sender, successfulServiceDiscoveryResponse)
      expectOneCallToJwks(sender, createJwksResponse(Right(otherCorrectJwksJson)))

      val expiringCacheConfig = notExpiringCacheConfig.copy(jwksCacheRefreshFrequency = 0.nanoseconds)
      val cache = createCache(sender, expiringCacheConfig)
      for {
        key1 <- cache.getJsonWebKey(testRealm, testKeyId, testKeyUse, testAlgorithm)
        _ = waitFiveMilliseconds()
        key2 <- cache.getJsonWebKey(testRealm, otherTestKeyId, testKeyUse, testAlgorithm)
      } yield {
        key1.value.getKeyId shouldBe testKeyId
        key1.value.getAlgorithm shouldBe testAlgorithm
        key2.value.getKeyId shouldBe otherTestKeyId
        key2.value.getAlgorithm shouldBe testAlgorithm
      }
    }
  }

  private def expectOneCallToServiceDiscoveryEndpoint(
      sender: SttpRequestSender,
      response: Response[ServiceDiscoveryResponseBody]): Unit = {
    val _ =
      (sender.send(_: ServiceDiscoveryRequest, _: SttpBackend[Identity, Any])).expects(*, *).returning(response).once()
  }

  private def expectOneCallToJwks(sender: SttpRequestSender, response: Response[JwksResponseBody]): Unit = {
    val _ = (sender.send(_: JwksRequest, _: SttpBackend[Identity, Any])).expects(*, *).returning(response).once()
  }

  private def createCache(requestSender: SttpRequestSender, config: JwtConfig = notExpiringCacheConfig) =
    new OidcDiscovery(config, requestSender)

  private def getIssuerWithException(cache: OidcDiscovery)(
      checkException: OidcPropertyLookupError => Assertion): Future[Assertion] =
    recoverToExceptionIf[OidcPropertyLookupError](cache.getIssuer(testRealm)).map(checkException)

  private def getJsonWebKeyWithException(cache: OidcDiscovery)(
      checkException: OidcPropertyLookupError => Assertion): Future[Assertion] =
    recoverToExceptionIf[OidcPropertyLookupError](cache.getJsonWebKey(testRealm, testKeyId, testKeyUse, testAlgorithm))
      .map(checkException)

  // somehow we need to ensure time has changed and we can't pass our own Clock to the library
  private def waitFiveMilliseconds(): Unit = Thread.sleep(5)
}

object OidcDiscoverySpec {

  type ServiceDiscoveryResponseBody = Either[ResponseException[String, Exception], JsObject]
  type ServiceDiscoveryRequest = Request[ServiceDiscoveryResponseBody, Any]
  type JwksResponseBody = Either[String, String]
  type JwksRequest = Request[JwksResponseBody, Any]

  private val notExpiringCacheConfig: JwtConfig = JwtConfig(
    requireJwtAuth = true,
    serviceDiscoveryEndpointUri = "http://localhost:8080/public_service_discovery_uri",
    internalServiceDiscoveryEndpointUri = "http://localhost:8080/auth/realms",
    issuerCacheRefreshFrequency = 100.hours, // cache is supposed to not expire during the tests execution
    jwksCacheRefreshFrequency = 100.hours)

  private val testRealm = "master"
  private val testKeyId = "43ca550e6495507170783bc40ba68b33"
  private val otherTestKeyId = "mpZHk-TcVAGBuMNePrFEEbB7jCb1dAAKYEsyyFA4Cfk"
  private val testKeyUse = "sig"
  private val testAlgorithm = "RS256"

  private val issuerFieldName = "issuer"
  private val jwksUriFieldName = "jwks_uri"
  private val issuerValue = "test-issuer"
  private val jwksUriValue = "test-jwks-uri"

  private val correctOidcConfig = JsObject(
    Map(issuerFieldName -> JsString(issuerValue), jwksUriFieldName -> JsString(jwksUriValue)))
  private val oidcConfigWithoutRequiredFields = JsObject(Map("foo" -> JsString("bar")))

  private val correctJwksJson =
    """{
    |  "keys": [
    |    {
    |      "kty": "RSA",
    |      "alg": "RS256",
    |      "use": "sig",
    |      "kid": "43ca550e6495507170783bc40ba68b33",
    |      "n": "YUmMMqbP0zEDvZwn31-24TKOl77KifZIO4iZKmi43V5fuheq3k7TSg86xEPkMCyFawdS4IYJtV8lehCrn_hBDYaGtlWatK6Ik19XnYrWp0lHi5x4e-QqZdYa9kDEvmvVd6DF3Id3ioKFVn2Wb_i52rf7VuSYT_ACkMrLe2Q_PoVyrUMGiFdWPwMe54bUXNxyXhqzt1EPnkHsB17rvNzM314JDApXv2ZS373Yall2qAgH12c34-G9VR0AiC0iLLqSK9Vi64_eLykEMbLVYKbNHdQwdHASZ4pc-SSSspxf2QEE4-918Ob2C7f2K0afGPAzNV3nMZXQx3CHoEuKLWHD0RBD4bVRmFKYDsRUluRhgYHC8ERTOvS--8eqlyl26kfYO4KpGCFcBUXmUyYsHgm1_Z729fEg0KNrIATG6iPl0Yb6HeQsPzhMBO0z2bt_OK780pLS0jVC7dYFnXtNbO2-v2StcbApdTlkz4zXW7xw8CRrEFG31krzYtPsSXJzGlVn8u3BtA0E1mcx9Wj6g4TDhs5BR8TlMTxcEi93qw-FaNu3IQLGLR800rZMPu-IbpiFk5P9pW6zjHTKe85PM2AzaqhmhTS9nllpeux5MHHqI_d5Q8PtBQPWuEeEqWXWfEnWAzbUCHw8HDVG1S3yLCxLB51YKBiNZt5_95D_inbnHYE",
    |      "e": "AQAB"
    |    }
    |  ]
    |}
    |""".stripMargin

  private val otherCorrectJwksJson =
    """{
    |  "keys": [
    |    {
    |      "kid": "mpZHk-TcVAGBuMNePrFEEbB7jCb1dAAKYEsyyFA4Cfk",
    |      "kty": "RSA",
    |      "alg": "RS256",
    |      "use": "sig",
    |      "n": "pygHqUv5V5A0ZlOupG2HkG82BRS8RXAtiaK3pZv_1hrTSSMxMDpl9orjsy1pHF34u_XtJZCVjiHI85e-LtFr3FYdiHJhxmW1pcilwlDRosXFK9uMmG0QJjfOZWLhQA7I8KbTZFbEZsnALrmmjlgH70mv0tuF3iMIl7UChfq8DavShhVAxR-ehLoUz02MJ7S55te5yFHo6tZ_BmHwdo1PpkmUTBwAkouX00bnwq333NpraaWkmXWlNLh0l-6pcxZLvKLtheeWS8bkB16OAZPnjC03wQ52R-0PJrXRjeiSFk-PCDfsLeTUVa_xipqgtl-EqsQWPbB7xFSR-ENjC1ZbDw",
    |      "e": "AQAB",
    |      "x5c": [
    | "MIICmzCCAYMCBgF3kdJiZzANBgkqhkiG9w0BAQsFADARMQ8wDQYDVQQDDAZtYXN0ZXIwHhcNMjEwMjExMTU1ODQwWhcNMzEwMjExMTYwMDIwWjARMQ8wDQYDVQQDDAZtYXN0ZXIwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCnKAepS/lXkDRmU66kbYeQbzYFFLxFcC2Jorelm//WGtNJIzEwOmX2iuOzLWkcXfi79e0lkJWOIcjzl74u0WvcVh2IcmHGZbWlyKXCUNGixcUr24yYbRAmN85lYuFADsjwptNkVsRmycAuuaaOWAfvSa/S24XeIwiXtQKF+rwNq9KGFUDFH56EuhTPTYwntLnm17nIUejq1n8GYfB2jU+mSZRMHACSi5fTRufCrffc2mtppaSZdaU0uHSX7qlzFku8ou2F55ZLxuQHXo4Bk+eMLTfBDnZH7Q8mtdGN6JIWT48IN+wt5NRVr/GKmqC2X4SqxBY9sHvEVJH4Q2MLVlsPAgMBAAEwDQYJKoZIhvcNAQELBQADggEBAE9F4L+lx1XKChLKwnRBP6daKAYLi1MPDrQij3SyCyIk6xLUXW//aeielEX/syTc1OcqgsgRKJ1a/YUzHob6GuoSxqeS5Vmrh79R1+tEpiu5il839YTFKwuxjqLizCzzGkFshAb8IVBSWztWD00ORjtoZOnGhth6bQ75lvHYa3nmqKABgG7GxmAY8xPbhmxjeaMrs0/S+6POM/eiFRTJNmO4ISkuO0z5U5ELKS27CgSWXJuRv5JPexqdwAC705c2Jvw8nVQNEW+smDW2FZNy1UW3CI/j02auGz0OSGPaivoOxjetBHnI6TVKkS80oDInsudBXDGvsJBBvHP3PbyA8bQ="
    |      ],
    |      "x5t": "WqQ1iaIrQiKEQqf-4POE4MNY6Fw",
    |      "x5t#S256": "Kt1aj6n3nUoVjPMqpHdPeluRTcJoGIpz6YYKieAuLA4"
    |    },
    |    {
    |      "kty": "RSA",
    |      "alg": "RS256",
    |      "use": "sig",
    |      "kid": "43ca550e6495507170783bc40ba68b33",
    |      "n": "YUmMMqbP0zEDvZwn31-24TKOl77KifZIO4iZKmi43V5fuheq3k7TSg86xEPkMCyFawdS4IYJtV8lehCrn_hBDYaGtlWatK6Ik19XnYrWp0lHi5x4e-QqZdYa9kDEvmvVd6DF3Id3ioKFVn2Wb_i52rf7VuSYT_ACkMrLe2Q_PoVyrUMGiFdWPwMe54bUXNxyXhqzt1EPnkHsB17rvNzM314JDApXv2ZS373Yall2qAgH12c34-G9VR0AiC0iLLqSK9Vi64_eLykEMbLVYKbNHdQwdHASZ4pc-SSSspxf2QEE4-918Ob2C7f2K0afGPAzNV3nMZXQx3CHoEuKLWHD0RBD4bVRmFKYDsRUluRhgYHC8ERTOvS--8eqlyl26kfYO4KpGCFcBUXmUyYsHgm1_Z729fEg0KNrIATG6iPl0Yb6HeQsPzhMBO0z2bt_OK780pLS0jVC7dYFnXtNbO2-v2StcbApdTlkz4zXW7xw8CRrEFG31krzYtPsSXJzGlVn8u3BtA0E1mcx9Wj6g4TDhs5BR8TlMTxcEi93qw-FaNu3IQLGLR800rZMPu-IbpiFk5P9pW6zjHTKe85PM2AzaqhmhTS9nllpeux5MHHqI_d5Q8PtBQPWuEeEqWXWfEnWAzbUCHw8HDVG1S3yLCxLB51YKBiNZt5_95D_inbnHYE",
    |      "e": "AQAB"
    |    }
    |  ]
    |}
    |""".stripMargin

  private val failedServiceDiscoveryRequestErrorMessage =
    s"Couldn't get data from ${notExpiringCacheConfig.internalServiceDiscoveryEndpointUri}/$testRealm/.well-known/openid-configuration. Response status " +
    s"code: ${StatusCode.BadRequest}"

  private val testDeserializationException =
    DeserializationException("invalid_json", new Exception("Kaboom! Deserialization failed"))

  private val jwksResponseErrorMessage = "Oh no! There's no JWKS on our ZOO page. Is it a correct address?"

  private val serviceDiscoveryResponseWithWrongStatusCode =
    createServiceDiscoveryResponse(Right(correctOidcConfig), code = StatusCode.BadRequest, realm = testRealm)

  private val serviceDiscoveryResponseWithDeserializationException =
    createServiceDiscoveryResponse(Left(testDeserializationException), realm = testRealm)

  private val successfulServiceDiscoveryResponse = createServiceDiscoveryResponse(correctOidcConfig)

  private def createServiceDiscoveryResponse(oidcConfig: JsObject): Response[ServiceDiscoveryResponseBody] =
    createServiceDiscoveryResponse(Right(oidcConfig), realm = testRealm)

  private def createServiceDiscoveryResponse(
      body: ServiceDiscoveryResponseBody,
      code: StatusCode = StatusCode.Ok,
      realm: String): Response[ServiceDiscoveryResponseBody] = {
    Response(
      body = body,
      code = code,
      statusText = "foo",
      headers = Seq.empty,
      history = List.empty,
      RequestMetadata(
        Method.GET,
        uri"${notExpiringCacheConfig.internalServiceDiscoveryEndpointUri}/$realm/.well-known/openid-configuration",
        _headers = Seq.empty))
  }

  private def createJwksResponse(
      body: JwksResponseBody,
      code: StatusCode = StatusCode.Ok): Response[JwksResponseBody] = {
    Response(
      body = body,
      code = code,
      statusText = "bar",
      headers = Seq.empty,
      history = List.empty,
      RequestMetadata(Method.GET, uri"$jwksUriValue", _headers = Seq.empty))
  }
}
