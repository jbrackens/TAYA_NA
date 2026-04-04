package phoenix.payments.unit

import java.time.OffsetDateTime
import java.util.UUID

import scala.xml.Node
import scala.xml.Utility
import scala.xml.XML

import akka.http.scaladsl.model.ContentTypes
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.Authorization
import akka.http.scaladsl.model.headers.BasicHttpCredentials
import akka.http.scaladsl.server.Route

import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.examplePunterProfile
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.http.routes.RoutesSpecSupport
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.payments.PaymentsModule
import phoenix.payments.infrastructure.InMemoryPaymentNotificationsRepository
import phoenix.payments.infrastructure.InMemoryTransactionRepository
import phoenix.payments.infrastructure.PaymentsConfig
import phoenix.payments.infrastructure.WebhookCredentials
import phoenix.payments.support.InMemoryCashWithdrawalReservationsRepository
import phoenix.payments.support.PaymentsDataGenerator.generatePaymentsConfig
import phoenix.payments.support.PaymentsServiceMock
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain._
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.PunterConverters.RegisteredUserOps
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.support.DataGenerator.randomGender
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generateUserPreferences
import phoenix.utils.RandomUUIDGenerator
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext

final class PxpRoutesSpec extends RoutesSpecSupport with FutureSupport {

  private implicit val clock: Clock = Clock.utcClock
  private val paymentsConfig = generatePaymentsConfig()
  private val validCredentials = paymentsConfig.webhookCredentials
  private val invalidCredentials = generatePaymentsConfig().webhookCredentials

  val routesUnderTest: Route = buildRoutes(paymentsConfig)

  "PXP Routes" when {
    "handling a PaymentStateChangeNotification" should {
      val stateChangeNotification =
        <handlePaymentStateChangedNotificationRequest
              xmlns="http://www.cqrpayments.com/PaymentProcessing"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xmlns:xsd="http://www.w3.org/2001/XMLSchema">
              <payment xsi:type="paymentWithPaymentAccount">
                  <merchantID>KalixaAcceptDEMO</merchantID>
                  <shopID>KalixaAcceptDEMO</shopID>
                  <paymentMethod>
                      <key>2</key>
                      <value>VISA Deposit</value>
                  </paymentMethod>
                  <merchantTransactionID>35e50c3-d5db-e74d-e6f9-d00b019fb3</merchantTransactionID>
                  <paymentID>1011d6fe-80ab-4aed-bbed-3f35d4ba901e</paymentID>
                  <userID>KalixaTestUser_3</userID>
                  <paymentProvider>
                      <key>92</key>
                      <value>CQRUK</value>
                  </paymentProvider>
                  <amount currencyCode="USD">15.0000</amount>
                  <creationType>
                      <key>1</key>
                      <value>User</value>
                  </creationType>
                  <userIP>10.80.12.38</userIP>
                  <state>
                      <id>97965dd7-90546-4b83-aea2-769b7cfghh2df</id>
                      <definition>
                          <key>13</key>
                          <value>AuthorisedByProvider</value>
                      </definition>
                      <createdOn>2009-05-25T12:30:12.167</createdOn>
                      <paymentStateDetails>
                          <detail xsi:type="keyStringValuePair">
                              <key>ProviderResponseCode</key>
                              <value>0</value>
                          </detail>
                          <detail xsi:type="keyStringValuePair">
                              <key>ApprovalCode</key>
                              <value>452237</value>
                          </detail>
                      </paymentStateDetails>
                  </state>
                  <isExecuted>true</isExecuted>
                  <baseAmount currencyCode="EUR">15.0000</baseAmount>
                  <paymentDetails>
                      <detail xsi:type="keyStringValuePair">
                          <key>ProviderExternalID</key>
                          <value>206969</value>
                      </detail>
                      <detail xsi:type="keyIntValuePair">
                          <key>PaymentScoring</key>
                          <value>711201</value>
                      </detail>
                  </paymentDetails>
                  <paymentAccount>
                      <paymentAccountID>520000069</paymentAccountID>
                  </paymentAccount>
              </payment>
        </handlePaymentStateChangedNotificationRequest>

      "require basic auth" in {
        postXML(
          "/pxp/payment-state-changed/handlePaymentStateChangedNotification",
          stateChangeNotification,
          credentials = invalidCredentials) ~> routesUnderTest ~> check {
          status shouldBe StatusCodes.Unauthorized
        }
      }

      "process notification successfully" in {
        val expectedResponse =
          <handlePaymentStateChangedNotificationResponse
              xmlns="http://www.cqrpayments.com/PaymentProcessing"
              xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
              xmlns:xsd="http://www.w3.org/2001/XMLSchema">
              <resultCode>
                  <key>0</key>
                  <value>ProcessedSuccessfully</value>
              </resultCode>
              <resultMessage/>
          </handlePaymentStateChangedNotificationResponse>

        postXML(
          "/pxp/payment-state-changed/handlePaymentStateChangedNotification",
          stateChangeNotification,
          credentials = validCredentials) ~> routesUnderTest ~> check {
          status shouldBe StatusCodes.OK
          trim(XML.loadString(responseAs[String])) shouldBe trim(expectedResponse)
        }
      }
    }

    "handling a cash deposit verification request" should {

      val cashDepositVerificationRequest =
        <getNewManualPaymentDetailsRequest xmlns="http://www.cqrpayments.com/PaymentProcessing">
          <merchantID>{paymentsConfig.merchantId.value}</merchantID>
          <paymentMethodID>177</paymentMethodID>
          <userID xsi:nil="true"/>
          <username xsi:nil="true"/>
          <email>john.doe@example.com</email>
          <languageCode>EN</languageCode>
        </getNewManualPaymentDetailsRequest>

      "require basic auth" in {
        postXML(
          "/pxp/verify-cash-deposit",
          cashDepositVerificationRequest,
          credentials = invalidCredentials) ~> routesUnderTest ~> check {
          status shouldBe StatusCodes.Unauthorized
        }
      }

      "process request successfully" in {

        val expectedResponse =
          <getNewManualPaymentDetailsResponse xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <result>
              <userID xmlns="http://www.cqrpayments.com/PaymentProcessing">7a587ce0-a73a-4b4b-9967-0a38fee7c10f</userID>
              <merchantTransactionID xmlns="http://www.cqrpayments.com/PaymentProcessing">433ef7c3-c59d-4c89-98cd-2a368d5da344</merchantTransactionID>
              <userDetails xmlns="http://www.cqrpayments.com/PaymentProcessing">
                <username>john.doe</username>
                <firstname>John</firstname>
                <lastname>Doe</lastname>
                <currencyCode>USD</currencyCode>
                <languageCode>en</languageCode>
                <email>john.doe@example.com</email>
                <address>
                  <street>Raritan Road Unit F4B, 1255</street>
                  <postalCode>07066</postalCode>
                  <city>Clark</city>
                  <state>NJ</state>
                  <countryCode2>US</countryCode2>
                  <telephoneNumber>+12666666666</telephoneNumber>
                </address>
                <dateOfBirth>1994-04-07T00:00:00</dateOfBirth>
                <identificationNumber>xxxxx2137</identificationNumber>
              </userDetails>
              <paymentDetails xmlns="http://www.cqrpayments.com/PaymentProcessing">
                <detail xsi:type="keyDecimalValuePair">
                  <key>MinLimit</key>
                  <value>1.00</value>
                </detail>
                <detail xsi:type="keyDecimalValuePair">
                  <key>MaxLimit</key>
                  <value>200.00</value>
                </detail>
                <detail xsi:type="keyStringValuePair">
                  <key>LimitCurrency</key>
                  <value>USD</value>
                </detail>
              </paymentDetails>
            </result>
            <status>
              <code xmlns="http://www.cqrpayments.com/PaymentProcessing">0</code>
              <description xmlns="http://www.cqrpayments.com/PaymentProcessing">Success</description>
              <details xmlns="http://www.cqrpayments.com/PaymentProcessing"/>
            </status>
          </getNewManualPaymentDetailsResponse>

        val puntersBC = new PuntersContextProviderSuccess(examplePunterProfile)
        val walletsBC = new WalletContextProviderSuccess(clock)
        val puntersRepository = {
          val userDetails = UserDetails(
            userName = Username.fromStringUnsafe("john.doe"),
            name = PersonalName(
              title = Title("Mr").unsafe(),
              firstName = FirstName("John").unsafe(),
              lastName = LastName("Doe").unsafe()),
            email = Email.fromStringUnsafe("john.doe@example.com"),
            phoneNumber = MobilePhoneNumber("+12666666666"),
            address = Address(
              addressLine = AddressLine("Raritan Road Unit F4B, 1255").unsafe(),
              city = City("Clark").unsafe(),
              state = State("NJ").unsafe(),
              zipcode = Zipcode("07066").unsafe(),
              country = Country("US").unsafe()),
            dateOfBirth = DateOfBirth.from(day = 7, month = 4, year = 1994).unsafe(),
            gender = Some(randomGender()),
            ssn = Last4DigitsOfSSN.fromString("2137").unsafe(),
            twoFactorAuthEnabled = true,
            userPreferences = generateUserPreferences(),
            termsAgreement = TermsAgreement(version = TermsAcceptedVersion(1), acceptedAt = OffsetDateTime.MIN),
            signUpDate = OffsetDateTime.MIN,
            isRegistrationVerified = true,
            isPhoneNumberVerified = true,
            isEmailVerified = true)

          val registeredUser = RegisteredUser(
            userId = UserId(UUID.fromString("7a587ce0-a73a-4b4b-9967-0a38fee7c10f")),
            details = userDetails,
            verified = true,
            admin = false,
            lastSignIn = None)

          val puntersRepository = new InMemoryPuntersRepository()
          awaitRight(
            puntersRepository.startPunterRegistration(registeredUser.toPunter(), clock.currentOffsetDateTime()))
          puntersRepository
        }
        val uuidGenerator: UUIDGenerator = () => UUID.fromString("433ef7c3-c59d-4c89-98cd-2a368d5da344")

        val routesUnderTest = buildRoutes(
          config = paymentsConfig,
          punters = puntersBC,
          wallets = walletsBC,
          puntersRepository = puntersRepository,
          uuidGenerator = uuidGenerator)

        postXML(
          "/pxp/verify-cash-deposit",
          cashDepositVerificationRequest,
          credentials = validCredentials) ~> routesUnderTest ~> check {
          status shouldBe StatusCodes.OK
          trim(XML.loadString(responseAs[String])) shouldBe trim(expectedResponse)
        }
      }
    }

    "handling a cash deposit request with empty email" should {

      val cashDepositVerificationRequest =
        <getNewManualPaymentDetailsRequest xmlns="http://www.cqrpayments.com/PaymentProcessing">
          <merchantID>GMBLNewJerseyDev</merchantID>
          <paymentMethodID>177</paymentMethodID>
          <userID xsi:nil="true" />
          <username>trevor-test</username>
          <email xsi:nil="true" />
          <languageCode>EN</languageCode>
        </getNewManualPaymentDetailsRequest>

      "process request successfully" in {

        val expectedResponse =
          <getNewManualPaymentDetailsResponse xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <status>
              <code xmlns="http://www.cqrpayments.com/PaymentProcessing">2</code>
              <description xmlns="http://www.cqrpayments.com/PaymentProcessing">UserNotFound</description>
              <details xmlns="http://www.cqrpayments.com/PaymentProcessing">Unable to locate User</details>
            </status>
          </getNewManualPaymentDetailsResponse>

        postXML(
          "/pxp/verify-cash-deposit",
          cashDepositVerificationRequest,
          credentials = validCredentials) ~> routesUnderTest ~> check {
          status shouldBe StatusCodes.OK
          trim(XML.loadString(responseAs[String])) shouldBe trim(expectedResponse)
        }
      }
    }

    "handling a cash deposit request with empty username" should {

      val cashDepositVerificationRequest =
        <getNewManualPaymentDetailsRequest xmlns="http://www.cqrpayments.com/PaymentProcessing">
          <merchantID>GMBLNewJerseyDev</merchantID>
          <paymentMethodID>177</paymentMethodID>
          <userID xsi:nil="true" />
          <username xsi:nil="true" />
          <email>trevor@flipsports.com</email>
          <languageCode>EN</languageCode>
        </getNewManualPaymentDetailsRequest>

      "process request successfully" in {

        val expectedResponse =
          <getNewManualPaymentDetailsResponse xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
            <status>
              <code xmlns="http://www.cqrpayments.com/PaymentProcessing">2</code>
              <description xmlns="http://www.cqrpayments.com/PaymentProcessing">UserNotFound</description>
              <details xmlns="http://www.cqrpayments.com/PaymentProcessing">Unable to locate User</details>
            </status>
          </getNewManualPaymentDetailsResponse>

        postXML(
          "/pxp/verify-cash-deposit",
          cashDepositVerificationRequest,
          credentials = validCredentials) ~> routesUnderTest ~> check {
          status shouldBe StatusCodes.OK
          trim(XML.loadString(responseAs[String])) shouldBe trim(expectedResponse)
        }
      }
    }
  }

  private def buildRoutes(
      config: PaymentsConfig,
      punters: PuntersBoundedContext = new PuntersContextProviderSuccess(),
      wallets: WalletsBoundedContext = new WalletContextProviderSuccess(clock),
      authenticationRepository: AuthenticationRepository = new TestAuthenticationRepository(),
      puntersRepository: PuntersRepository = new InMemoryPuntersRepository(),
      uuidGenerator: UUIDGenerator = RandomUUIDGenerator): Route = {
    val auth = JwtAuthenticatorMock.jwtAuthenticatorMock()
    val paymentsModule =
      PaymentsModule.init(
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        config,
        auth,
        uuidGenerator,
        clock)(
        PaymentsServiceMock.successful(),
        new InMemoryTransactionRepository(),
        new InMemoryCashWithdrawalReservationsRepository(),
        new InMemoryPaymentNotificationsRepository())

    Route.seal(paymentsModule.routes.pxp.toAkkaHttp)
  }

  private def postXML(path: String, payload: Node, credentials: WebhookCredentials): HttpRequest = {
    val authHeader = Authorization(BasicHttpCredentials(credentials.username.value, credentials.password.value))
    Post(path).withEntity(ContentTypes.`text/xml(UTF-8)`, payload.toString()).withHeaders(authHeader)
  }

  private def trim(xml: Node): Node =
    Utility.trim(xml)
}
