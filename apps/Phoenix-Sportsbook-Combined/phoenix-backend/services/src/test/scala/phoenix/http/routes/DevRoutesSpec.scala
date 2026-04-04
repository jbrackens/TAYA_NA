package phoenix.http.routes

import scala.concurrent.Future
import scala.concurrent.duration._

import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.model.headers.BasicHttpCredentials
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.testkit.RouteTestTimeout
import io.circe.Json
import io.circe.literal._
import io.circe.parser._
import org.scalatest.Inspectors
import org.scalatest.LoneElement.convertToCollectionLoneElementWrapper

import phoenix.boundedcontexts.market.MarketBoundedContextMock
import phoenix.boundedcontexts.punter.MemorizedTestPuntersContext
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.wallet.MemorizedTestWalletsContext
import phoenix.boundedcontexts.wallet.WalletContextProviderFailure
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.http.JsonMarshalling._
import phoenix.http.core.SwaggerDefinition
import phoenix.http.routes.dev._
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.jwt.Permissions.UserId
import phoenix.markets.MarketsBoundedContext
import phoenix.punters.PunterDataGenerator.generatePuntersDomainConfig
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain._
import phoenix.punters.infrastructure.PunterJsonFormats._
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SignUpVerification
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.MemorizingTestAuthenticationRepository
import phoenix.punters.support.TermsAndConditionsRepositoryMock
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.softplay.domain.SoftPlayRepository
import phoenix.softplay.support.InMemorySoftPlayRepository
import phoenix.support.DataGenerator.randomString
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.time.FakeHardcodedClock
import phoenix.utils.unsafe.EitherOps
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.Balance

final class DevRoutesSpec extends RoutesSpecSupport with Inspectors with FutureSupport {
  import DevRoutesSpec._

  private implicit val clock: Clock = new FakeHardcodedClock

  // The default is 1 second, which is apparently too low in our CI :/
  implicit val routeTestTimeout: RouteTestTimeout = RouteTestTimeout(5.seconds)

  implicit val jwtAuthenticator: JwtAuthenticator =
    JwtAuthenticatorMock.jwtAuthenticatorMock(UserId(ThePunterId.value))

  "POST /markets" should {
    "return Created on the happy path" in {
      val requestBody = parse("""
        |{
        |  "marketId": "m:o:market123",
        |  "marketName": "aMarket",
        |  "marketType": "MATCH_WINNER",
        |  "sportId": "sportId",
        |  "fixtureId": "f:o:fixtureId",
        |  "marketStatus": {
        |    "type": "BETTABLE",
        |    "changeReason": {
        |      "type": "BACKOFFICE_CHANGE",
        |      "reason": "Manually created"
        |    }
        |  },
        |  "selectionOdds": [
        |    {
        |      "selectionId": "SelectionID",
        |      "selectionName": "Selection Name",
        |      "odds": 1.47,
        |      "active": true
        |    },
        |    {
        |      "selectionId": "SecondSelectionID",
        |      "selectionName": "Second Selection Name",
        |      "odds": 1.90,
        |      "active": false
        |    }
        |  ]
        |}
      """.stripMargin).get

      Post("/markets", requestBody) ~> buildRoutes() ~> check {
        status shouldEqual StatusCodes.Created
      }
    }
  }

  "POST /test-account-sign-up" should {
    def validTestAccountSignUpRequest(verification: Option[SignUpVerification] = None) =
      json"""
       {
         "name": {
           "title": "Mr",
           "firstName": "John",
           "lastName": "Doe"
         },
         "username": "john.doe",
         "password": "TestTest12345%%!!",
         "email": "john.doe@example.com",
         "phoneNumber": "+12 666 666 666",
         "address": {
           "addressLine": "Raritan Road Unit F4B, 1255",
           "city": "Clark",
           "state": "NJ",
           "zipcode": "07066",
           "country": "US"
         },
         "dateOfBirth": {
           "day": 1,
           "month": 2,
           "year": 1985
         },
         "gender": "Male",
         "ssn": "123452137",
         "referralCode": "xyz",
         "verification": ${verification}
       }
      """

    "return 204 and create the test account on the happy path" in {
      val authenticationRepository = new MemorizingTestAuthenticationRepository()
      val puntersRepository = new InMemoryPuntersRepository()
      val puntersBoundedContext = new MemorizedTestPuntersContext()
      val walletsBoundedContext = new MemorizedTestWalletsContext(clock)
      val termsAndConditionsRepository = new TermsAndConditionsRepositoryMock()

      val routes = buildRoutes(
        authenticationRepository = authenticationRepository,
        puntersRepository = puntersRepository,
        punters = puntersBoundedContext,
        wallets = walletsBoundedContext,
        termsAndConditionsRepository = termsAndConditionsRepository)

      Post("/test-account-sign-up", validTestAccountSignUpRequest()) ~>
      addCredentials(validCredentials) ~> routes ~> check {
        status shouldEqual StatusCodes.NoContent
      }

      puntersBoundedContext.unverifiedPunterProfileCreations.get() should matchPattern {
        case List((_, Limits(_, _, _), Some(ReferralCode("xyz")), isTestAccount)) if isTestAccount == true =>
      }

      walletsBoundedContext.walletCreations should matchPattern {
        case List((_, Balance.initial)) =>
      }

      val expectedUsername = Username.fromStringUnsafe("john.doe")
      val expectedName = PersonalName(
        title = Title("Mr").unsafe(),
        firstName = FirstName("John").unsafe(),
        lastName = LastName("Doe").unsafe())
      val expectedEmail = Email.fromStringUnsafe("john.doe@example.com")
      val expectedPhoneNumber = MobilePhoneNumber("+12 666 666 666")
      val expectedAddress = Address(
        addressLine = AddressLine("Raritan Road Unit F4B, 1255").unsafe(),
        city = City("Clark").unsafe(),
        state = State("NJ").unsafe(),
        zipcode = Zipcode("07066").unsafe(),
        country = Country("US").unsafe())
      val expectedDateOfBirth = DateOfBirth(1, 2, 1985)
      val expectedGender = Some(Gender.Male)
      val expectedSSN = FullSSN.fromString("123452137").unsafe()

      authenticationRepository.registrations should ===(
        List(
          (
            UserDetailsKeycloak(userName = expectedUsername, email = expectedEmail, isEmailVerified = true),
            ValidPassword.fromStringUnsafe("TestTest12345%%!!"))))

      val punter = awaitSource(puntersRepository.getConfirmedPunters()).loneElement
      punter.details shouldBe PunterPersonalDetails(
        expectedUsername,
        expectedName,
        expectedEmail,
        expectedPhoneNumber,
        expectedAddress,
        expectedDateOfBirth,
        expectedGender,
        isTestAccount = true,
        document = None,
        isPhoneNumberVerified = true)
      punter.ssn should ===(Right(expectedSSN))
      punter.settings shouldBe PunterSettings(
        None,
        UserPreferences.default,
        TermsAgreement(TermsAcceptedVersion(0), clock.currentOffsetDateTime()),
        clock.currentOffsetDateTime(),
        isRegistrationVerified = true,
        isAccountVerified = false,
        mfaEnabled = false)
    }

    "fail when no credentials are passed" in {
      Post("/test-account-sign-up", validTestAccountSignUpRequest()) ~> buildRoutes() ~> check {
        status shouldEqual StatusCodes.Unauthorized
      }
    }

    "fail when invalid credentials are passed" in {
      val invalidCredentials = BasicHttpCredentials(randomString(), randomString())
      Post("/test-account-sign-up", validTestAccountSignUpRequest()) ~>
      addCredentials(invalidCredentials) ~> buildRoutes() ~> check {
        status shouldEqual StatusCodes.Unauthorized
        assertErrorResponse(responseAs[Json], "unauthorizedRequest")
      }
    }

    "fail if a user with same username already exists" in {
      val authenticationRepository = new TestAuthenticationRepository() {
        override def userExists(userId: AuthenticationRepository.UserLookupId): Future[Boolean] =
          Future.successful(userId match {
            case UserLookupId.ByUsername(username) if username.value == "john.doe" => true
            case _                                                                 => false
          })
      }
      val routes = buildRoutes(authenticationRepository = authenticationRepository)

      Post("/test-account-sign-up", validTestAccountSignUpRequest()) ~>
      addCredentials(validCredentials) ~> routes ~> check {
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "conflictingPunterInformation")
      }
    }

    "fail if a user with same email already exists" in {
      val authenticationRepository = new TestAuthenticationRepository() {
        override def userExists(userId: AuthenticationRepository.UserLookupId): Future[Boolean] =
          Future.successful(userId match {
            case UserLookupId.ByEmail(email) if email.value == "john.doe@example.com" => true
            case _                                                                    => false
          })
      }
      val routes = buildRoutes(authenticationRepository = authenticationRepository)

      Post("/test-account-sign-up", validTestAccountSignUpRequest()) ~>
      addCredentials(validCredentials) ~> routes ~> check {
        status shouldEqual StatusCodes.Conflict
        assertErrorResponse(responseAs[Json], "conflictingPunterInformation")
      }
    }

    "fail if the password is wrongly formatted" in {
      val invalidPasswordFormat = parse("""
        |{
        |  "name": {
        |    "title": "Mr",
        |    "firstName": "John",
        |    "lastName": "Doe"
        |  },
        |  "username": "john.doe",
        |  "password": "IM_NOT_VALID",
        |  "email": "john.doe@example.com",
        |  "phoneNumber": "+12 666 666 666",
        |  "address": {
        |    "addressLine": "Raritan Road Unit F4B, 1255",
        |    "city": "Clark",
        |    "state": "NJ",
        |    "zipcode": "07066",
        |    "country": "US"
        |  },
        |  "dateOfBirth": {
        |    "day": 1,
        |    "month": 2,
        |    "year": 1985
        |  },
        |  "gender": "Male",
        |  "ssn": "123452137",
        |  "referralCode": "xyz"
        |}
      """.stripMargin).get

      Post("/test-account-sign-up", invalidPasswordFormat) ~>
      addCredentials(validCredentials) ~> buildRoutes() ~> check {
        status shouldEqual StatusCodes.Unauthorized
        assertErrorResponse(responseAs[Json], "unauthorisedResponseDuringLogin")
      }
    }

    "fail when an email address is used as a username" in {
      val invalidUsernameFormat = parse("""
        |{
        |  "name": {
        |    "title": "Mr",
        |    "firstName": "John",
        |    "lastName": "Doe"
        |  },
        |  "username": "john.doe@example.com",
        |  "password": "TestTest12345%%!!",
        |  "email": "john.doe@example.com",
        |  "phoneNumber": "+12 666 666 666",
        |  "address": {
        |    "addressLine": "Raritan Road Unit F4B, 1255",
        |    "city": "Clark",
        |    "state": "NJ",
        |    "zipcode": "07066",
        |    "country": "US"
        |  },
        |  "dateOfBirth": {
        |    "day": 1,
        |    "month": 2,
        |    "year": 1985
        |  },
        |  "gender": "Male",
        |  "ssn": "123452137",
        |  "referralCode": "xyz"
        |}
      """.stripMargin).get

      Post("/test-account-sign-up", invalidUsernameFormat) ~>
      addCredentials(validCredentials) ~> buildRoutes() ~> check {
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "usernameIsInvalid")
      }
    }

    "fail when a user is under the legal gambling age" in {
      val restrictedAge = parse("""
        |{
        |  "name": {
        |    "title": "Mr",
        |    "firstName": "John",
        |    "lastName": "Doe"
        |  },
        |  "username": "john.doe",
        |  "password": "TestTest12345%%!!",
        |  "email": "john.doe@example.com",
        |  "phoneNumber": "+12 666 666 666",
        |  "address": {
        |    "addressLine": "Raritan Road Unit F4B, 1255",
        |    "city": "Clark",
        |    "state": "NJ",
        |    "zipcode": "07066",
        |    "country": "US"
        |  },
        |  "dateOfBirth": {
        |    "day": 1,
        |    "month": 2,
        |    "year": 2008
        |  },
        |  "gender": "Male",
        |  "ssn": "123452137",
        |  "referralCode": "xyz"
        |}
      """.stripMargin).get

      Post("/test-account-sign-up", restrictedAge) ~>
      addCredentials(validCredentials) ~> buildRoutes() ~> check {
        status shouldEqual StatusCodes.BadRequest
        assertErrorResponse(responseAs[Json], "ageRestrictionNotPassed")
      }
    }

  }

  "POST /punters/:punterId/funds/credit" should {
    val requestBody = """{"details": "Manual deposit", "amount": {"amount": 21.37, "currency": "USD"}}"""

    "respond with 401 Unauthorized on invalid credentials" in {
      val invalidCredentials = BasicHttpCredentials(randomString(), randomString())
      val routes = buildRoutes()

      Post("/punters/punter-123/funds/credit", requestBody) ~> addCredentials(invalidCredentials) ~> routes ~> check {
        status shouldEqual StatusCodes.Unauthorized
      }
    }

    "respond with 204 No Content" in {
      val routes = buildRoutes()

      Post("/punters/punter-123/funds/credit", requestBody) ~> addCredentials(validCredentials) ~> routes ~> check {
        status shouldEqual StatusCodes.NoContent
      }
    }

    "respond with 404 Not Found on missing punter" in {
      val failingWallets = new WalletContextProviderFailure
      val routes = buildRoutes(wallets = failingWallets)

      Post("/punters/punter-123/funds/credit", requestBody) ~> addCredentials(validCredentials) ~> routes ~> check {
        status shouldEqual StatusCodes.NotFound
      }
    }
  }

  "GET /soft-play-report" should {

    "respond with 401 Unauthorized on invalid credentials" in {
      val invalidCredentials = BasicHttpCredentials(randomString(), randomString())
      val routes = buildRoutes()

      Get("/soft-play-report") ~> addCredentials(invalidCredentials) ~> routes ~> check {
        status shouldEqual StatusCodes.Unauthorized
      }
    }

    "respond with 200 Ok" in {
      val routes = buildRoutes()
      val expectedResponse = parse("""{
        |  "successfulRegistrationsCount" : 0,
        |  "unsuccessfulRegistrationsCount" : 0,
        |  "puntersWithDepositLimitCount" : 0,
        |  "puntersWithSpendLimitCount" : 0,
        |  "excludedPuntersCount" : 0,
        |  "suspendedPuntersCount" : 0
        |}""".stripMargin).get

      Get("/soft-play-report") ~> addCredentials(validCredentials) ~> routes ~> check {
        status shouldEqual StatusCodes.OK
        responseAs[Json] shouldBe expectedResponse
      }
    }
  }

  private def buildRoutes(
      punters: PuntersBoundedContext = new PuntersContextProviderSuccess(),
      wallets: WalletsBoundedContext = new WalletContextProviderSuccess(clock),
      markets: MarketsBoundedContext = MarketBoundedContextMock.returningAllMarkets,
      authenticationRepository: AuthenticationRepository = new TestAuthenticationRepository(),
      puntersRepository: PuntersRepository = new InMemoryPuntersRepository(),
      termsAndConditionsRepository: TermsAndConditionsRepository = new TermsAndConditionsRepositoryMock(),
      softPlayRepository: SoftPlayRepository = new InMemorySoftPlayRepository(),
      puntersDomainConfig: PuntersDomainConfig = generatePuntersDomainConfig()): Route = {
    val routes: Route = DevRoutes
      .create(
        markets,
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        termsAndConditionsRepository,
        softPlayRepository,
        devRoutesConfiguration = DevRoutesSpec.hardcodedForTestsDevRoutesConfiguration,
        publicRoutesSwagger = SwaggerDefinition(Nil),
        puntersDomainConfig)
      .toAkkaHttp
    Route.seal(routes)
  }
}

object DevRoutesSpec {
  val ThePunterId: PunterId = PunterId("69790b82-6c65-4ed9-91eb-b4ba0b8542a8")
  val hardcodedForTestsDevRoutesConfiguration: DevRoutesConfiguration =
    DevRoutesConfiguration(DevRoutesUsername("DEV_ROUTES_USERNAME"), DevRoutesPassword("DEV_ROUTES_PASSWORD"))

  val validCredentials: BasicHttpCredentials = BasicHttpCredentials(
    hardcodedForTestsDevRoutesConfiguration.username.value,
    hardcodedForTestsDevRoutesConfiguration.password.value)
}
