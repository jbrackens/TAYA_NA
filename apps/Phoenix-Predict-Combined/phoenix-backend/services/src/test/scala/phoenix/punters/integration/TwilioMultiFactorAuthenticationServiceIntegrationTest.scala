package phoenix.punters.integration

import akka.actor
import akka.actor.typed.scaladsl.adapter._
import com.github.tomakehurst.wiremock.WireMockServer
import com.github.tomakehurst.wiremock.client.WireMock.aResponse
import com.github.tomakehurst.wiremock.client.WireMock.containing
import com.github.tomakehurst.wiremock.client.WireMock.post
import com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo
import com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.http.core.AkkaHttpClient
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.SendVerificationCodeFailure
import phoenix.punters.domain.VerificationFailure
import phoenix.punters.infrastructure.twilio.TwilioAccountServiceId
import phoenix.punters.infrastructure.twilio.TwilioAuthToken
import phoenix.punters.infrastructure.twilio.TwilioConfig
import phoenix.punters.infrastructure.twilio.TwilioMultiFactorAuthenticationService
import phoenix.punters.infrastructure.twilio.TwilioVerificationServiceId
import phoenix.punters.infrastructure.twilio.TwilioVerifyApiBaseUrl
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.FutureSupport

final class TwilioMultiFactorAuthenticationServiceIntegrationTest
    extends AnyWordSpecLike
    with Matchers
    with ActorSystemIntegrationSpec
    with FutureSupport
    with BeforeAndAfterAll {

  private val httpServer = new WireMockServer(wireMockConfig().dynamicPort())
  httpServer.start()

  implicit val classicSystem: actor.ActorSystem = system.toClassic

  override def afterAll(): Unit = {
    super.afterAll()
    httpServer.stop()
  }

  private val testFakeTwilioConfig = TwilioConfig(
    TwilioVerificationServiceId("VAfNePAcsD4pd9Ag4Q"),
    TwilioAccountServiceId("ACe4z3Asq14qubvfl9RpH90V8XcQ"),
    TwilioAuthToken("yxl4rp6d00q9lgnvd2u9xg0kni"),
    TwilioVerifyApiBaseUrl(httpServer.baseUrl()))

  private val service =
    new TwilioMultiFactorAuthenticationService(new AkkaHttpClient(classicSystem), testFakeTwilioConfig)(ec, system)

  "when sending a verification code" should {
    "should send a verification code on the happy path" in {
      val response =
        """
          |{
          |  "status": "pending",
          |  "payee": null,
          |  "date_updated": "2021-07-15T17:24:58Z",
          |  "send_code_attempts": [
          |    {
          |      "attempt_sid": "VL52e31914db0c3017e1a40a6768d7f5d2",
          |      "channel": "sms",
          |      "time": "2021-07-15T17:24:58.007Z"
          |    }
          |  ],
          |  "account_sid": "AC0ef9b0f1c1b3d28795fd7d787e219dd6",
          |  "to": "+34123456789",
          |  "amount": null,
          |  "valid": false,
          |  "lookup": {
          |    "carrier": {
          |      "mobile_country_code": "214",
          |      "type": "mobile",
          |      "error_code": null,
          |      "mobile_network_code": "06",
          |      "name": "VODAFONE ENABLER ESPAÑA"
          |    }
          |  },
          |  "url": "https://verify.twilio.com/v2/Services/VAfNePAcsD4pd9Ag4Q/Verifications/VE341f52601959c2b742a8d7c46dad1ffc",
          |  "sid": "VE341f52601959c2b742a8d7c46dad1ffc",
          |  "date_created": "2021-07-15T17:24:58Z",
          |  "service_sid": "VAfNePAcsD4pd9Ag4Q",
          |  "channel": "sms"
          |}
          |""".stripMargin

      httpServer.stubFor(
        post(urlEqualTo(s"/v2/Services/${testFakeTwilioConfig.verificationServiceId.value}/Verifications"))
          .withRequestBody(containing("To=%2B34123456789"))
          .withRequestBody(containing("Channel=sms"))
          .withBasicAuth(testFakeTwilioConfig.accountServiceId.value, testFakeTwilioConfig.authToken.value)
          .willReturn(aResponse().withStatus(201).withBody(response).withHeader("Content-Type", "application/json")))

      awaitRight(service.sendVerificationCode(MobilePhoneNumber("+34123456789"))) shouldBe MultifactorVerificationId(
        "VE341f52601959c2b742a8d7c46dad1ffc")
    }

    "fail when the mobile phone has an incorrect format" in {
      val response =
        """
          |{
          |  "code": 60200,
          |  "message": "Invalid parameter `To`: 123",
          |  "more_info": "https://www.twilio.com/docs/errors/60200",
          |  "status": 400
          |}
          |""".stripMargin

      httpServer.stubFor(
        post(urlEqualTo(s"/v2/Services/${testFakeTwilioConfig.verificationServiceId.value}/Verifications"))
          .withRequestBody(containing("To=123"))
          .withRequestBody(containing("Channel=sms"))
          .withBasicAuth(testFakeTwilioConfig.accountServiceId.value, testFakeTwilioConfig.authToken.value)
          .willReturn(aResponse().withStatus(400).withBody(response).withHeader("Content-Type", "application/json")))

      val number = MobilePhoneNumber("123")
      awaitLeft(service.sendVerificationCode(number)) shouldBe SendVerificationCodeFailure.InvalidPhoneNumber("123")
    }

    "fail when sending a verification code gets rate limited" in {
      val response =
        """
          |{
          |  "code": 60203,
          |  "message": "Max send attempts reached",
          |  "more_info": "https://www.twilio.com/docs/errors/60203",
          |  "status": 429
          |}
          |""".stripMargin

      httpServer.stubFor(
        post(urlEqualTo(s"/v2/Services/${testFakeTwilioConfig.verificationServiceId.value}/Verifications"))
          .withRequestBody(containing("To=%2B34123456789"))
          .withRequestBody(containing("Channel=sms"))
          .withBasicAuth(testFakeTwilioConfig.accountServiceId.value, testFakeTwilioConfig.authToken.value)
          .willReturn(aResponse().withStatus(429).withBody(response).withHeader("Content-Type", "application/json")))

      val number = MobilePhoneNumber("+34123456789")
      awaitLeft(service.sendVerificationCode(number)) shouldBe SendVerificationCodeFailure.MaxSendAttemptsReached
    }

    "process 500 response" in {
      httpServer.stubFor(
        post(urlEqualTo(s"/v2/Services/${testFakeTwilioConfig.verificationServiceId.value}/Verifications"))
          .withRequestBody(containing("To=%2B34123456789"))
          .withRequestBody(containing("Channel=sms"))
          .withBasicAuth(testFakeTwilioConfig.accountServiceId.value, testFakeTwilioConfig.authToken.value)
          .willReturn(aResponse().withStatus(500)))

      val number = MobilePhoneNumber("+34123456789")
      awaitLeft(
        service.sendVerificationCode(number)) shouldBe SendVerificationCodeFailure.UnknownSendVerificationCodeFailure
    }
  }

  "when checking a verification code" should {
    "verify a code on the happy path" in {
      val response =
        """
          |{
          |  "status": "approved",
          |  "payee": null,
          |  "date_updated": "2021-07-15T17:33:39Z",
          |  "account_sid": "account_sid",
          |  "to": "+34123456789",
          |  "amount": null,
          |  "valid": true,
          |  "sid": "sid",
          |  "date_created": "2021-07-15T17:24:58Z",
          |  "service_sid": "service_sid",
          |  "channel": "sms"
          |}
          |""".stripMargin

      httpServer.stubFor(
        post(urlEqualTo(s"/v2/Services/${testFakeTwilioConfig.verificationServiceId.value}/VerificationCheck"))
          .withRequestBody(containing("VerificationSid=multifactorVerificationId"))
          .withRequestBody(containing("Code=123456"))
          .withBasicAuth(testFakeTwilioConfig.accountServiceId.value, testFakeTwilioConfig.authToken.value)
          .willReturn(aResponse().withStatus(200).withBody(response).withHeader("Content-Type", "application/json")))

      awaitRight(
        service.approveVerification(
          MultifactorVerificationId("multifactorVerificationId"),
          MultifactorVerificationCode.unsafe("123456"))) shouldBe ()
    }

    "process pending codes" in {
      val response =
        """
          |{
          |  "status": "pending",
          |  "payee": null,
          |  "date_updated": "2021-07-15T17:33:39Z",
          |  "account_sid": "account_sid",
          |  "to": "+34123456789",
          |  "amount": null,
          |  "valid": true,
          |  "sid": "sid",
          |  "date_created": "2021-07-15T17:24:58Z",
          |  "service_sid": "service_sid",
          |  "channel": "sms"
          |}
          |""".stripMargin

      httpServer.stubFor(
        post(urlEqualTo(s"/v2/Services/${testFakeTwilioConfig.verificationServiceId.value}/VerificationCheck"))
          .withRequestBody(containing("VerificationSid=multifactorVerificationId"))
          .withRequestBody(containing("Code=123456"))
          .withBasicAuth(testFakeTwilioConfig.accountServiceId.value, testFakeTwilioConfig.authToken.value)
          .willReturn(aResponse().withStatus(200).withBody(response).withHeader("Content-Type", "application/json")))

      awaitLeft(
        service.approveVerification(
          MultifactorVerificationId("multifactorVerificationId"),
          MultifactorVerificationCode.unsafe("123456"))) shouldBe VerificationFailure.IncorrectVerificationCode
    }

    "fail when checking a verification code gets rate limited" in {
      val response =
        """
          |{
          |  "code": 60202,
          |  "message": "Max check attempts reached",
          |  "more_info": "https://www.twilio.com/docs/errors/60202",
          |  "status": 429
          |}
          |""".stripMargin

      httpServer.stubFor(
        post(urlEqualTo(s"/v2/Services/${testFakeTwilioConfig.verificationServiceId.value}/VerificationCheck"))
          .withRequestBody(containing("VerificationSid=multifactorVerificationId"))
          .withRequestBody(containing("Code=123456"))
          .withBasicAuth(testFakeTwilioConfig.accountServiceId.value, testFakeTwilioConfig.authToken.value)
          .willReturn(aResponse().withStatus(429).withBody(response).withHeader("Content-Type", "application/json")))

      awaitLeft(
        service.approveVerification(
          MultifactorVerificationId("multifactorVerificationId"),
          MultifactorVerificationCode.unsafe("123456"))) shouldBe VerificationFailure.MaxCheckAttemptsReached
    }

    "process not found codes" in {
      httpServer.stubFor(
        post(urlEqualTo(s"/v2/Services/${testFakeTwilioConfig.verificationServiceId.value}/VerificationCheck"))
          .withRequestBody(containing("VerificationSid=multifactorVerificationId"))
          .withRequestBody(containing("Code=123456"))
          .withBasicAuth(testFakeTwilioConfig.accountServiceId.value, testFakeTwilioConfig.authToken.value)
          .willReturn(aResponse().withStatus(404)))

      awaitLeft(service.approveVerification(
        MultifactorVerificationId("multifactorVerificationId"),
        MultifactorVerificationCode.unsafe("123456"))) shouldBe VerificationFailure.VerificationExpiredOrAlreadyApproved
    }

    "process 500 response" in {
      httpServer.stubFor(
        post(urlEqualTo(s"/v2/Services/${testFakeTwilioConfig.verificationServiceId.value}/VerificationCheck"))
          .withRequestBody(containing("VerificationSid=multifactorVerificationId"))
          .withRequestBody(containing("Code=123456"))
          .withBasicAuth(testFakeTwilioConfig.accountServiceId.value, testFakeTwilioConfig.authToken.value)
          .willReturn(aResponse().withStatus(500)))

      awaitLeft(
        service.approveVerification(
          MultifactorVerificationId("multifactorVerificationId"),
          MultifactorVerificationCode.unsafe("123456"))) shouldBe VerificationFailure.UnknownVerificationFailure
    }
  }
}
