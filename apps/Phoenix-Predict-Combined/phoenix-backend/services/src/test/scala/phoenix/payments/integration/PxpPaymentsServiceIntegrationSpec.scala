package phoenix.payments.integration

import java.nio.charset.StandardCharsets

import akka.actor
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter._
import com.github.tomakehurst.wiremock.WireMockServer
import com.github.tomakehurst.wiremock.client.WireMock._
import com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig
import org.apache.commons.codec.binary.Base64
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.currency.MoneyAmount
import phoenix.http.core.AkkaHttpClient
import phoenix.payments.domain.PaymentDirection
import phoenix.payments.domain.PaymentId
import phoenix.payments.domain.PaymentOrigin
import phoenix.payments.domain.PaymentReference
import phoenix.payments.domain.PaymentSessionStarted
import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.PaymentsService.PaymentServiceError
import phoenix.payments.domain.RedirectToPaymentScreenUrl
import phoenix.payments.domain.TransactionId
import phoenix.payments.domain.TransactionStatus
import phoenix.payments.infrastructure.MerchantId
import phoenix.payments.infrastructure.Password
import phoenix.payments.infrastructure.PaymentsConfig
import phoenix.payments.infrastructure.PxpBaseUrl
import phoenix.payments.infrastructure.PxpPaymentsService
import phoenix.payments.infrastructure.ShopId
import phoenix.payments.infrastructure.Username
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext.SessionId
import phoenix.punters.domain
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain._
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.time.FakeHardcodedClock

final class PxpPaymentsServiceIntegrationSpec
    extends AnyWordSpecLike
    with Matchers
    with ActorSystemIntegrationSpec
    with FutureSupport
    with BeforeAndAfterAll {

  implicit val actorSystem: ActorSystem[Nothing] = system
  implicit val classicSystem: actor.ActorSystem = system.toClassic

  private val httpServer = new WireMockServer(wireMockConfig().dynamicPort())
  httpServer.start()

  private val clock = new FakeHardcodedClock()

  override def afterAll(): Unit = {
    super.afterAll()
    httpServer.stop()
  }

  private val paymentsConfig = PaymentsConfig(
    MerchantId("merchant-id"),
    ShopId("shop-id"),
    PxpBaseUrl(httpServer.baseUrl()),
    Username("payments-username"),
    Password("payments-password"),
    Username("payments-webhook-username"),
    Password("payments-webhook-password"))

  private val authorizationHeaderValue = Base64.encodeBase64String(
    s"${paymentsConfig.username.value}:${paymentsConfig.password.value}".getBytes(StandardCharsets.UTF_8))

  "PxpPaymentsService" when {
    val objectUnderTest = new PxpPaymentsService(new AkkaHttpClient(classicSystem), paymentsConfig)

    val punterDetails = UserDetails(
      userName = domain.Username.fromStringUnsafe("softalan"),
      name = PersonalName(
        title = Title("Mr").unsafe(),
        firstName = FirstName("Soft").unsafe(),
        lastName = LastName("Alan").unsafe()),
      email = Email.fromString("soft@alan.com").getOrElse(throw new RuntimeException("KABOOM!")),
      phoneNumber = MobilePhoneNumber("+00112345678"),
      address = Address(
        addressLine = AddressLine("Soft Street, 1").unsafe(),
        city = City("Alansville").unsafe(),
        state = State("Arkansas").unsafe(),
        zipcode = Zipcode("123456789").unsafe(),
        country = Country("US").unsafe()),
      dateOfBirth = DateOfBirth(day = 1, month = 3, year = 1975),
      gender = Some(Gender.Male),
      Last4DigitsOfSSN.fromString("1234").unsafe(),
      twoFactorAuthEnabled = true,
      userPreferences = UserPreferences(
        communicationPreferences = CommunicationPreferences(
          announcements = false,
          promotions = false,
          subscriptionUpdates = false,
          signInNotifications = false),
        bettingPreferences = BettingPreferences(autoAcceptBetterOdds = false)),
      termsAgreement = TermsAgreement(version = TermsAcceptedVersion(0), acceptedAt = clock.currentOffsetDateTime()),
      signUpDate = clock.currentOffsetDateTime(),
      isRegistrationVerified = true,
      isPhoneNumberVerified = true,
      isEmailVerified = true)

    "starting a transaction" should {
      val punterId = PunterId("a02e3576-bf9c-11eb-8529-0242ac130003")
      val transactionId = TransactionId("d8b8b41a-bf9d-11eb-8529-0242ac130003")

      val requestBody =
        <getRedirectDataRequest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                                xmlns="http://www.cqrpayments.com/PaymentProcessing">
          <merchantID>merchant-id</merchantID>
          <redirectParameters xsi:type="paymentMethodSelectionWithDetailsRedirectParameters">
            <shopID>shop-id</shopID>
            <httpMethod>POST</httpMethod>
            <returnUrl>https://phoenix.test/cashier/transaction/?txStatus=INTERRUPTED&amp;txId=d8b8b41a-bf9d-11eb-8529-0242ac130003&amp;txDirection=Deposit</returnUrl>
            <languageCode>EN</languageCode>
            <currencyCode>USD</currencyCode>
            <countryCode>US</countryCode>
            <additionalDetails>
              <detail xsi:type="keyStringValuePair">
                <key>PaymentMethodSelectionProfile</key>
                <value>OnlinePayment</value>
              </detail>
            </additionalDetails>
            <user>
              <id>a02e3576-bf9c-11eb-8529-0242ac130003</id>
              <username>softalan</username>
              <firstname>Soft</firstname>
              <lastname>Alan</lastname>
              <currencyCode>USD</currencyCode>
              <languageCode>EN</languageCode>
              <email>soft@alan.com</email>
              <address>
                <street>Soft Street, 1</street>
                <postalCode>123456789</postalCode>
                <city>Alansville</city>
                <state>Arkansas</state>
                <countryCode2>US</countryCode2>
                <telephoneNumber>+00112345678</telephoneNumber>
              </address>
              <dateOfBirth>1975-03-01T00:00:00</dateOfBirth>
            </user>
            <grossAmount>21.37</grossAmount>
            <merchantTransactionID>d8b8b41a-bf9d-11eb-8529-0242ac130003</merchantTransactionID>
            <expirationTimeSpanInSeconds>900</expirationTimeSpanInSeconds>
            <successUrl>https://phoenix.test/cashier/transaction/?txStatus=PENDING&amp;txId=d8b8b41a-bf9d-11eb-8529-0242ac130003&amp;txDirection=Deposit</successUrl>
            <pendingUrl>https://phoenix.test/cashier/transaction/?txStatus=PENDING&amp;txId=d8b8b41a-bf9d-11eb-8529-0242ac130003&amp;txDirection=Deposit</pendingUrl>
            <errorUrl>https://phoenix.test/cashier/transaction/?txStatus=FAILED&amp;txId=d8b8b41a-bf9d-11eb-8529-0242ac130003&amp;txDirection=Deposit</errorUrl>
            <cancelUrl>https://phoenix.test/cashier/transaction/?txStatus=CANCELLED&amp;txId=d8b8b41a-bf9d-11eb-8529-0242ac130003&amp;txDirection=Deposit</cancelUrl>
            <refusedUrl>https://phoenix.test/cashier/transaction/?txStatus=REFUSED&amp;txId=d8b8b41a-bf9d-11eb-8529-0242ac130003&amp;txDirection=Deposit</refusedUrl>
            <paymentDirection>Deposit</paymentDirection>
          </redirectParameters>
        </getRedirectDataRequest>

      "return redirect data" in {

        val responseBody =
          <getRedirectDataResponse xmlns="http://www.cqrpayments.com/PaymentProcessing"
                                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <redirectData xsi:type="redirectDataWithPost">
              <redirectUrl>https://payments.test.kalixa.com/Checkout/PaymentMethods/</redirectUrl>
              <dataFields>
                <dataField>
                  <key>requestData</key>
                  <value>kjtuu2tyekoja2fpyeq5wodw_a644a246-289a-4eba-b1eb-b6879e0c5c5c</value>
                </dataField>
              </dataFields>
            </redirectData>
          </getRedirectDataResponse>

        httpServer.stubFor(
          post(urlEqualTo("/PaymentRedirectionService/PaymentRedirectionService.svc/pox/getRedirectData"))
            .withRequestBody(equalToXml(requestBody.toString()))
            .withHeader("Authorization", containing(authorizationHeaderValue))
            .willReturn(aResponse().withBody(responseBody.toString()).withHeader("Content-Type", "text/xml")))

        val pxpService = new PxpPaymentsService(new AkkaHttpClient(classicSystem), paymentsConfig)
        val transaction =
          PaymentTransaction(
            transactionId,
            punterId,
            PaymentDirection.Deposit,
            MoneyAmount(21.37),
            TransactionStatus.Initiated)
        val origin = PaymentOrigin("https://phoenix.test")

        val returnedRedirectData =
          awaitRight(pxpService.startPayment(origin, transaction, punterDetails))

        val expectedRedirectData = PaymentSessionStarted(
          redirectUrl = RedirectToPaymentScreenUrl("https://payments.test.kalixa.com/Checkout/PaymentMethods/"),
          paymentReference = PaymentReference("kjtuu2tyekoja2fpyeq5wodw_a644a246-289a-4eba-b1eb-b6879e0c5c5c"))

        returnedRedirectData shouldBe expectedRedirectData
      }

      "return error on an unexpected response" in {
        val responseBody =
          """
        |<this-is-not-the-xml-you-were-expecting>
        |</and-its-not-even-valid>
        |""".stripMargin

        httpServer.stubFor(
          post(urlEqualTo("/PaymentRedirectionService/PaymentRedirectionService.svc/pox/getRedirectData"))
            .withRequestBody(equalToXml(requestBody.toString()))
            .withHeader("Authorization", containing(authorizationHeaderValue))
            .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "text/xml")))

        val transaction =
          PaymentTransaction(
            transactionId,
            punterId,
            PaymentDirection.Deposit,
            MoneyAmount(21.37),
            TransactionStatus.Initiated)
        val origin = PaymentOrigin("https://phoenix.test")

        val returnedError =
          awaitLeft(objectUnderTest.startPayment(origin, transaction, punterDetails))

        returnedError shouldBe a[PaymentServiceError]
      }
    }

    "when confirming a transaction" should {
      "succeed in case of successful response with expected shape" in {
        // given
        val paymentId = PaymentId("3a5eff92-3d62-4b8f-bcb1-5cd8a7f56637")
        val expectedRequest =
          <executePaymentActionRequest
          xmlns="http://www.cqrpayments.com/PaymentProcessing"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xmlns:xsd="http://www.w3.org/2001/XMLSchema">
            <merchantID>{paymentsConfig.merchantId.value}</merchantID>
            <shopID>{paymentsConfig.shopId.value}</shopID>
            <paymentID>{paymentId.value}</paymentID>
            <actionID>205</actionID>
            <remark>Transaction captured</remark>
          </executePaymentActionRequest>

        val successResponse =
          <executePaymentActionResponse xmlns="http://www.cqrpayments.com/PaymentProcessing" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <statusCode>0</statusCode>
            <actionResults>
              <result xsi:type="keyStringValuePair">
                <key>lastStateDefinition</key>
                <value>306</value>
              </result>
            </actionResults>
          </executePaymentActionResponse>

        httpServer.stubFor(
          post(urlEqualTo("/PaymentRedirectionService/PaymentService.svc/pox/executePaymentAction"))
            .withRequestBody(equalToXml(expectedRequest.toString()))
            .withHeader("Authorization", containing(authorizationHeaderValue))
            .willReturn(aResponse().withBody(successResponse.toString()).withHeader("Content-Type", "text/xml")))

        // then
        noException shouldBe thrownBy(awaitRight(objectUnderTest.confirmPayment(paymentId)))
      }

      "fail in case of unexpected response" in {
        // given
        val paymentId = PaymentId("3a5eff92-3d62-4b8f-bcb1-5cd8a7f56637")
        val expectedRequest =
          <executePaymentActionRequest xmlns="http://www.cqrpayments.com/PaymentProcessing" 
                                       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                                       xmlns:xsd="http://www.w3.org/2001/XMLSchema">
            <merchantID>{paymentsConfig.merchantId.value}</merchantID>
            <shopID>{paymentsConfig.shopId.value}</shopID>
            <paymentID>{paymentId.value}</paymentID>
            <actionID>205</actionID>
            <remark>Transaction captured</remark>
          </executePaymentActionRequest>

        val errorResponse =
          <paymentServiceException xmlns="http://www.cqrpayments.com/PaymentProcessing" 
                                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <id>801c16e4-f63d-4ebf-8eea-378b68abf2ba</id>
            <errorCode>700</errorCode>
            <errorMessage>The action is not allowed for the payment.</errorMessage>
          </paymentServiceException>

        httpServer.stubFor(
          post(urlEqualTo("/PaymentRedirectionService/PaymentService.svc/pox/executePaymentAction"))
            .withRequestBody(equalToXml(expectedRequest.toString()))
            .withHeader("Authorization", containing(authorizationHeaderValue))
            .willReturn(aResponse().withBody(errorResponse.toString()).withHeader("Content-Type", "text/xml")))

        // when
        val attempt = awaitLeft(objectUnderTest.confirmPayment(paymentId))

        // then
        attempt shouldBe a[PaymentServiceError]
      }
    }

    "when cancelling a transaction" should {
      "succeed in case of successful response with expected shape" in {
        // given
        val paymentId = PaymentId("3a5eff92-3d62-4b8f-bcb1-5cd8a7f56637")
        val cancellationReason = "Punter not allowed to deposit"
        val expectedRequest =
          <executePaymentActionRequest xmlns="http://www.cqrpayments.com/PaymentProcessing" 
                                       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                                       xmlns:xsd="http://www.w3.org/2001/XMLSchema">
            <merchantID>{paymentsConfig.merchantId.value}</merchantID>
            <shopID>{paymentsConfig.shopId.value}</shopID>
            <paymentID>{paymentId.value}</paymentID>
            <actionID>1</actionID>
            <remark>Transaction cancelled due to: {cancellationReason}</remark>
          </executePaymentActionRequest>

        val successResponse =
          <executePaymentActionResponse xmlns="http://www.cqrpayments.com/PaymentProcessing" 
                                        xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
                                        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <statusCode>0</statusCode>
            <actionResults>
              <result xsi:type="keyStringValuePair">
                <key>lastStateDefinition</key>
                <value>113</value>
              </result>
            </actionResults>
          </executePaymentActionResponse>

        httpServer.stubFor(
          post(urlEqualTo("/PaymentRedirectionService/PaymentService.svc/pox/executePaymentAction"))
            .withRequestBody(equalToXml(expectedRequest.toString()))
            .withHeader("Authorization", containing(authorizationHeaderValue))
            .willReturn(aResponse().withBody(successResponse.toString()).withHeader("Content-Type", "text/xml")))

        // then
        noException shouldBe thrownBy(awaitRight(objectUnderTest.cancelPayment(paymentId, cancellationReason)))
      }

      "fail in case of unexpected response" in {
        // given
        val paymentId = PaymentId("3a5eff92-3d62-4b8f-bcb1-5cd8a7f56637")
        val cancellationReason = "Punter not allowed to deposit"
        val expectedRequest =
          <executePaymentActionRequest xmlns="http://www.cqrpayments.com/PaymentProcessing"
                                       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                                       xmlns:xsd="http://www.w3.org/2001/XMLSchema">
            <merchantID>{paymentsConfig.merchantId.value}</merchantID>
            <shopID>{paymentsConfig.shopId.value}</shopID>
            <paymentID>{paymentId.value}</paymentID>
            <actionID>1</actionID>
            <remark>Transaction cancelled due to: {cancellationReason}</remark>
          </executePaymentActionRequest>

        val errorResponse =
          <paymentServiceException xmlns="http://www.cqrpayments.com/PaymentProcessing"
                                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                                   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <id>801c16e4-f63d-4ebf-8eea-378b68abf2ba</id>
            <errorCode>700</errorCode>
            <errorMessage>The action is not allowed for the payment.</errorMessage>
          </paymentServiceException>

        httpServer.stubFor(
          post(urlEqualTo("/PaymentRedirectionService/PaymentService.svc/pox/executePaymentAction"))
            .withRequestBody(equalToXml(expectedRequest.toString()))
            .withHeader("Authorization", containing(authorizationHeaderValue))
            .willReturn(aResponse().withBody(errorResponse.toString()).withHeader("Content-Type", "text/xml")))

        // when
        val attempt = awaitLeft(objectUnderTest.cancelPayment(paymentId, cancellationReason))

        // then
        attempt shouldBe a[PaymentServiceError]
      }
    }

    "creating a cash withdrawal" should {

      "return a successful response" in {

        val requestBody =
          <initiatePaymentRequest xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://www.cqrpayments.com/PaymentProcessing">
                <merchantID>merchant-id</merchantID>
                <shopID>shop-id</shopID>
                <merchantTransactionID>B1237</merchantTransactionID>
                <paymentMethodID>174</paymentMethodID>
                <amount currencyCode="USD">10.00</amount>
                <userID>2f904399-b21d-4032-bea9-76223c</userID>
                <userData>
                  <username>softalan</username>
                  <firstname>Soft</firstname>
                  <lastname>Alan</lastname>
                  <email>soft@alan.com</email>
                  <address>
                    <street>Soft Street, 1</street>
                    <postalCode>123456789</postalCode>
                    <city>Alansville</city>
                    <state>Arkansas</state>
                    <countryCode2>US</countryCode2>
                    <telephoneNumber>+00112345678</telephoneNumber>
                  </address>
                  <dateOfBirth>1975-03-01T00:00:00</dateOfBirth>
                  <identificationNumber>xxxxx1234</identificationNumber>
                </userData>
                <userSessionID>0aea1662-c133-4377-a54a-c9018122c0e3</userSessionID>
                <creationTypeID>1</creationTypeID>
            </initiatePaymentRequest>

        val responseBody =
          """
            |<response-ignored-for-now/>
            |""".stripMargin

        httpServer.stubFor(
          post(urlEqualTo("/PaymentRedirectionService/PaymentService.svc/pox/initiatepayment"))
            .withRequestBody(equalToXml(requestBody.toString()))
            .withHeader("Authorization", containing(authorizationHeaderValue))
            .willReturn(aResponse().withBody(responseBody).withHeader("Content-Type", "text/xml")))

        awaitRight(
          objectUnderTest.createCashWithdrawal(
            PaymentTransaction(
              TransactionId("B1237"),
              PunterId("2f904399-b21d-4032-bea9-76223c"),
              PaymentDirection.Withdrawal,
              MoneyAmount(10),
              TransactionStatus.Initiated),
            punterDetails,
            SessionId("0aea1662-c133-4377-a54a-c9018122c0e3")))
      }
    }
  }
}
