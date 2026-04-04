package phoenix.punters.infrastructure.http

import java.time.OffsetDateTime
import java.time.format.DateTimeFormatter

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.actor.testkit.typed.scaladsl.TestProbe
import akka.actor.typed.receptionist.Receptionist
import akka.actor.typed.receptionist.ServiceKey
import akka.http.scaladsl.model.StatusCodes
import akka.http.scaladsl.server.Route
import akka.stream.scaladsl.Source
import cats.data.EitherT
import io.circe.Json
import io.circe.literal.JsonStringContext
import io.circe.parser._
import monocle.syntax.all._
import org.scalamock.scalatest.MockFactory
import org.scalatest.Assertion
import org.scalatest.GivenWhenThen
import org.scalatest.Inspectors.forAll
import org.slf4j.LoggerFactory

import phoenix.auditlog.domain.AuditLogger
import phoenix.auditlog.infrastructure.http.AuditLogBackofficeRoutes
import phoenix.auditlog.support.InMemoryAuditLogRepository
import phoenix.bets.AlwaysValidGeolocationValidator
import phoenix.bets.BetData
import phoenix.bets.BetEntity.BetId
import phoenix.bets.BetProtocol.BetRequest
import phoenix.bets.BetState
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsBoundedContext.BetType
import phoenix.bets.BetsBoundedContext.BetView
import phoenix.bets.BetsBoundedContext.Leg
import phoenix.bets.Stake
import phoenix.bets.infrastructure.http.BetRoutes
import phoenix.bets.support.BetDataGenerator.generateBetsDomainConfig
import phoenix.bets.support.BetsBoundedContextMock
import phoenix.bets.support.TestMarketBetsRepository
import phoenix.bets.support.TestPunterStakeRepository
import phoenix.boundedcontexts.market.MarketBoundedContextMock
import phoenix.boundedcontexts.punter.MemorizedTestPuntersContext
import phoenix.boundedcontexts.punter.PuntersContextProviderFailure
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess
import phoenix.boundedcontexts.punter.PuntersContextProviderSuccess.examplePunterProfile
import phoenix.boundedcontexts.wallet.MemorizedTestWalletsContext
import phoenix.boundedcontexts.wallet.WalletContextProviderFailure
import phoenix.boundedcontexts.wallet.WalletContextProviderSuccess
import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.JsonFormats._
import phoenix.core.TimeUtils._
import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.PositiveAmount
import phoenix.core.domain.DataProvider
import phoenix.core.emailing.EmailSenderStub
import phoenix.core.emailing.EmailingModule
import phoenix.core.odds.Odds
import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.core.scheduler.AkkaScheduler.Tick
import phoenix.dbviews.support.InMemoryView01PatronDetailsRepository
import phoenix.geocomply.infrastructure.http.GeoComplyRoutes
import phoenix.geocomply.support.GeoComplyLicenseServiceMock
import phoenix.geocomply.support.GeoComplyServiceMock
import phoenix.http.JsonMarshalling._
import phoenix.http.infrastructure.CirceJsonAssertions.JsonOps
import phoenix.http.infrastructure.CirceJsonAssertions.jsonFieldOfType
import phoenix.http.infrastructure.CirceJsonAssertions.jsonFieldOfTypeContaining
import phoenix.http.routes._
import phoenix.http.routes.backoffice.BackofficeRoutes
import phoenix.http.support.PhoenixRestRoutesBuilder
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticatorMock
import phoenix.markets.MarketsBoundedContext.MarketAggregate._
import phoenix.markets.MarketsBoundedContext.MarketId
import phoenix.markets.infrastructure.http.MarketRoutes
import phoenix.markets.sports.FixtureLifecycleStatus
import phoenix.markets.sports.SportEntity.CompetitorId
import phoenix.markets.sports.SportEntity.FixtureId
import phoenix.markets.sports.SportEntity.SportId
import phoenix.markets.sports.SportEntity.TournamentId
import phoenix.notes.NoteModule
import phoenix.notes.infrastructure.http.NoteBackofficeRoutes
import phoenix.notes.support.InMemoryNoteRepository
import phoenix.notes.support.NoteProjectionsSupport
import phoenix.payments.PaymentsModule
import phoenix.payments.infrastructure.InMemoryPaymentNotificationsRepository
import phoenix.payments.infrastructure.InMemoryTransactionRepository
import phoenix.payments.support.InMemoryCashWithdrawalReservationsRepository
import phoenix.payments.support.PaymentsDataGenerator.generatePaymentsConfig
import phoenix.payments.support.PaymentsServiceMock
import phoenix.punters.PunterDataGenerator
import phoenix.punters.PunterDataGenerator.Api.generateCoolOffPeriod
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator._
import phoenix.punters.PunterDataGenerator.generatePunter
import phoenix.punters.PunterDataGenerator.generatePuntersDomainConfig
import phoenix.punters.PunterDataGenerator.generateTermsContent
import phoenix.punters.PunterDataGenerator.generateTermsDayThreshold
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState
import phoenix.punters.PunterState.EndedSession
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext._
import phoenix.punters.PuntersConfig
import phoenix.punters.domain
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.City
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.CoolOffStatus
import phoenix.punters.domain.Country
import phoenix.punters.domain.CurrentTermsVersion
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Email
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.LastName
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.PunterStatus
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.SessionLimitation.Unlimited
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SuspensionEntity.OperatorSuspend
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.punters.domain.Terms
import phoenix.punters.domain.Title
import phoenix.punters.domain.Username
import phoenix.punters.domain.ValidPassword
import phoenix.punters.domain._
import phoenix.punters.exclusion.domain.ExclusionStatus
import phoenix.punters.exclusion.domain.Name
import phoenix.punters.exclusion.support.ExclusionDataGenerator
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.idcomply.support.IdComplyServiceMock
import phoenix.punters.idcomply.support.InMemoryRegistrationEventRepository
import phoenix.punters.infrastructure.PunterJsonFormats._
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.PunterSSNResponse
import phoenix.punters.support.AccountVerificationCodeRepositoryStub
import phoenix.punters.support.EmptyReportsModule
import phoenix.punters.support.InMemoryPunterCoolOffsHistoryRepository
import phoenix.punters.support.InMemoryPunterDeviceFingerprintsRepository
import phoenix.punters.support.InMemoryPunterLimitsHistoryRepository
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.MemorizingTestAuthenticationRepository
import phoenix.punters.support.TermsAndConditionsRepositoryMock
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.punters.support.TestMultiFactorAuthenticationService
import phoenix.support.ConstantUUIDGenerator
import phoenix.support.DataGenerator.randomEnumValue
import phoenix.support.DataGenerator.randomString
import phoenix.support.DataGenerator.randomUserDetailsKeycloak
import phoenix.support.FutureSupport
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generateZipcode
import phoenix.time.FakeHardcodedClock
import phoenix.wallets.WalletTransaction
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.DebitFundsReason
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod
import phoenix.wallets.domain.PaymentMethod._
import phoenix.wallets.domain.ResponsibilityCheckStatus
import phoenix.wallets.infrastructure.http.WalletRoutes

final class BackofficePunterRoutesSpec
    extends RoutesSpecSupport
    with FutureSupport
    with MockFactory
    with GivenWhenThen {
  import BackofficePunterRoutesSpec._

  private val log = LoggerFactory.getLogger(getClass)

  implicit val clock: Clock = new FakeHardcodedClock()
  implicit val jwtAuthenticator: JwtAuthenticator = JwtAuthenticatorMock.jwtAuthenticatorMock()

  private val restRoutesBuilder = new PhoenixRestRoutesBuilder(clock, jwtAuthenticator)
  def dateInTheFuture = clock.currentOffsetDateTime().plusMonths(10)

  "Backoffice punter routes" when {
    "GET /admin/punters" should {
      assertAdminRoleRequired(Get("/admin/punters"))(restRoutesBuilder.buildRoutes())

      "returns 200 OK, returning all users fitting in a page" in {
        val puntersRepository = new InMemoryPuntersRepository()

        awaitRight(puntersRepository.register(BrittaPunter, clock.currentOffsetDateTime()))
        awaitRight(puntersRepository.register(LeonardPunter, clock.currentOffsetDateTime()))

        withAdminToken(Get("/admin/punters")) ~> restRoutesBuilder.buildRoutes(puntersRepository =
          puntersRepository) ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldEqual json"""
            {
              "currentPage": 1,
              "data": [
                {
                  "email": "britta@nicolas.co",
                  "firstName": "Britta",
                  "id": "2a1f4947-9fe9-47b4-9e41-facb8c98c232",
                  "lastName": "Sporer",
                  "username": "britta.sporer",
                  "dateOfBirth": {
                    "day" : 23,
                    "month" : 10,
                    "year" : 1994
                  },
                  "isTestAccount" : false
                },
                {
                  "email": "leonard@schneider.net",
                  "firstName": "Leonard",
                  "id": "9aac83a1-1234-419c-82a5-acd77ec4be31",
                  "lastName": "Kassulke",
                  "username": "leonard.kassulke",
                  "dateOfBirth": {
                    "day" : 28,
                    "month" : 2,
                    "year" : 1986
                  },
                  "isTestAccount" : false
                }
              ],
              "hasNextPage": false,
              "itemsPerPage": 20,
              "totalCount": 2
            }
          """
        }
      }

      "takes filter.punterId into account" in {
        val puntersRepository = new InMemoryPuntersRepository()
        awaitRight(puntersRepository.register(BrittaPunter, clock.currentOffsetDateTime()))
        awaitRight(puntersRepository.register(LeonardPunter, clock.currentOffsetDateTime()))
        val routes = restRoutesBuilder.buildRoutes(puntersRepository = puntersRepository)

        withAdminToken(Get(s"/admin/punters?filter.punterId=${LeonardPunter.punterId.value}")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldEqual LeonardOnlySummariesJson
        }
      }

      "takes filter.username into account" in {
        val puntersRepository = new InMemoryPuntersRepository()
        awaitRight(puntersRepository.register(BrittaPunter, clock.currentOffsetDateTime()))
        awaitRight(puntersRepository.register(LeonardPunter, clock.currentOffsetDateTime()))
        val routes = restRoutesBuilder.buildRoutes(puntersRepository = puntersRepository)

        val formattedUsername = LeonardPunter.details.userName.value
        withAdminToken(Get(s"/admin/punters?filter.username=${formattedUsername}")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldEqual LeonardOnlySummariesJson
        }
      }

      "takes filter.firstName into account" in {
        val puntersRepository = new InMemoryPuntersRepository()
        awaitRight(puntersRepository.register(BrittaPunter, clock.currentOffsetDateTime()))
        awaitRight(puntersRepository.register(LeonardPunter, clock.currentOffsetDateTime()))
        val routes = restRoutesBuilder.buildRoutes(puntersRepository = puntersRepository)

        val formattedFirstName = LeonardPunter.details.name.firstName.value
        withAdminToken(Get(s"/admin/punters?filter.firstName=$formattedFirstName")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldEqual LeonardOnlySummariesJson
        }
      }

      "takes filter.lastName into account" in {
        val puntersRepository = new InMemoryPuntersRepository()
        awaitRight(puntersRepository.register(BrittaPunter, clock.currentOffsetDateTime()))
        awaitRight(puntersRepository.register(LeonardPunter, clock.currentOffsetDateTime()))
        val routes = restRoutesBuilder.buildRoutes(puntersRepository = puntersRepository)

        val formattedLastName = LeonardPunter.details.name.lastName.value
        withAdminToken(Get(s"/admin/punters?filter.lastName=$formattedLastName")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldEqual LeonardOnlySummariesJson
        }
      }

      "takes filter.dateOfBirth into account" in {
        val puntersRepository = new InMemoryPuntersRepository()
        awaitRight(puntersRepository.register(BrittaPunter, clock.currentOffsetDateTime()))
        awaitRight(puntersRepository.register(LeonardPunter, clock.currentOffsetDateTime()))
        val routes = restRoutesBuilder.buildRoutes(puntersRepository = puntersRepository)

        val formattedDate = LeonardPunter.details.dateOfBirth.toLocalDate.toString
        withAdminToken(Get(s"/admin/punters?filter.dateOfBirth=$formattedDate")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldEqual LeonardOnlySummariesJson
        }
      }
    }

    "GET /admin/punters/:punterId" should {
      assertAdminRoleRequired(Get("/admin/punters/123"))(restRoutesBuilder.buildRoutes())

      def routesFor(punterStatus: PunterStatus, coolOffStatus: Option[CoolOffStatus] = None) = {
        val registeredUser = generateRegisteredUserKeycloak()
        val punterProfile = Api
          .withStatus(punterStatus, coolOffStatus)
          .copy(punterId = registeredUser.userId.asPunterId, verifiedAt = Some(clock.currentOffsetDateTime()))

        val punters = new PuntersContextProviderSuccess() {
          override def getPunterProfile(id: PunterId)(implicit ec: ExecutionContext) =
            EitherT.safeRightT[Future, PunterProfileDoesNotExist](punterProfile)
        }
        val wallets = new WalletContextProviderSuccess(clock) {
          override def findResponsibilityCheckStatus(walletId: WalletId)(implicit ec: ExecutionContext) =
            EitherT.safeRightT(ResponsibilityCheckStatus.NoActionNeeded)
        }
        val termsAndConditionsRepository = new TermsAndConditionsRepositoryMock() {
          override def getCurrentTerms() =
            Future(Terms(CurrentTermsVersion(5), generateTermsContent(), generateTermsDayThreshold()))
        }
        val authenticationRepository = new TestAuthenticationRepository() {
          override def findUser(userId: UserLookupId) = Future.successful(Some(registeredUser))
        }
        val punter = generatePunterWithSSN(punterId = PunterId("123"))
        val puntersRepository = new InMemoryPuntersRepository()
        puntersRepository.startPunterRegistration(punter, clock.currentOffsetDateTime())

        restRoutesBuilder.buildRoutes(
          punters = punters,
          wallets = wallets,
          authenticationRepository = authenticationRepository,
          puntersRepository = puntersRepository,
          termsAndConditionsRepository = termsAndConditionsRepository)
      }

      "returns 200 OK when punter is present" in {
        def havingUnlimitedCurrentLimit(limits: Json): Assertion = {
          limits shouldHaveField ("current", { current =>
            current shouldHaveField ("limit", _ should be(Json.Null))
            current shouldHaveField ("since", jsonFieldOfType[String])
          })
        }

        def havingCurrentAndNextLimit(limits: Json): Assertion = {
          limits shouldHaveField ("current", { current =>
            current shouldHaveField ("limit", jsonFieldOfType[Json])
            current shouldHaveField ("since", jsonFieldOfType[OffsetDateTime])
          })
          limits shouldHaveField ("next", { next =>
            next shouldHaveField ("limit", jsonFieldOfType[Json])
            next shouldHaveField ("since", jsonFieldOfType[OffsetDateTime])
          })
        }

        val routes = routesFor(PunterStatus.Active)

        withAdminToken(Get("/admin/punters/123")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          val response = responseAs[Json]
          response shouldHaveField ("richStatus", (_ shouldHaveField ("status", jsonFieldOfTypeContaining("ACTIVE"))))

          And("The response should have the specific expected fields, and no more")
          response.asObject.map(_.keys.toList.sorted).getOrElse(List()) should contain theSameElementsAs List(
            "userId",
            "username",
            "name",
            "address",
            "email",
            "phoneNumber",
            "dateOfBirth",
            "gender",
            "twoFactorAuthEnabled",
            "depositLimits",
            "stakeLimits",
            "sessionLimits",
            "communicationPreferences",
            "bettingPreferences",
            "status",
            "coolOff",
            "richStatus",
            "terms",
            "hasToAcceptTerms",
            "signUpDate",
            "lastSignIn",
            "hasToAcceptResponsibilityCheck",
            "ssn",
            "verifiedAt",
            "isTestAccount").sorted

          And("The response should match the expected format")
          response shouldHaveField ("lastSignIn", jsonFieldOfType[String])
          response shouldHaveField ("userId", jsonFieldOfType[String])
          response shouldHaveField ("signUpDate", jsonFieldOfType[String])
          response shouldHaveField ("username", jsonFieldOfType[String])
          response shouldHaveField ("name", { name =>
            name shouldHaveField ("title", jsonFieldOfType[String])
            name shouldHaveField ("firstName", jsonFieldOfType[String])
            name shouldHaveField ("lastName", jsonFieldOfType[String])
          })
          response shouldHaveField ("address", { address =>
            address shouldHaveField ("addressLine", jsonFieldOfType[String])
            address shouldHaveField ("city", jsonFieldOfType[String])
            address shouldHaveField ("state", jsonFieldOfType[String])
            address shouldHaveField ("zipcode", jsonFieldOfType[String])
            address shouldHaveField ("country", jsonFieldOfType[String])
          })
          response shouldHaveField ("email", jsonFieldOfType[String])
          response shouldHaveField ("phoneNumber", jsonFieldOfType[String])
          response shouldHaveField ("dateOfBirth", { dateOfBirth =>
            dateOfBirth shouldHaveField ("day", jsonFieldOfType[Int])
            dateOfBirth shouldHaveField ("month", jsonFieldOfType[Int])
            dateOfBirth shouldHaveField ("year", jsonFieldOfType[Int])
          })
          response shouldHaveField ("depositLimits", { depositLimits =>
            depositLimits shouldHaveField ("daily", havingUnlimitedCurrentLimit)
            depositLimits shouldHaveField ("weekly", havingUnlimitedCurrentLimit)
            depositLimits shouldHaveField ("monthly", havingUnlimitedCurrentLimit)
          })
          response shouldHaveField ("stakeLimits", { stakeLimits =>
            stakeLimits shouldHaveField ("daily", havingUnlimitedCurrentLimit)
            stakeLimits shouldHaveField ("weekly", havingUnlimitedCurrentLimit)
            stakeLimits shouldHaveField ("monthly", havingUnlimitedCurrentLimit)
          })
          response shouldHaveField ("sessionLimits", { sessionLimits =>
            sessionLimits shouldHaveField ("daily", havingCurrentAndNextLimit)
            sessionLimits shouldHaveField ("weekly", havingCurrentAndNextLimit)
            sessionLimits shouldHaveField ("monthly", havingCurrentAndNextLimit)
          })
          response shouldHaveField ("communicationPreferences", { communicationPreferences =>
            communicationPreferences shouldHaveField ("announcements", jsonFieldOfType[Boolean])
            communicationPreferences shouldHaveField ("promotions", jsonFieldOfType[Boolean])
            communicationPreferences shouldHaveField ("subscriptionUpdates", jsonFieldOfType[Boolean])
          })
          response shouldHaveField ("bettingPreferences", { bettingPreferences =>
            bettingPreferences shouldHaveField ("autoAcceptBetterOdds", jsonFieldOfType[Boolean])
          })
          response shouldHaveField ("status", jsonFieldOfType[String])
          response shouldHaveField ("coolOff", _ shouldBe Json.Null)
          response shouldHaveField ("terms", { terms =>
            terms shouldHaveField ("version", jsonFieldOfType[Int])
            terms shouldHaveField ("acceptedAt", jsonFieldOfType[String])
          })
          response shouldHaveField ("hasToAcceptTerms", jsonFieldOfType[Boolean])
          response shouldHaveField ("hasToAcceptResponsibilityCheck", jsonFieldOfTypeContaining[Boolean](false))
          response shouldHaveField ("isTestAccount", jsonFieldOfType[Boolean])
        }
      }

      "returns a reason for suspension if punter was suspended" in {

        val routes = routesFor(PunterStatus.Suspended(OperatorSuspend("wacky suspension reason")))

        withAdminToken(Get("/admin/punters/123")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldHaveField ("richStatus", { richStatus =>
            richStatus shouldHaveField ("status", jsonFieldOfTypeContaining("SUSPENDED"))
            richStatus shouldHaveField ("reason", jsonFieldOfTypeContaining("wacky suspension reason"))
          })
        }
      }

      "returns a reason for coolOff if punter is in cool off" in {

        val coolOffStatus = Some(CoolOffStatus(generateCoolOffPeriod(), randomEnumValue[CoolOffCause]()))
        val routes = routesFor(PunterStatus.InCoolOff, coolOffStatus)

        withAdminToken(Get("/admin/punters/123")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK

          responseAs[Json] shouldHaveField ("coolOff", { coolOff =>
            coolOff shouldHaveField ("period", { period =>
              period shouldHaveField ("startTime", jsonFieldOfType[String])
              period shouldHaveField ("endTime", jsonFieldOfType[String])
            })
            coolOff shouldHaveField ("cause", jsonFieldOfType[String])
          })
        }
      }

      "quote insufficient funds as a reason for suspension if that is the case" in {

        val routes = routesFor(PunterStatus.Suspended(OperatorSuspend("bad boi")))

        withAdminToken(Get("/admin/punters/123")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldHaveField ("richStatus", { richStatus =>
            richStatus shouldHaveField ("status", jsonFieldOfTypeContaining("SUSPENDED"))
            richStatus shouldHaveField ("reason", jsonFieldOfTypeContaining("bad boi"))
          })
        }
      }

      "quote registration issue details reason for suspension if that is the case" in {

        val routes = routesFor(PunterStatus.Suspended(RegistrationIssue("nasti nasti boi")))

        withAdminToken(Get("/admin/punters/123")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldHaveField ("richStatus", { richStatus =>
            richStatus shouldHaveField ("status", jsonFieldOfTypeContaining("SUSPENDED"))
            richStatus shouldHaveField ("reason", jsonFieldOfTypeContaining("nasti nasti boi"))
          })
        }
      }
    }

    "POST /admin/punters/:punterid/detail/address" should {
      val registeredUser = generateRegisteredUserKeycloak()
      val punterId = registeredUser.userId.asPunterId
      val endpoint = s"/admin/punters/${punterId.value}/detail/address"

      val authenticationRepository = new TestAuthenticationRepository() {
        override def findUser(userId: UserLookupId) = {
          Future.successful(Some(registeredUser))
        }
      }

      val punter = generatePunterWithSSN(punterId = punterId)

      val puntersRepository: PuntersRepository = new InMemoryPuntersRepository()
      awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))

      val routes = restRoutesBuilder.buildRoutes(
        puntersRepository = puntersRepository,
        authenticationRepository = authenticationRepository)

      val newZipcode = generateZipcode().unsafe()
      val jsonBody = json"""{"address": {
          "addressLine": "Made Up Road Unit F4B, 1255",
          "city": "Forth Worth",
          "state": "TX",
          "zipcode": ${newZipcode.value},
          "country": "US" }
        }"""

      assertAdminRoleRequired(Post(endpoint, jsonBody))(routes)

      "return 204 NoContent when the punter has changed address" in {
        withAdminToken(Post(endpoint, jsonBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
        }
        val newAddressExpected = Address(
          AddressLine("Made Up Road Unit F4B, 1255").unsafe(),
          City("Forth Worth").unsafe(),
          State("TX").unsafe(),
          newZipcode,
          Country("US").unsafe())
        val newAddressPhoenix = await(puntersRepository.findByPunterId(punterId).value).get.details.address

        newAddressPhoenix shouldEqual newAddressExpected
      }

      "return 400 BadRequest when the punter does not exists" in {
        withAdminToken(
          Post(s"/admin/punters/${generatePunterId().value}/detail/address", jsonBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }
    }

    "POST /admin/punters/:punterid/detail/dob" should {
      val authenticationRepository = new MemorizingTestAuthenticationRepository()
      val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
      val punters = new PuntersContextProviderSuccess() {
        private var profile = examplePunterProfile.copy(status = PunterStatus.Active)
        override def beginSelfExclusion(id: PunterId, selfExclusionOrigin: PunterState.SelfExclusionOrigin)(implicit
            ec: ExecutionContext): EitherT[Future, PunterSelfExclusionError, Unit] = {
          profile = profile.copy(status = PunterStatus.SelfExcluded)
          super.beginSelfExclusion(id, selfExclusionOrigin)
        }
        override def getPunterProfile(id: PunterId)(implicit
            ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] =
          EitherT.safeRightT(profile)
      }

      val userDetails = randomUserDetailsKeycloak()
      val punterId = await(authenticationRepository.register(userDetails, ValidPassword("test")))

      val punter = generatePunterWithSSN(punterId = punterId)

      val puntersRepository: PuntersRepository = new InMemoryPuntersRepository()
      awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))

      val endpoint = s"/admin/punters/${punterId.value}/detail/dob"
      val routes = restRoutesBuilder.buildRoutes(
        puntersRepository = puntersRepository,
        authenticationRepository = authenticationRepository,
        excludedPlayersRepository = excludedPlayersRepository,
        punters = punters)

      val dobJson =
        json"""{"dateOfBirth": {
                    "day": 15,
                    "month": 1,
                    "year": 2001 }
                }"""

      assertAdminRoleRequired(Post(endpoint, dobJson))(routes)

      "return 204 NoContent when the punter has changed DOB" in {
        withAdminToken(Post(endpoint, dobJson)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
        }
        val newDob = await(puntersRepository.findByPunterId(punterId).value).get.details.dateOfBirth
        newDob shouldEqual DateOfBirth(15, 1, 2001)

        authenticationRepository.signOutUpdates.exists(_ == punterId) should ===(true)
      }

      "return 400 BadRequest when the punter does not exists" in {
        withAdminToken(Post(s"/admin/punters/${generatePunterId().value}/detail/dob", dobJson)) ~> routes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }

      "self exclude punter if new date of birth is on the self exclusion list" in {
        await(
          excludedPlayersRepository.upsert(
            ExclusionDataGenerator
              .generateExcludedPlayer(ExclusionStatus.Active)
              .copy(
                dateOfBirth = DateOfBirth(15, 1, 2001).toLocalDate,
                name = Name(punter.details.name.firstName.value, None, punter.details.name.lastName.value))))

        withAdminToken(Post(endpoint, dobJson)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
        }

        val newDob = await(puntersRepository.findByPunterId(punterId).value).get.details.dateOfBirth
        newDob shouldEqual DateOfBirth(15, 1, 2001)

        awaitRight(punters.getPunterProfile(punterId)).status should ===(PunterStatus.SelfExcluded)
      }
    }

    "POST /admin/punters/:punterid/detail/personal-name" should {
      val authenticationRepository = new MemorizingTestAuthenticationRepository()
      val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
      val punters = new PuntersContextProviderSuccess() {

        private var profile = examplePunterProfile.copy(status = PunterStatus.Active)

        override def beginSelfExclusion(id: PunterId, selfExclusionOrigin: PunterState.SelfExclusionOrigin)(implicit
            ec: ExecutionContext): EitherT[Future, PunterSelfExclusionError, Unit] = {
          profile = profile.copy(status = PunterStatus.SelfExcluded)
          super.beginSelfExclusion(id, selfExclusionOrigin)
        }

        override def getPunterProfile(id: PunterId)(implicit
            ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] =
          EitherT.safeRightT(profile)
      }

      val userDetails = randomUserDetailsKeycloak()
      val punterId = await(authenticationRepository.register(userDetails, ValidPassword("test")))
      val endpoint = s"/admin/punters/${punterId.value}/detail/personal-name"

      val punter = generatePunterWithSSN(punterId = punterId)

      val puntersRepository: PuntersRepository = new InMemoryPuntersRepository()
      awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))

      val routes = restRoutesBuilder.buildRoutes(
        puntersRepository = puntersRepository,
        authenticationRepository = authenticationRepository,
        excludedPlayersRepository = excludedPlayersRepository,
        punters = punters)

      val randomLastname = randomString()
      val jsonBody =
        json"""{"personalName": {
                  "title": "Mr",
                  "firstName": "FirstName123",
                  "lastName": $randomLastname}
                }"""

      assertAdminRoleRequired(Post(endpoint, jsonBody))(routes)

      "return 204 NoContent when the punter has changed name" in {
        withAdminToken(Post(endpoint, jsonBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
        }
        val expectedName =
          PersonalName(Title("Mr").unsafe(), FirstName("FirstName123").unsafe(), LastName(randomLastname).unsafe())

        val newPersonalName = await(puntersRepository.findByPunterId(punterId).value).get.details.name
        newPersonalName shouldEqual expectedName

        authenticationRepository.signOutUpdates.exists(_ == punterId) should ===(true)
      }

      "return 400 BadRequest when the punter does not exists" in {
        withAdminToken(
          Post(s"/admin/punters/${generatePunterId().value}/detail/personal-name", jsonBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }

      "self exclude punter if new name is on the self exclusion list" in {
        await(
          excludedPlayersRepository.upsert(
            ExclusionDataGenerator
              .generateExcludedPlayer(ExclusionStatus.Active)
              .copy(
                dateOfBirth = punter.details.dateOfBirth.toLocalDate,
                name = Name("FirstName123", None, randomLastname))))

        withAdminToken(Post(endpoint, jsonBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
        }
        val expectedName =
          PersonalName(Title("Mr").unsafe(), FirstName("FirstName123").unsafe(), LastName(randomLastname).unsafe())

        val newPersonalName = await(puntersRepository.findByPunterId(punterId).value).get.details.name
        newPersonalName shouldEqual expectedName

        awaitRight(punters.getPunterProfile(punterId)).status should ===(PunterStatus.SelfExcluded)
      }
    }

    "GET /admin/punters/:punterId/session-history" should {
      assertAdminRoleRequired(Get("/admin/punters/123/session-history"))(restRoutesBuilder.buildRoutes())

      "returns 200 OK when the punter only has an ended session" in {
        val punters = new PuntersContextProviderSuccess() {
          override def getPunterProfile(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
            EitherT.safeRightT[Future, PunterProfileDoesNotExist] {
              examplePunterProfile.copy(
                endedSessions = List(
                  domain.EndedSession(
                    SessionId("321"),
                    startedAt = OffsetDateTime.parse("2021-01-18T11:51:28Z"),
                    endedAt = OffsetDateTime.parse("2021-01-18T12:51:28Z"))),
                maybeCurrentSession = None)
            }
          }
        }
        val routes = restRoutesBuilder.buildRoutes(punters = punters)

        val PunterSessionHistoryJson =
          parse(s"""
          {
            "currentPage": 1,
            "data": [{
              "endTime":"2021-01-18T12:51:28Z",
              "punterId":"123",
              "sessionId":"321",
              "startTime":"2021-01-18T11:51:28Z"
            }],
            "hasNextPage": false,
            "itemsPerPage": 20,
            "totalCount": 1
          }
          """)

        withAdminToken(Get("/admin/punters/123/session-history")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldEqual PunterSessionHistoryJson
        }
      }

      "returns 200 OK when the punter only has an active session" in {
        val punters = new PuntersContextProviderSuccess() {
          override def getPunterProfile(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
            EitherT.safeRightT[Future, PunterProfileDoesNotExist] {
              examplePunterProfile.copy(
                endedSessions = List(),
                maybeCurrentSession = Some(
                  StartedSession(
                    SessionId("321"),
                    startedAt = OffsetDateTime.parse("2021-01-18T11:51:28Z"),
                    ipAddress = None)))
            }
          }
        }
        val routes = restRoutesBuilder.buildRoutes(punters = punters)

        val PunterSessionHistoryJson =
          parse(s"""
          {
            "currentPage": 1,
            "data": [{
              "punterId":"123",
              "sessionId":"321",
              "startTime":"2021-01-18T11:51:28Z"
            }],
            "hasNextPage": false,
            "itemsPerPage": 20,
            "totalCount": 1
          }
          """)

        withAdminToken(Get("/admin/punters/123/session-history")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldEqual PunterSessionHistoryJson
        }
      }

      "returns 200 OK when the punter has active and ended sessions" in {
        val punters = new PuntersContextProviderSuccess() {
          override def getPunterProfile(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
            EitherT.safeRightT[Future, PunterProfileDoesNotExist] {
              examplePunterProfile.copy(
                endedSessions = List(
                  domain.EndedSession(
                    SessionId("1"),
                    startedAt = OffsetDateTime.parse("2021-01-18T11:00:00Z"),
                    endedAt = OffsetDateTime.parse("2021-01-18T11:10:00Z")),
                  domain.EndedSession(
                    SessionId("2"),
                    startedAt = OffsetDateTime.parse("2021-01-19T12:15:12Z"),
                    endedAt = OffsetDateTime.parse("2021-01-19T12:45:31Z"))),
                maybeCurrentSession = Some(
                  StartedSession(
                    SessionId("3"),
                    startedAt = OffsetDateTime.parse("2021-01-21T23:33:54Z"),
                    ipAddress = None)))
            }
          }
        }
        val routes = restRoutesBuilder.buildRoutes(punters = punters)

        val PunterSessionHistoryJson =
          parse(s"""
          {
            "currentPage": 1,
            "data": [
              {
                "punterId":"123",
                "sessionId":"3",
                "startTime":"2021-01-21T23:33:54Z"
              },
              {
                "endTime":"2021-01-19T12:45:31Z",
                "punterId":"123",
                "sessionId":"2",
                "startTime":"2021-01-19T12:15:12Z"
              },
              {
                "endTime":"2021-01-18T11:10:00Z",
                "punterId":"123",
                "sessionId":"1",
                "startTime":"2021-01-18T11:00:00Z"
              }
            ],
            "hasNextPage": false,
            "itemsPerPage": 20,
            "totalCount": 3
          }
          """)

        withAdminToken(Get("/admin/punters/123/session-history")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldEqual PunterSessionHistoryJson
        }
      }

      "returns 200 and paginate results" in {
        Given("a punter profile with ended and active sessions")
        val punters = new PuntersContextProviderSuccess() {
          override def getPunterProfile(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] = {
            EitherT.safeRightT[Future, PunterProfileDoesNotExist] {
              examplePunterProfile.copy(
                endedSessions = List(
                  domain.EndedSession(
                    SessionId("1"),
                    startedAt = OffsetDateTime.parse("2021-01-18T11:00:00Z"),
                    endedAt = OffsetDateTime.parse("2021-01-18T11:10:00Z")),
                  domain.EndedSession(
                    SessionId("2"),
                    startedAt = OffsetDateTime.parse("2021-01-19T12:15:12Z"),
                    endedAt = OffsetDateTime.parse("2021-01-19T12:45:31Z")),
                  domain.EndedSession(
                    SessionId("3"),
                    startedAt = OffsetDateTime.parse("2021-01-20T12:15:12Z"),
                    endedAt = OffsetDateTime.parse("2021-01-20T12:45:31Z")),
                  domain.EndedSession(
                    SessionId("4"),
                    startedAt = OffsetDateTime.parse("2021-01-21T12:15:12Z"),
                    endedAt = OffsetDateTime.parse("2021-01-21T12:45:31Z"))),
                maybeCurrentSession = Some(
                  StartedSession(
                    SessionId("5"),
                    startedAt = OffsetDateTime.parse("2021-01-22T23:33:54Z"),
                    ipAddress = None)))
            }
          }
        }
        val routes = restRoutesBuilder.buildRoutes(punters = punters)

        When("we get the first page of the session history")
        withAdminToken(
          Get(
            "/admin/punters/123/session-history?pagination.currentPage=1&pagination.itemsPerPage=2")) ~> routes ~> check {
          Then("we should get the most recent sessions, including the active one")
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldEqual parse(s"""
              {
                "currentPage": 1,
                "data": [
                  {
                    "punterId":"123",
                    "sessionId":"5",
                    "startTime":"2021-01-22T23:33:54Z"
                  },
                  {
                    "endTime":"2021-01-21T12:45:31Z",
                    "punterId":"123",
                    "sessionId":"4",
                    "startTime":"2021-01-21T12:15:12Z"
                  }
                ],
                "hasNextPage": true,
                "itemsPerPage": 2,
                "totalCount": 5
              }
              """)
        }

        When("we get the second page of the session history")
        withAdminToken(
          Get(
            "/admin/punters/123/session-history?pagination.currentPage=2&pagination.itemsPerPage=2")) ~> routes ~> check {
          Then("we should skip the most recent sessions and get the next ones")
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldEqual parse(s"""
            {
              "currentPage": 2,
              "data": [
                {
                  "endTime":"2021-01-20T12:45:31Z",
                  "punterId":"123",
                  "sessionId":"3",
                  "startTime":"2021-01-20T12:15:12Z"
                },
                {
                  "endTime":"2021-01-19T12:45:31Z",
                  "punterId":"123",
                  "sessionId":"2",
                  "startTime":"2021-01-19T12:15:12Z"
                }
              ],
              "hasNextPage": true,
              "itemsPerPage": 2,
              "totalCount": 5
            }
            """)
        }

        When("we get the third and last page of the session history")
        withAdminToken(
          Get(
            "/admin/punters/123/session-history?pagination.currentPage=3&pagination.itemsPerPage=2")) ~> routes ~> check {
          Then("we should get only the last session, as we skip the other ones due to pagination")
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldEqual parse(s"""
            {
              "currentPage": 3,
              "data": [
                {
                  "endTime":"2021-01-18T11:10:00Z",
                  "punterId":"123",
                  "sessionId":"1",
                  "startTime":"2021-01-18T11:00:00Z"
                }
              ],
              "hasNextPage": false,
              "itemsPerPage": 2,
              "totalCount": 5
            }
            """)
        }
      }

      "returns 404 on missing punter profile" in {
        withAdminToken(Get("/admin/punters/321/session-history")) ~> buildRoutesFailure() ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }
    }

    "GET /admin/punters/:punterId/limits-history" should {
      val puntersRepository = new InMemoryPuntersRepository()
      val limitsHistoryRepository = new InMemoryPunterLimitsHistoryRepository()
      val now = clock.currentOffsetDateTime()
      val offsetDateTimeFormatter = DateTimeFormatter.ISO_OFFSET_DATE_TIME

      val expectedLimitChanges = PunterDataGenerator.generateLimitChanges(8)
      expectedLimitChanges.foreach { limitChange => await(limitsHistoryRepository.insert(limitChange)) }

      val punterId = expectedLimitChanges.head.punterId
      val punter = generatePunter().copy(punterId = punterId)
      awaitRight(puntersRepository.register(punter, now))

      val testRoute = restRoutesBuilder.buildRoutes(
        puntersRepository = puntersRepository,
        punterLimitsHistoryRepository = limitsHistoryRepository)
      assertAdminRoleRequired(Get(s"/admin/punters/${punterId.value}/limits-history"))(testRoute)

      "return 200 OK" in {
        val punterLimitsHistoryJson =
          parse(s"""
          {
            "data" : [
              {
                "punterId" : "${expectedLimitChanges(7).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(7).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(7).period)}",
                "limit" : "${expectedLimitChanges(7).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(7).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(7).requestedAt)}",
                "id" : 8
              },
              {
                "punterId" : "${expectedLimitChanges(6).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(6).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(6).period)}",
                "limit" : "${expectedLimitChanges(6).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(6).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(6).requestedAt)}",
                "id" : 7
              },
              {
                "punterId" : "${expectedLimitChanges(5).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(5).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(5).period)}",
                "limit" : "${expectedLimitChanges(5).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(5).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(5).requestedAt)}",
                "id" : 6
              },
              {
                "punterId" : "${expectedLimitChanges(4).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(4).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(4).period)}",
                "limit" : "${expectedLimitChanges(4).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(4).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(4).requestedAt)}",
                "id" : 5
              },
              {
                "punterId" : "${expectedLimitChanges(3).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(3).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(3).period)}",
                "limit" : "${expectedLimitChanges(3).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(3).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(3).requestedAt)}",
                "id" : 4
              },
              {
                "punterId" : "${expectedLimitChanges(2).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(2).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(2).period)}",
                "limit" : "${expectedLimitChanges(2).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(2).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(2).requestedAt)}",
                "id" : 3
              },
              {
                "punterId" : "${expectedLimitChanges(1).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(1).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(1).period)}",
                "limit" : "${expectedLimitChanges(1).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(1).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(1).requestedAt)}",
                "id" : 2
              },
              {
                "punterId" : "${expectedLimitChanges(0).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(0).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(0).period)}",
                "limit" : "${expectedLimitChanges(0).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(0).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(0).requestedAt)}",
                "id" : 1
              }
            ],
            "currentPage" : 1,
            "itemsPerPage" : 20,
            "totalCount" : 8,
            "hasNextPage" : false
          }
          """)

        withAdminToken(Get(s"/admin/punters/${punterId.value}/limits-history")) ~> testRoute ~> check {
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldEqual punterLimitsHistoryJson
        }
      }

      "return 200 and paginate results" in {
        Given("a punter profile with limit changes")

        When("we get the first page of the limit changes history")
        withAdminToken(Get(
          s"/admin/punters/${punterId.value}/limits-history?pagination.currentPage=1&pagination.itemsPerPage=4")) ~> testRoute ~> check {
          Then("we should get the most recent limit changes")
          status shouldEqual StatusCodes.OK

          val expectedJson = parse(s"""
            {
            "data" : [
              {
                "punterId" : "${expectedLimitChanges(7).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(7).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(7).period)}",
                "limit" : "${expectedLimitChanges(7).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(7).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(7).requestedAt)}",
                "id" : 8
              },
              {
                "punterId" : "${expectedLimitChanges(6).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(6).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(6).period)}",
                "limit" : "${expectedLimitChanges(6).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(6).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(6).requestedAt)}",
                "id" : 7
              },
              {
                "punterId" : "${expectedLimitChanges(5).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(5).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(5).period)}",
                "limit" : "${expectedLimitChanges(5).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(5).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(5).requestedAt)}",
                "id" : 6
              },
              {
                "punterId" : "${expectedLimitChanges(4).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(4).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(4).period)}",
                "limit" : "${expectedLimitChanges(4).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(4).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(4).requestedAt)}",
                "id" : 5
              }
            ],
            "currentPage" : 1,
            "itemsPerPage" : 4,
            "totalCount" : 8,
            "hasNextPage" : true
          }
          """)

          if (Right(responseAs[Json]) != expectedJson) {
            // TODO (PHXD-3055): how come is it possible that `ISO_OFFSET_DATE_TIME.format(...)` leaves trailing zeros
            //  in the part after the decimal point? Let's use this data to debug
            log.warn(
              "offsetDateTimeFormatter.format(expectedLimitChanges(7).effectiveFrom) = " + offsetDateTimeFormatter
                .format(expectedLimitChanges(7).effectiveFrom))
            log.warn("responseAs[Json].data[0].effectiveFrom = " + responseAs[Json].\\("data").head.\\("effectiveFrom"))
            log.warn("expectedJson.data[0].effectiveFrom = " + responseAs[Json].\\("data").head.\\("effectiveFrom"))
            for (i <- 4 to 7) {
              log.warn(
                s"expectedLimitChanges($i).effectiveFrom.getNano = " + expectedLimitChanges(i).effectiveFrom.getNano)
            }
            Right(responseAs[Json]) shouldEqual expectedJson
          }
        }

        When("we get the second page of the limit changes history")
        withAdminToken(Get(
          s"/admin/punters/${punterId.value}/limits-history?pagination.currentPage=2&pagination.itemsPerPage=4")) ~> testRoute ~> check {
          Then("we should skip the most recent limit changes and get the next ones")
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldEqual parse(s"""
            {
            "data" : [
              {
                "punterId" : "${expectedLimitChanges(3).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(3).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(3).period)}",
                "limit" : "${expectedLimitChanges(3).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(3).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(3).requestedAt)}",
                "id" : 4
              },
              {
                "punterId" : "${expectedLimitChanges(2).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(2).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(2).period)}",
                "limit" : "${expectedLimitChanges(2).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(2).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(2).requestedAt)}",
                "id" : 3
              },
              {
                "punterId" : "${expectedLimitChanges(1).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(1).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(1).period)}",
                "limit" : "${expectedLimitChanges(1).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(1).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(1).requestedAt)}",
                "id" : 2
              },
              {
                "punterId" : "${expectedLimitChanges(0).punterId.value}",
                "limitType" : "${getLimitTypeRawString(expectedLimitChanges(0).limitType)}",
                "period" : "${getLimitPeriodRawString(expectedLimitChanges(0).period)}",
                "limit" : "${expectedLimitChanges(0).limit}",
                "effectiveFrom" : "${offsetDateTimeFormatter.format(expectedLimitChanges(0).effectiveFrom)}",
                "requestedAt" : "${offsetDateTimeFormatter.format(expectedLimitChanges(0).requestedAt)}",
                "id" : 1
              }
            ],
            "currentPage" : 2,
            "itemsPerPage" : 4,
            "totalCount" : 8,
            "hasNextPage" : false
          }
          """)
        }
      }

      "return 404 on missing punter profile" in {
        withAdminToken(Get(s"/admin/punters/${punterId.value}/limits-history")) ~> buildRoutesFailure() ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }
    }

    "GET /admin/punters/:punterId/cool-offs-history" should {
      val puntersRepository = new InMemoryPuntersRepository()
      val coolOffsHistoryRepository = new InMemoryPunterCoolOffsHistoryRepository()
      val now = clock.currentOffsetDateTime()
      val offsetDateTimeFormatter = DateTimeFormatter.ISO_OFFSET_DATE_TIME

      val expectedCoolOffs = PunterDataGenerator.generateCoolOffs(8)
      expectedCoolOffs.foreach { coolOff => await(coolOffsHistoryRepository.insert(coolOff)) }

      val punterId = expectedCoolOffs.head.punterId
      val punter = generatePunter().copy(punterId = punterId)
      awaitRight(puntersRepository.register(punter, now))

      val testRoute = restRoutesBuilder.buildRoutes(
        puntersRepository = puntersRepository,
        punterCoolOffsHistoryRepository = coolOffsHistoryRepository)
      assertAdminRoleRequired(Get(s"/admin/punters/${punterId.value}/cool-offs-history"))(testRoute)

      "return 200 OK" in {
        val punterCoolOffsHistoryJson =
          json"""
            {
              "data" : [
                {
                  "punterId": ${expectedCoolOffs(7).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(7).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(7).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(7).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(6).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(6).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(6).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(6).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(5).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(5).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(5).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(5).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(4).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(4).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(4).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(4).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(3).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(3).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(3).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(3).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(2).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(2).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(2).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(2).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(1).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(1).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(1).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(1).coolOffCause.entryName}
                },
                {
                  "punterId": ${expectedCoolOffs(0).punterId.value},
                  "coolOffStart": ${offsetDateTimeFormatter.format(expectedCoolOffs(0).coolOffStart)},
                  "coolOffEnd": ${offsetDateTimeFormatter.format(expectedCoolOffs(0).coolOffEnd)},
                  "coolOffCause": ${expectedCoolOffs(0).coolOffCause.entryName}
                }
            ],
            "currentPage": 1,
            "itemsPerPage": 20,
            "totalCount": 8,
            "hasNextPage": false
          }
          """

        withAdminToken(Get(s"/admin/punters/${punterId.value}/cool-offs-history")) ~> testRoute ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldEqual punterCoolOffsHistoryJson
        }
      }

      "return 404 on missing punter profile" in {
        withAdminToken(Get(s"/admin/punters/${punterId.value}/cool-offs-history")) ~> buildRoutesFailure() ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }
    }

    "POST /admin/punters/:punterId/lifecycle/suspend" should {
      val suspendPunterRequest = """{"entity":"OPERATOR_SUSPEND","details":"Punter go bye bye"}"""

      assertAdminRoleRequired(Post("/admin/punters/123/lifecycle/suspend", suspendPunterRequest))(
        restRoutesBuilder.buildRoutes())

      "returns 204 NoContent on successful suspend action" in {
        val puntersBoundedContext = new MemorizedTestPuntersContext()
        val underTest = restRoutesBuilder.buildRoutes(punters = puntersBoundedContext)

        val punterId = Api.generatePunterId()
        withAdminToken(
          Post(s"/admin/punters/${punterId.value}/lifecycle/suspend", suspendPunterRequest)) ~> underTest ~> check {
          status shouldEqual StatusCodes.NoContent
        }
        puntersBoundedContext.suspensions.get().size shouldBe 1
        puntersBoundedContext.suspensions.get() shouldBe List(
          (punterId, OperatorSuspend("Punter go bye bye"), clock.currentOffsetDateTime()))

        puntersBoundedContext.endSessions.get() shouldBe List(punterId)
      }

      "suspend should trigger logout before suspension" in {
        val punterId = Api.generatePunterId()
        val puntersBoundedContext = mock[PuntersBoundedContext]
        val underTest = restRoutesBuilder.buildRoutes(punters = puntersBoundedContext)

        inSequence {
          (puntersBoundedContext
            .endSession(_: PunterId)(_: ExecutionContext))
            .expects(*, *)
            .returns(
              EitherT.safeRightT(
                EndedSession(
                  SessionId(punterId.value),
                  clock.currentOffsetDateTime(),
                  clock.currentOffsetDateTime(),
                  Unlimited(dateInTheFuture))))
          (puntersBoundedContext
            .suspend(_: PunterId, _: SuspensionEntity, _: OffsetDateTime)(_: ExecutionContext))
            .expects(*, *, *, *)
            .returns(EitherT.safeRightT(()))
        }

        withAdminToken(
          Post(s"/admin/punters/${punterId.value}/lifecycle/suspend", suspendPunterRequest)) ~> underTest ~> check {
          status shouldEqual StatusCodes.NoContent
        }
      }

      "suspend should not fail if punter not logged in" in {
        val punterId = Api.generatePunterId()
        val puntersBoundedContext = mock[PuntersBoundedContext]
        val underTest = restRoutesBuilder.buildRoutes(punters = puntersBoundedContext)

        inSequence {
          (puntersBoundedContext
            .endSession(_: PunterId)(_: ExecutionContext))
            .expects(*, *)
            .returns(EitherT.leftT(SessionNotFound))
          (puntersBoundedContext
            .suspend(_: PunterId, _: SuspensionEntity, _: OffsetDateTime)(_: ExecutionContext))
            .expects(*, *, *, *)
            .returns(EitherT.safeRightT(()))
        }

        withAdminToken(
          Post(s"/admin/punters/${punterId.value}/lifecycle/suspend", suspendPunterRequest)) ~> underTest ~> check {
          status shouldEqual StatusCodes.NoContent
        }
      }

      "returns 404 on missing punter profile" in {
        val underTest = restRoutesBuilder.buildRoutes(punters =
          stubSuspend(EitherT.leftT(PunterProfileDoesNotExist(PunterId("123")))))

        withAdminToken(Post("/admin/punters/123/lifecycle/suspend", suspendPunterRequest)) ~> underTest ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

      "returns 400 if already not suspended" in {
        val underTest = restRoutesBuilder.buildRoutes(punters =
          stubSuspend(EitherT.leftT(PunterAlreadySuspendedError(PunterId("123")))))

        withAdminToken(Post("/admin/punters/123/lifecycle/suspend", suspendPunterRequest)) ~> underTest ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }
    }

    "POST /admin/punters/:punterId/lifecycle/unsuspend" should {
      val puntersRepository = new InMemoryPuntersRepository()
      val punter =
        generatePunterWithSSN(punterId = PunterId("123"), ssn = FullSSN.fromRawStringUnsafe("987654321"))
      awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))

      val unsuspendPunterRequest = """{"entity": "OPERATOR_UNSUSPEND"}"""
      assertAdminRoleRequired(Post("/admin/punters/123/lifecycle/unsuspend", unsuspendPunterRequest))(
        restRoutesBuilder.buildRoutes())

      "returns 202 Accepted on successfully receiving an unsuspend action" in {
        val underTest = restRoutesBuilder.buildRoutes(
          punters = stubUnsuspend(EitherT.safeRightT(())),
          puntersRepository = puntersRepository)

        withAdminToken(Post("/admin/punters/123/lifecycle/unsuspend", unsuspendPunterRequest)) ~> underTest ~> check {
          status shouldEqual StatusCodes.Accepted
        }
      }

      "returns 404 on missing punter profile" in {
        val underTest =
          restRoutesBuilder.buildRoutes(
            punters = stubUnsuspend(EitherT.leftT(PunterProfileDoesNotExist(PunterId("123")))),
            puntersRepository = puntersRepository)

        withAdminToken(Post("/admin/punters/123/lifecycle/unsuspend", unsuspendPunterRequest)) ~> underTest ~> check {
          status shouldEqual StatusCodes.NotFound
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }

      "returns 400 if punter not suspended" in {
        val underTest =
          restRoutesBuilder.buildRoutes(
            punters = stubUnsuspend(EitherT.leftT(PunterNotSuspendedError(PunterId("123")))),
            puntersRepository = puntersRepository)

        withAdminToken(Post("/admin/punters/123/lifecycle/unsuspend", unsuspendPunterRequest)) ~> underTest ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "punterIsNotSuspended")
        }
      }

      "returns 400 if punter does not have full SSN" in {
        val punter = generatePunterWithPartialSSN()
        awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))

        val underTest =
          restRoutesBuilder.buildRoutes(
            punters = stubUnsuspend(EitherT.safeRightT(())),
            puntersRepository = puntersRepository)

        withAdminToken(
          Post(
            s"/admin/punters/${punter.punterId.value}/lifecycle/unsuspend",
            unsuspendPunterRequest)) ~> underTest ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "punterWithoutSSN")
        }
      }
    }

    "POST /admin/punters/:punterId/lifecycle/logout" should {
      "return 404 PunterProfileDoesNotExist" in {
        val underTest =
          restRoutesBuilder.buildRoutes(punters =
            stubEndSession(EitherT.leftT(PunterProfileDoesNotExist(PunterId("123")))))

        withAdminToken(Post("/admin/punters/123/lifecycle/logout")) ~> underTest ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

      "return 200 Ok" in {
        val authenticationRepository = new MemorizingTestAuthenticationRepository()
        val punterId = PunterId("d383d156-bafb-42b5-b7cb-ea2b0f882a06")
        val timestamp = new FakeHardcodedClock().currentOffsetDateTime()

        val underTest =
          restRoutesBuilder.buildRoutes(
            punters = stubEndSession(
              EitherT.safeRightT(
                EndedSession(
                  SessionId("123"),
                  startedAt = timestamp,
                  endedAt = timestamp,
                  limitation = Unlimited(dateInTheFuture)))),
            authenticationRepository = authenticationRepository)
        withAdminToken(
          Post("/admin/punters/d383d156-bafb-42b5-b7cb-ea2b0f882a06/lifecycle/logout")) ~> underTest ~> check {
          status shouldEqual StatusCodes.OK
        }

        authenticationRepository.signOutUpdates should ===(List(punterId))
      }

      "return 404 SessionNotFound" in {
        val underTest = restRoutesBuilder.buildRoutes(punters = stubEndSession(EitherT.leftT(SessionNotFound)))
        withAdminToken(
          Post("/admin/punters/2a1f4947-9fe9-47b4-9e41-facb8c98c232/lifecycle/logout")) ~> underTest ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }
    }

    "POST /admin/punters/:punterId/funds/credit" should {
      val request = """{"details": "lala", "amount": {"amount": 2137, "currency": "USD"}}"""
      val adjustmentRequest =
        """{"details": "lala", "reason": "ADJUSTMENT", "amount": {"amount": 2137, "currency": "USD"}}"""

      "return 204 NoContent for correct request" in {
        val punters = new PuntersContextProviderSuccess()
        val wallets = new MemorizedTestWalletsContext(clock)
        val underTest = restRoutesBuilder.buildRoutes(punters = punters, wallets = wallets)

        withAdminToken(Post("/admin/punters/123/funds/credit", request)) ~> underTest ~> check {
          status shouldEqual StatusCodes.NoContent
          wallets.depositRequests should contain((WalletId("123"), CreditFundsReason.Deposit, RealMoney(2137)))
        }
      }

      "return 204 NoContent for correct adjustment request" in {
        val punters = new PuntersContextProviderSuccess()
        val wallets = new MemorizedTestWalletsContext(clock)
        val underTest = restRoutesBuilder.buildRoutes(punters = punters, wallets = wallets)

        withAdminToken(Post("/admin/punters/123/funds/credit", adjustmentRequest)) ~> underTest ~> check {
          status shouldEqual StatusCodes.NoContent
          wallets.depositRequests should contain((WalletId("123"), CreditFundsReason.Adjustment, RealMoney(2137)))
        }
      }

      "return 404 Not Found for non existent punter" in {
        val punters = new PuntersContextProviderSuccess()
        val underTest = restRoutesBuilder.buildRoutes(
          punters = punters,
          wallets = stubDepositFunds(EitherT.leftT(WalletNotFoundError(WalletId("123")))))

        withAdminToken(Post("/admin/punters/123/funds/credit", request)) ~> underTest ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

      "return 400 Bad Request for non-positive funds value" in {
        val invalidRequestBodies = List(
          """{"details": "we're really generous", "amount": {"amount": 0, "currency": "USD"}}""",
          """{"details": "we're really generous", "amount": {"amount": -2137, "currency": "USD"}}""")

        val punters = new PuntersContextProviderSuccess()
        val routes = restRoutesBuilder.buildRoutes(punters = punters)

        forAll(invalidRequestBodies) { request =>
          withAdminToken(Post("/admin/punters/123/funds/debit", request)) ~> routes ~> check {
            status shouldEqual StatusCodes.BadRequest
          }
        }
      }
    }

    "POST /admin/punters/:punterId/funds/debit" should {
      val request = """{"details": "because we can", "amount": {"amount": 2137, "currency": "USD"}}"""
      val adjustmentRequest =
        """{"details": "because we can", "reason": "ADJUSTMENT", "amount": {"amount": 2137, "currency": "USD"}}"""

      "return 204 No Content for valid debit request" in {
        val punters = new PuntersContextProviderSuccess()
        val wallets = new MemorizedTestWalletsContext(clock)
        val routes = restRoutesBuilder.buildRoutes(punters = punters, wallets = wallets)

        withAdminToken(Post("/admin/punters/123/funds/debit", request)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
          wallets.withdrawalRequests should contain((WalletId("123"), DebitFundsReason.Withdrawal, RealMoney(2137)))
        }
      }

      "return 204 No Content for valid adjustment request" in {
        val punters = new PuntersContextProviderSuccess()
        val wallets = new MemorizedTestWalletsContext(clock)
        val routes = restRoutesBuilder.buildRoutes(punters = punters, wallets = wallets)

        withAdminToken(Post("/admin/punters/123/funds/debit", adjustmentRequest)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
          wallets.withdrawalRequests should contain((WalletId("123"), DebitFundsReason.Adjustment, RealMoney(2137)))
        }
      }

      "return 404 Not Found for non existent punter" in {
        val punters = new PuntersContextProviderSuccess()
        val routes = restRoutesBuilder.buildRoutes(
          punters = punters,
          wallets = stubDebitFunds(Left(WalletNotFoundError(WalletId("123")))))

        withAdminToken(Post("/admin/punters/123/funds/debit", request)) ~> routes ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

      "return 400 Bad Request for insufficient funds" in {
        val punters = new PuntersContextProviderSuccess()
        val routes = restRoutesBuilder.buildRoutes(
          punters = punters,
          wallets = stubDebitFunds(Left(InsufficientFundsError(WalletId("123")))))

        withAdminToken(Post("/admin/punters/123/funds/debit", request)) ~> routes ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }

      "return 400 Bad Request for non-positive funds value" in {
        val invalidRequestBodies = List(
          """{"details": "because we can", "amount": {"amount": 0, "currency": "USD"}}""",
          """{"details": "because we can", "amount": {"amount": -2137, "currency": "USD"}}""")

        val punters = new PuntersContextProviderSuccess()
        val routes = restRoutesBuilder.buildRoutes(punters = punters)

        forAll(invalidRequestBodies) { request =>
          withAdminToken(Post("/admin/punters/123/funds/debit", request)) ~> routes ~> check {
            status shouldEqual StatusCodes.BadRequest
          }
        }
      }
    }

    "GET /admin/punters/:punterId/financial-summary" should {
      assertAdminRoleRequired(Get("/admin/punters/123/financial-summary"))(restRoutesBuilder.buildRoutes())

      "return 200 OK" in {
        val routes = restRoutesBuilder.buildRoutes()
        withAdminToken(Get("/admin/punters/123/financial-summary")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldEqual PunterFinancialSummaryJson
        }
      }

      "return 404 Not Found for non existent punter" in {
        val routes = restRoutesBuilder.buildRoutes(wallets = new WalletContextProviderFailure())
        withAdminToken(Get("/admin/punters/123/financial-summary")) ~> routes ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

    }

    "GET /admin/punters/:punterId/bets" should {
      assertAdminRoleRequired(Get("/admin/punters/123/bets"))(restRoutesBuilder.buildRoutes())

      "returns 200 OK" in {
        val routes =
          restRoutesBuilder.buildRoutes(bets = BetsBoundedContextMock.betsSearchMock(PunterBetHistoryReturned))
        withAdminToken(Get("/admin/punters/123/bets")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          Right(responseAs[Json]) shouldEqual ExpectedPunterBetHistoryJson
        }
      }
    }

    "GET /admin/punters/:punterId/transactions" should {
      assertAdminRoleRequired(Get("/admin/punters/123/transactions"))(restRoutesBuilder.buildRoutes())

      "returns 200 OK" in {
        val routes = restRoutesBuilder.buildRoutes(wallets = new WalletContextProviderSuccess(clock) {
          override def walletTransactions(query: WalletTransactionsQuery, pagination: Pagination)(implicit
              ec: ExecutionContext): Future[PaginatedResult[WalletTransaction]] =
            Future.successful(ReturnedPunterTransactions)
        })

        withAdminToken(Get("/admin/punters/123/transactions")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          responseAs[Json] shouldEqual ExpectedPunterTransactionsJson
        }
      }
    }

    "GET /admin/punters/:punterId/transactions/export" should {
      assertAdminRoleRequired(Get("/admin/punters/123/transactions/export"))(restRoutesBuilder.buildRoutes())

      "returns 200 OK" in {
        val routes = restRoutesBuilder.buildRoutes(wallets = new WalletContextProviderSuccess(clock) {
          override def allWalletTransactions(query: WalletTransactionsQuery)(implicit
              ec: ExecutionContext): Source[WalletTransaction, NotUsed] =
            Source(StoredPunterTransactions)
        })

        withAdminToken(Get("admin/punters/123/transactions/export")) ~> routes ~> check {
          status shouldEqual StatusCodes.OK
          And("list all the fields in all the transactions in a correct order")
          responseAs[String] shouldBe ExpectedPunterTransactionsCsv
        }
      }
    }

    "POST /admin/punters/:punterId/transactions/:transactionId/confirm" should {
      assertAdminRoleRequired(Post("/admin/punters/123/transactions/321/confirm"))(restRoutesBuilder.buildRoutes())

      "returns 204 No Content on successful confirmation" in {
        val routes = restRoutesBuilder.buildRoutes(wallets = new WalletContextProviderSuccess(clock) {
          override def finalizeWithdrawal(
              walletId: WalletId,
              reservationId: WalletsBoundedContextProtocol.ReservationId,
              outcome: WalletsBoundedContextProtocol.WithdrawalOutcome)(implicit ec: ExecutionContext)
              : EitherT[Future, WalletsBoundedContextProtocol.WithdrawalFinalizationError, Balance] =
            EitherT.safeRightT[Future, WithdrawalFinalizationError](Balance(RealMoney(2137)))
        })

        withAdminToken(Post("admin/punters/123/transactions/321/confirm")) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
        }
      }

      "returns 404 on missing wallet" in {
        val routes = restRoutesBuilder.buildRoutes(wallets = new WalletContextProviderSuccess(clock) {
          override def finalizeWithdrawal(
              walletId: WalletId,
              reservationId: WalletsBoundedContextProtocol.ReservationId,
              outcome: WalletsBoundedContextProtocol.WithdrawalOutcome)(implicit ec: ExecutionContext)
              : EitherT[Future, WalletsBoundedContextProtocol.WithdrawalFinalizationError, Balance] =
            EitherT.leftT[Future, Balance](WalletNotFoundError(WalletId("123")))
        })

        withAdminToken(Post("admin/punters/123/transactions/321/confirm")) ~> routes ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

      "returns 404 on missing reservation" in {
        val routes = restRoutesBuilder.buildRoutes(wallets = new WalletContextProviderSuccess(clock) {
          override def finalizeWithdrawal(
              walletId: WalletId,
              reservationId: WalletsBoundedContextProtocol.ReservationId,
              outcome: WalletsBoundedContextProtocol.WithdrawalOutcome)(implicit ec: ExecutionContext)
              : EitherT[Future, WalletsBoundedContextProtocol.WithdrawalFinalizationError, Balance] =
            EitherT.leftT[Future, Balance](ReservationNotFoundError(WalletId("123"), ReservationId("321")))
        })

        withAdminToken(Post("admin/punters/123/transactions/321/confirm")) ~> routes ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }
    }

    "POST /admin/punters/:punterId/transactions/:transactionId/reject" should {
      val requestBody = """{"reason": "possible fraud"}"""

      assertAdminRoleRequired(Post("/admin/punters/123/transactions/321/reject", requestBody))(
        restRoutesBuilder.buildRoutes())

      "returns 204 No Content on successful rejection" in {
        val routes = restRoutesBuilder.buildRoutes(wallets = new WalletContextProviderSuccess(clock) {
          override def finalizeWithdrawal(
              walletId: WalletId,
              reservationId: WalletsBoundedContextProtocol.ReservationId,
              outcome: WalletsBoundedContextProtocol.WithdrawalOutcome)(implicit ec: ExecutionContext)
              : EitherT[Future, WalletsBoundedContextProtocol.WithdrawalFinalizationError, Balance] =
            EitherT.safeRightT[Future, WithdrawalFinalizationError](Balance(RealMoney(2137)))
        })

        withAdminToken(Post("admin/punters/123/transactions/321/reject", requestBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
        }
      }

      "returns 404 on missing wallet" in {
        val routes = restRoutesBuilder.buildRoutes(wallets = new WalletContextProviderSuccess(clock) {
          override def finalizeWithdrawal(
              walletId: WalletId,
              reservationId: WalletsBoundedContextProtocol.ReservationId,
              outcome: WalletsBoundedContextProtocol.WithdrawalOutcome)(implicit ec: ExecutionContext)
              : EitherT[Future, WalletsBoundedContextProtocol.WithdrawalFinalizationError, Balance] =
            EitherT.leftT[Future, Balance](WalletNotFoundError(WalletId("123")))
        })

        withAdminToken(Post("admin/punters/123/transactions/321/reject", requestBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

      "returns 404 on missing reservation" in {
        val routes = restRoutesBuilder.buildRoutes(wallets = new WalletContextProviderSuccess(clock) {
          override def finalizeWithdrawal(
              walletId: WalletId,
              reservationId: WalletsBoundedContextProtocol.ReservationId,
              outcome: WalletsBoundedContextProtocol.WithdrawalOutcome)(implicit ec: ExecutionContext)
              : EitherT[Future, WalletsBoundedContextProtocol.WithdrawalFinalizationError, Balance] =
            EitherT.leftT[Future, Balance](ReservationNotFoundError(WalletId("123"), ReservationId("321")))
        })

        withAdminToken(Post("admin/punters/123/transactions/321/reject", requestBody)) ~> routes ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }
    }

    "GET /admin/punters/:punterId/lifecycle/end-self-exclusion" should {
      val endpoint = "/admin/punters/123/lifecycle/end-self-exclusion"
      assertAdminRoleRequired(Get(endpoint))(restRoutesBuilder.buildRoutes())

      "returns 204 OK" in {
        val routes = restRoutesBuilder.buildRoutes()

        withAdminToken(Get(endpoint)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
        }
      }

      "returns 404 on missing punter profile" in {
        val routes = restRoutesBuilder.buildRoutes(punters = new PuntersContextProviderFailure)

        withAdminToken(Get(endpoint)) ~> routes ~> check {
          status shouldEqual StatusCodes.NotFound
        }
      }

      "returns 400 when punter not in self exclusion" in {
        class PunterNotInSelfExclusion extends PuntersContextProviderFailure {
          override def endSelfExclusion(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterSelfExclusionEndError, Unit] =
            EitherT.leftT(PunterNotInSelfExclusionError(PunterId("123")))
        }

        val routes = restRoutesBuilder.buildRoutes(punters = new PunterNotInSelfExclusion)

        withAdminToken(Get(endpoint)) ~> routes ~> check {
          status shouldEqual StatusCodes.BadRequest
        }
      }
    }

    "POST /admin/punters/exclusions/ingest" should {
      assertAdminRoleRequired(Post("/admin/punters/exclusions/ingest"))(restRoutesBuilder.buildRoutes())

      "returns 200 OK" in {
        val fakeJobActor = TestProbe[Tick.type]()
        val ingestJobName = PuntersConfig.of(typedSystem).excludedUsers.excludedUsersIngestion.periodicWorker.name
        val serviceKey = ServiceKey[Tick.type](ingestJobName)
        typedSystem.receptionist ! Receptionist.Register(serviceKey, fakeJobActor.ref)

        withAdminToken(Post("admin/punters/exclusions/ingest")) ~> punterBackOfficeRoutes ~> check {
          status shouldEqual StatusCodes.OK
          fakeJobActor.expectMessage(Tick)
        }

        typedSystem.receptionist ! Receptionist.Deregister(serviceKey, fakeJobActor.ref)
      }

      "returns 500 if no actor is registered" in {

        withAdminToken(Post("admin/punters/exclusions/ingest")) ~> punterBackOfficeRoutes ~> check {
          status shouldEqual StatusCodes.InternalServerError
        }
      }
    }

    "POST /admin/punters/exclusions/export" should {
      assertAdminRoleRequired(Post("/admin/punters/exclusions/export"))(restRoutesBuilder.buildRoutes())

      "returns 200 OK" in {
        val fakeJobActor = TestProbe[Tick.type]()
        val ingestJobName = PuntersConfig.of(typedSystem).excludedUsers.excludedUsersReport.periodicWorker.name
        val serviceKey = ServiceKey[Tick.type](ingestJobName)
        typedSystem.receptionist ! Receptionist.Register(serviceKey, fakeJobActor.ref)

        withAdminToken(Post("admin/punters/exclusions/export")) ~> punterBackOfficeRoutes ~> check {
          status shouldEqual StatusCodes.OK
          fakeJobActor.expectMessage(Tick)
        }

        typedSystem.receptionist ! Receptionist.Deregister(serviceKey, fakeJobActor.ref)
      }

      "returns 500 if no actor is registered" in {

        withAdminToken(Post("admin/punters/exclusions/export")) ~> punterBackOfficeRoutes ~> check {
          status shouldEqual StatusCodes.InternalServerError
        }
      }
    }

    "POST /admin/punters/:punterId/detail/ssn" should {

      assertAdminRoleRequired(
        Post(s"/admin/punters/${generatePunterId().value}/detail/ssn", json"""{"ssn": "132435465"}"""))(
        restRoutesBuilder.buildRoutes())

      "returns 200 OK" in {
        val puntersRepository = new InMemoryPuntersRepository()
        val authenticationRepository = new MemorizingTestAuthenticationRepository()

        val userDetails = randomUserDetailsKeycloak()
        val punterId = await(authenticationRepository.register(userDetails, ValidPassword("test")))
        val punter = generatePunterWithSSN(punterId = punterId, ssn = FullSSN.fromRawStringUnsafe("987654321"))
        awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))

        val newSSN = FullSSN.fromRawStringUnsafe("123456789")
        val request = json"""{"ssn": ${newSSN.value}}"""
        val routes = restRoutesBuilder.buildRoutes(
          puntersRepository = puntersRepository,
          authenticationRepository = authenticationRepository)

        withAdminToken(Post(s"/admin/punters/${punterId.value}/detail/ssn", request)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
          await(puntersRepository.findByPunterId(punterId)).map(_.ssn) should ===(Some(Right(newSSN)))
        }

        authenticationRepository.signOutUpdates.exists(_ == punterId) should ===(true)
      }

      "returns error for unknown punter" in {
        val request = json"""{"ssn": "132435465"}"""
        val routes = restRoutesBuilder.buildRoutes()

        withAdminToken(Post(s"/admin/punters/${generatePunterId().value}/detail/ssn", request)) ~> routes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }

      "returns error for duplicate ssn punter" in {
        val puntersRepository = new InMemoryPuntersRepository()
        val authenticationRepository = new MemorizingTestAuthenticationRepository()

        val userDetails = randomUserDetailsKeycloak()
        val punterId = await(authenticationRepository.register(userDetails, ValidPassword("test")))
        val punter = generatePunterWithSSN(punterId = punterId, ssn = FullSSN.fromRawStringUnsafe("987654321"))
        awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))

        val newSSN = FullSSN.fromRawStringUnsafe("123456789")
        val request = json"""{"ssn": ${newSSN.value}}"""
        val routes = restRoutesBuilder.buildRoutes(
          puntersRepository = puntersRepository,
          authenticationRepository = authenticationRepository)

        awaitRight(puntersRepository.setSSN(punterId, newSSN))

        withAdminToken(Post(s"/admin/punters/${punterId.value}/detail/ssn", request)) ~> routes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "punterDuplicateSSN")
        }
      }

      "returns 200 OK but self excludes punter if new ssn is on excluded users list" in {
        val puntersRepository = new InMemoryPuntersRepository()
        val authenticationRepository = new MemorizingTestAuthenticationRepository()
        val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
        val punters = new PuntersContextProviderSuccess() {

          private var profile = examplePunterProfile.copy(status = PunterStatus.Active)

          override def beginSelfExclusion(id: PunterId, selfExclusionOrigin: PunterState.SelfExclusionOrigin)(implicit
              ec: ExecutionContext): EitherT[Future, PunterSelfExclusionError, Unit] = {
            profile = profile.copy(status = PunterStatus.SelfExcluded)
            super.beginSelfExclusion(id, selfExclusionOrigin)
          }

          override def getPunterProfile(id: PunterId)(implicit
              ec: ExecutionContext): EitherT[Future, PunterProfileDoesNotExist, PunterProfile] =
            EitherT.safeRightT(profile)
        }

        val userDetails = randomUserDetailsKeycloak()
        val punterId = await(authenticationRepository.register(userDetails, ValidPassword("test")))
        val punter = generatePunterWithSSN(punterId = punterId, ssn = FullSSN.fromRawStringUnsafe("987654321"))
        awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))

        val newSSN = FullSSN.fromRawStringUnsafe("123456789")
        await(
          excludedPlayersRepository.upsert(
            ExclusionDataGenerator.generateExcludedPlayer(ExclusionStatus.Active).copy(ssn = Some(Right(newSSN)))))

        val request = json"""{"ssn": ${newSSN.value}}"""
        val routes = restRoutesBuilder.buildRoutes(
          puntersRepository = puntersRepository,
          authenticationRepository = authenticationRepository,
          excludedPlayersRepository = excludedPlayersRepository,
          punters = punters)

        withAdminToken(Post(s"/admin/punters/${punterId.value}/detail/ssn", request)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
          await(puntersRepository.findByPunterId(punterId)).map(_.ssn) should ===(Some(Right(newSSN)))

          awaitRight(punters.getPunterProfile(punterId)).status should ===(PunterStatus.SelfExcluded)
        }
      }
    }

    "GET /admin/punters/:punterId/detail/ssn" should {
      assertAdminRoleRequired(Get(s"/admin/punters/${generatePunterId().value}/detail/ssn"))(
        restRoutesBuilder.buildRoutes())

      val puntersRepository = new InMemoryPuntersRepository()

      "returns 200 OK" in {
        val punter = generatePunterWithSSN()
        awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))
        withAdminToken(Get(s"/admin/punters/${punter.punterId.value}/detail/ssn")) ~>
        restRoutesBuilder.buildRoutes(puntersRepository = puntersRepository) ~> check {
          status should ===(StatusCodes.OK)
          responseAs[PunterSSNResponse] should ===(PunterSSNResponse(ssn = punter.ssn.toOption))
        }
      }

      "returns 200 OK when full SSN is not available" in {
        val punter = generatePunterWithPartialSSN()
        awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))
        withAdminToken(Get(s"/admin/punters/${punter.punterId.value}/detail/ssn")) ~>
        restRoutesBuilder.buildRoutes(puntersRepository = puntersRepository) ~> check {
          status should ===(StatusCodes.OK)
          responseAs[PunterSSNResponse] should ===(PunterSSNResponse(ssn = None))
        }
      }

      "returns 400 for unknown punter" in {
        withAdminToken(Get(s"/admin/punters/${generatePunterId().value}/detail/ssn")) ~>
        restRoutesBuilder.buildRoutes(puntersRepository = puntersRepository) ~> check {
          status should ===(StatusCodes.NotFound)
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }
    }

    "POST /admin/punters/:punterId/detail/phone-number" should {

      assertAdminRoleRequired(
        Post(
          s"/admin/punters/${generatePunterId().value}/detail/phone-number",
          json"""{"phoneNumber": "0123456789"}"""))(restRoutesBuilder.buildRoutes())

      "returns 200 OK" in {
        val puntersRepository = new InMemoryPuntersRepository()
        val authenticationRepository = new MemorizingTestAuthenticationRepository()

        val userDetails = randomUserDetailsKeycloak()
        val punterId = await(authenticationRepository.register(userDetails, ValidPassword("test")))
        val punter = generatePunter()
          .focus(_.punterId)
          .replace(punterId)
          .focus(_.details.phoneNumber)
          .replace(MobilePhoneNumber("0123456789"))
        awaitRight(puntersRepository.register(punter, clock.currentOffsetDateTime()))

        val newTelephoneNumber = MobilePhoneNumber("0987654321")
        val request = json"""{"phoneNumber": ${newTelephoneNumber.value}}"""
        val routes = restRoutesBuilder.buildRoutes(
          puntersRepository = puntersRepository,
          authenticationRepository = authenticationRepository)

        withAdminToken(Post(s"/admin/punters/${punterId.value}/detail/phone-number", request)) ~> routes ~> check {
          status shouldEqual StatusCodes.NoContent
          await(puntersRepository.findByPunterId(punterId)).map(_.details.phoneNumber) should ===(
            Some(newTelephoneNumber))
          await(puntersRepository.findByPunterId(punterId)).map(_.details.isPhoneNumberVerified) should ===(Some(false))

          authenticationRepository.signOutUpdates.exists(_ == punterId) should ===(true)
        }
      }

      "returns error for unknown punter" in {
        val request = json"""{"phoneNumber": "0123456789"}"""
        val routes = restRoutesBuilder.buildRoutes()

        withAdminToken(
          Post(s"/admin/punters/${generatePunterId().value}/detail/phone-number", request)) ~> routes ~> check {
          status shouldEqual StatusCodes.BadRequest
          assertErrorResponse(responseAs[Json], "punterProfileDoesNotExist")
        }
      }
    }
  }

  def buildRoutesFailure(punters: PuntersBoundedContext = new PuntersContextProviderFailure()): Route = {
    val markets = MarketBoundedContextMock.returningAllMarkets
    val bets = BetsBoundedContextMock.betsSuccessMock(BetState.Status.Open, betData)
    val wallets: WalletsBoundedContext = new WalletContextProviderSuccess(clock)
    val authenticationRepository = new TestAuthenticationRepository()
    val uuidGenerator = ConstantUUIDGenerator
    val puntersRepository = new InMemoryPuntersRepository()
    val puntersViewRepository = new InMemoryView01PatronDetailsRepository(clock)
    val paymentsModule =
      PaymentsModule.init(
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        generatePaymentsConfig(),
        jwtAuthenticator,
        uuidGenerator,
        clock)(
        PaymentsServiceMock.failing(),
        new InMemoryTransactionRepository(),
        new InMemoryCashWithdrawalReservationsRepository(),
        new InMemoryPaymentNotificationsRepository())
    val registrationEventRepository = new InMemoryRegistrationEventRepository()
    val limitsHistoryRepository = new InMemoryPunterLimitsHistoryRepository()
    val coolOffsHistoryRepository = new InMemoryPunterCoolOffsHistoryRepository()
    val idComplyService = IdComplyServiceMock.apply()
    val noteRepository = new InMemoryNoteRepository()
    val noteModule =
      NoteModule.init(puntersRepository, new NoteProjectionsSupport().projections, noteRepository, uuidGenerator, clock)
    val excludedPlayersRepository = new InMemoryExcludedPlayersRepository()
    val termsAndConditionsRepository = new TermsAndConditionsRepositoryMock()
    val emailingModule = EmailingModule.init(new EmailSenderStub())
    val routes = new PhoenixRestRoutes(
      new BetRoutes(
        bets,
        wallets,
        markets,
        punters,
        new TestMarketBetsRepository(),
        new TestPunterStakeRepository,
        AlwaysValidGeolocationValidator,
        generateBetsDomainConfig()),
      new MarketRoutes(markets),
      new WalletRoutes(wallets),
      new PunterRoutes(
        punters,
        wallets,
        bets,
        authenticationRepository,
        puntersRepository,
        puntersViewRepository,
        termsAndConditionsRepository,
        new TestMultiFactorAuthenticationService(),
        new AccountVerificationCodeRepositoryStub(clock)(),
        registrationEventRepository,
        limitsHistoryRepository,
        new InMemoryPunterDeviceFingerprintsRepository(clock)(),
        coolOffsHistoryRepository,
        idComplyService,
        excludedPlayersRepository,
        emailingModule.mailer,
        noteModule.noteRepository,
        uuidGenerator,
        clock,
        generatePuntersDomainConfig()),
      new GeoComplyRoutes(GeoComplyServiceMock.failing(), GeoComplyLicenseServiceMock.failing()),
      paymentsModule.routes.payments,
      new BackofficeRoutes(
        _,
        BetsBoundedContextMock.betsWithDomainFailureMock,
        markets,
        punters,
        wallets,
        new TestAuthenticationRepository(),
        puntersRepository,
        puntersViewRepository,
        limitsHistoryRepository,
        coolOffsHistoryRepository,
        new AuditLogBackofficeRoutes(
          BackofficeRoutes.adminMountPoint,
          new AuditLogger(new InMemoryAuditLogRepository(), clock)),
        new NoteBackofficeRoutes(
          BackofficeRoutes.adminMountPoint,
          noteRepository,
          puntersRepository,
          uuidGenerator,
          clock),
        termsAndConditionsRepository,
        _ => Future.successful(()),
        excludedPlayersRepository,
        registrationEventRepository,
        new EmptyReportsModule()))

    Route.seal(routes.toAkkaHttp)
  }

  def stubSuspend(suspendAction: EitherT[Future, SuspendPunterError, Unit]): PuntersBoundedContext =
    new PuntersContextProviderSuccess() {
      override def suspend(id: PunterId, entity: SuspensionEntity, suspendedAt: OffsetDateTime)(implicit
          ec: ExecutionContext): EitherT[Future, SuspendPunterError, Unit] =
        suspendAction
    }

  def stubUnsuspend(unsuspendAction: EitherT[Future, UnsuspendPunterError, Unit]): PuntersBoundedContext =
    new PuntersContextProviderSuccess() {
      override def unsuspend(id: PunterId, adminId: AdminId)(implicit
          ec: ExecutionContext): EitherT[Future, UnsuspendPunterError, Unit] =
        unsuspendAction
    }

  def stubEndSession(endSessionAction: EitherT[Future, EndSessionError, EndedSession]): PuntersBoundedContext =
    new PuntersContextProviderSuccess() {
      override def endSession(id: PunterId)(implicit
          ec: ExecutionContext): EitherT[Future, EndSessionError, EndedSession] = endSessionAction
    }

  def stubDepositFunds(result: EitherT[Future, WalletNotFoundError, Balance]): WalletsBoundedContext =
    new WalletContextProviderSuccess(clock) {
      override def deposit(
          walletId: WalletId,
          funds: PositiveAmount[RealMoney],
          reason: CreditFundsReason,
          paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WalletNotFoundError, Balance] =
        result
    }

  def stubDebitFunds(result: Either[WithdrawError, Balance]): WalletsBoundedContext =
    new WalletContextProviderSuccess(clock) {
      override def withdraw(
          walletId: WalletId,
          withdrawal: PositiveAmount[RealMoney],
          reason: DebitFundsReason,
          paymentMethod: PaymentMethod)(implicit ec: ExecutionContext): EitherT[Future, WithdrawError, Balance] =
        EitherT.fromEither[Future](result)
    }

  val punterBackOfficeRoutes: Route = new PunterBackofficeRoutes(
    BackofficeRoutes.adminMountPoint,
    BetsBoundedContextMock.betsSuccessMock(BetState.Status.Open, betData),
    new PuntersContextProviderFailure(),
    new WalletContextProviderSuccess(clock),
    new TestAuthenticationRepository(),
    new InMemoryPuntersRepository(),
    new InMemoryView01PatronDetailsRepository(clock),
    new InMemoryPunterLimitsHistoryRepository(),
    new InMemoryPunterCoolOffsHistoryRepository(),
    new TermsAndConditionsRepositoryMock(),
    new InMemoryExcludedPlayersRepository(),
    new InMemoryRegistrationEventRepository(),
    new EmptyReportsModule(),
    clock).toAkkaHttp
}

object BackofficePunterRoutesSpec {

  val BrittaPunter: Punter = generatePunter()
    .focus(_.punterId)
    .replace(PunterId("2a1f4947-9fe9-47b4-9e41-facb8c98c232"))
    .focus(_.details.email)
    .replace(Email.fromStringUnsafe("britta@nicolas.co"))
    .focus(_.details.name.firstName)
    .replace(FirstName("Britta").unsafe())
    .focus(_.details.name.lastName)
    .replace(LastName("Sporer").unsafe())
    .focus(_.details.userName)
    .replace(Username.fromStringUnsafe("britta.sporer"))
    .focus(_.details.dateOfBirth)
    .replace(DateOfBirth(day = 23, month = 10, year = 1994))

  val LeonardPunter: Punter = generatePunter()
    .focus(_.punterId)
    .replace(PunterId("9aac83a1-1234-419c-82a5-acd77ec4be31"))
    .focus(_.details.email)
    .replace(Email.fromStringUnsafe("leonard@schneider.net"))
    .focus(_.details.name.firstName)
    .replace(FirstName("Leonard").unsafe())
    .focus(_.details.name.lastName)
    .replace(LastName("Kassulke").unsafe())
    .focus(_.details.userName)
    .replace(Username.fromStringUnsafe("leonard.kassulke"))
    .focus(_.details.dateOfBirth)
    .replace(DateOfBirth(day = 28, month = 2, year = 1986))

  val LeonardOnlySummariesJson: Json =
    json"""
    {
      "currentPage": 1,
      "data": [{
        "email": "leonard@schneider.net",
        "firstName": "Leonard",
        "id": "9aac83a1-1234-419c-82a5-acd77ec4be31",
        "lastName": "Kassulke",
        "username": "leonard.kassulke",
        "dateOfBirth": {
          "day" : 28,
          "month" : 2,
          "year" : 1986
        },
        "isTestAccount" : false
      }],
      "hasNextPage": false,
      "itemsPerPage": 20,
      "totalCount": 1
    }
    """

  val PunterFinancialSummaryJson = parse("""
      |{
      |  "currentBalance": {
      |    "amount": 100.0,
      |    "currency": "USD"
      |  },
      |  "openedBets": {
      |    "amount": 200.0,
      |    "currency": "USD"
      |  },
      |  "pendingWithdrawals": {
      |    "amount": 100.0,
      |    "currency": "USD"
      |  },
      |  "lifetimeDeposits": {
      |    "amount": 1000.0,
      |    "currency": "USD"
      |  },
      |  "lifetimeWithdrawals": {
      |    "amount": 1100.0,
      |    "currency": "USD"
      |  },
      |  "netCash": {
      |    "amount": -200.0,
      |    "currency": "USD"
      |  }
      |}
      |""".stripMargin)

  val PunterBetHistoryReturned: PaginatedResult[BetView] = PaginatedResult(
    data = Seq(
      BetView(
        betId = BetId("47a9efb2-86e7-4bcd-989d-0a8350f717f7"),
        betType = BetType.Single,
        stake = Stake.unsafe(DefaultCurrencyMoney(101)),
        outcome = None,
        placedAt = "2021-06-05T09:01:45.938927Z".toUtcOffsetDateTime,
        settledAt = None,
        voidedAt = None,
        cancelledAt = None,
        odds = Odds(1.01),
        sports = List(SportSummary(id = SportId(DataProvider.Phoenix, "8"), name = "Overwatch")),
        profitLoss = None,
        legs = List(
          Leg(
            id = BetId("47a9efb2-86e7-4bcd-989d-0a8350f717f7"),
            sport = SportSummary(id = SportId(DataProvider.Phoenix, "8"), name = "Overwatch"),
            tournament = TournamentSummary(
              id = TournamentId(DataProvider.Oddin, "1309"),
              name = "Overwatch League 2021 - June Joust"),
            fixture = FixtureSummary(
              id = FixtureId(DataProvider.Oddin, "29968"),
              name = "Los Angeles Valiant vs Philadelphia Fusion",
              startTime = "2021-06-05T09:00:00Z".toUtcOffsetDateTime,
              status = FixtureLifecycleStatus.InPlay),
            market = MarketSummary(
              id = MarketId(DataProvider.Oddin, "003eda06-95f7-4ae1-9038-ba3042b979ac"),
              name = "Match winner - twoway"),
            selection = SelectionSummary(id = "2", name = "away"),
            competitor = Some(
              CompetitorSummary(
                id = CompetitorId(DataProvider.Oddin, "od:competitor:65"),
                name = "Philadelphia Fusion")),
            odds = Odds(1.01),
            settledAt = None,
            outcome = None,
            status = BetStatus.Open))),
      BetView(
        betId = BetId("c5c6fdd5-b8f8-4d37-b7d4-0ebd80818615"),
        betType = BetType.Single,
        stake = Stake.unsafe(DefaultCurrencyMoney(10)),
        outcome = None,
        placedAt = "2021-06-05T09:01:39.922587Z".toUtcOffsetDateTime,
        settledAt = None,
        voidedAt = None,
        cancelledAt = None,
        odds = Odds(1.45),
        sports = List(SportSummary(id = SportId(DataProvider.Phoenix, "2"), name = "Dota 2")),
        profitLoss = None,
        legs = List(
          Leg(
            id = BetId("c5c6fdd5-b8f8-4d37-b7d4-0ebd80818615"),
            sport = SportSummary(id = SportId(DataProvider.Phoenix, "2"), name = "Dota 2"),
            tournament =
              TournamentSummary(id = TournamentId(DataProvider.Oddin, "1365"), name = "Moon Studio Asian Showdown"),
            fixture = FixtureSummary(
              id = FixtureId(DataProvider.Oddin, "33519"),
              name = "LBZS vs Yangon Galacticos",
              startTime = "2021-06-05T08:00:00Z".toUtcOffsetDateTime,
              status = FixtureLifecycleStatus.InPlay),
            market = MarketSummary(
              id = MarketId(DataProvider.Oddin, "45c2d72b-25f9-45fe-8dd3-934d252ef6a7"),
              name = "Match winner - twoway"),
            selection = SelectionSummary(id = "1", name = "home"),
            competitor =
              Some(CompetitorSummary(id = CompetitorId(DataProvider.Oddin, "od:competitor:2108"), name = "LBZS")),
            odds = Odds(1.45),
            settledAt = None,
            outcome = None,
            status = BetStatus.Open)))),
    currentPage = 1,
    itemsPerPage = 20,
    totalCount = 2,
    hasNextPage = false)

  val ExpectedPunterBetHistoryJson =
    parse("""
      |{
      |  "currentPage": 1,
      |  "data": [{
      |    "betId": "47a9efb2-86e7-4bcd-989d-0a8350f717f7",
      |    "betType": "SINGLE",
      |    "legs": [{
      |      "competitor": {
      |        "id": "c:o:od:competitor:65",
      |        "name": "Philadelphia Fusion"
      |      },
      |      "fixture": {
      |        "id": "f:o:29968",
      |        "name": "Los Angeles Valiant vs Philadelphia Fusion",
      |        "startTime": "2021-06-05T09:00:00Z",
      |        "status":"IN_PLAY"
      |      },
      |      "id": "47a9efb2-86e7-4bcd-989d-0a8350f717f7",
      |      "market": {
      |        "id": "m:o:003eda06-95f7-4ae1-9038-ba3042b979ac",
      |        "name": "Match winner - twoway"
      |      },
      |      "displayOdds": {
      |        "decimal": 1.01,
      |        "american": "-10000",
      |        "fractional": "1/100"
      |      },
      |      "selection": {
      |        "id": "2",
      |        "name": "away"
      |      },
      |      "sport": {
      |        "id": "s:p:8",
      |        "name": "Overwatch"
      |      },
      |      "status": "OPEN",
      |      "tournament": {
      |        "id": "t:o:1309",
      |        "name": "Overwatch League 2021 - June Joust"
      |      }
      |    }],
      |    "displayOdds": {
      |      "decimal": 1.01,
      |      "american": "-10000",
      |      "fractional": "1/100"
      |    },
      |    "placedAt": "2021-06-05T09:01:45.938927Z",
      |    "sports": [{
      |      "id": "s:p:8",
      |      "name": "Overwatch"
      |    }],
      |    "stake": {
      |      "amount": 101,
      |      "currency": "USD"
      |    }
      |  }, {
      |    "betId": "c5c6fdd5-b8f8-4d37-b7d4-0ebd80818615",
      |    "betType": "SINGLE",
      |    "legs": [{
      |      "competitor": {
      |        "id": "c:o:od:competitor:2108",
      |        "name": "LBZS"
      |      },
      |      "fixture": {
      |        "id": "f:o:33519",
      |        "name": "LBZS vs Yangon Galacticos",
      |        "startTime": "2021-06-05T08:00:00Z",
      |        "status":"IN_PLAY"
      |      },
      |      "id": "c5c6fdd5-b8f8-4d37-b7d4-0ebd80818615",
      |      "market": {
      |        "id": "m:o:45c2d72b-25f9-45fe-8dd3-934d252ef6a7",
      |        "name": "Match winner - twoway"
      |      },
      |      "displayOdds": {
      |        "decimal": 1.45,
      |        "american": "-222",
      |        "fractional": "9/20"
      |      },
      |      "selection": {
      |        "id": "1",
      |        "name": "home"
      |      },
      |      "sport": {
      |        "id": "s:p:2",
      |        "name": "Dota 2"
      |      },
      |      "status": "OPEN",
      |      "tournament": {
      |        "id": "t:o:1365",
      |        "name": "Moon Studio Asian Showdown"
      |      }
      |    }],
      |    "displayOdds": {
      |      "decimal": 1.45,
      |      "american": "-222",
      |      "fractional": "9/20"
      |    },
      |    "placedAt": "2021-06-05T09:01:39.922587Z",
      |    "sports": [{
      |      "id": "s:p:2",
      |      "name": "Dota 2"
      |    }],
      |    "stake": {
      |      "amount": 10,
      |      "currency": "USD"
      |    }
      |  }],
      |  "hasNextPage": false,
      |  "itemsPerPage": 20,
      |  "totalCount": 2
      |}
      |""".stripMargin)

  val StoredPunterTransactions: List[WalletTransaction] = List(
    WalletTransaction(
      reservationId = Some("042400fb-e03d-4315-adcc-245c16f3547b"),
      transactionId = "aa587c8c-0536-4408-8b58-8a8b6decad1a",
      walletId = WalletId("16ddb9b8-e6be-417e-8092-b0a715d3e714"),
      reason = TransactionReason.FundsReservedForBet,
      transactionAmount = DefaultCurrencyMoney(101),
      createdAt = "2021-06-05T09:01:45.928891Z".toUtcOffsetDateTime,
      preTransactionBalance = DefaultCurrencyMoney(1190),
      postTransactionBalance = DefaultCurrencyMoney(1089),
      betId = Some(BetId("47a9efb2-86e7-4bcd-989d-0a8350f717f7")),
      externalId = None,
      paymentMethod = None),
    WalletTransaction(
      reservationId = Some("e6ef5d2e-9784-4462-8adb-eedf413c3ad1"),
      transactionId = "c8f4352e-3c61-4168-b00c-8c324206c028",
      walletId = WalletId("16ddb9b8-e6be-417e-8092-b0a715d3e714"),
      reason = TransactionReason.FundsReservedForBet,
      transactionAmount = DefaultCurrencyMoney(10),
      createdAt = "2021-06-05T09:01:39.901482Z".toUtcOffsetDateTime,
      preTransactionBalance = DefaultCurrencyMoney(1200),
      postTransactionBalance = DefaultCurrencyMoney(1190),
      betId = Some(BetId("c5c6fdd5-b8f8-4d37-b7d4-0ebd80818615")),
      externalId = None,
      paymentMethod = None),
    WalletTransaction(
      reservationId = None,
      transactionId = "3d1dac85-87f6-4b17-b324-68bbe532e4fc",
      walletId = WalletId("16ddb9b8-e6be-417e-8092-b0a715d3e714"),
      reason = TransactionReason.FundsDeposited,
      transactionAmount = DefaultCurrencyMoney(1200),
      createdAt = "2021-06-05T09:01:39.901482Z".toUtcOffsetDateTime,
      preTransactionBalance = DefaultCurrencyMoney(0),
      postTransactionBalance = DefaultCurrencyMoney(1200),
      betId = None,
      externalId = None,
      paymentMethod =
        Some(BackOfficeManualPaymentMethod("Deposit by admin", AdminId("ed2954ab-2c4d-49bc-bbe2-6fe49db1d75b")))))

  val ReturnedPunterTransactions: PaginatedResult[WalletTransaction] =
    PaginatedResult(
      data = StoredPunterTransactions,
      currentPage = 1,
      itemsPerPage = 20,
      totalCount = 3,
      hasNextPage = false)

  val ExpectedPunterTransactionsJson =
    parse("""
      |{
      |  "currentPage": 1,
      |  "data": [{
      |    "betId": "47a9efb2-86e7-4bcd-989d-0a8350f717f7",
      |    "category": "BET_PLACEMENT",
      |    "createdAt": "2021-06-05T09:01:45.928891Z",
      |    "postTransactionBalance": {
      |      "amount": 1089,
      |      "currency": "USD"
      |    },
      |    "preTransactionBalance": {
      |      "amount": 1190,
      |      "currency": "USD"
      |    },
      |    "reservationId": "042400fb-e03d-4315-adcc-245c16f3547b",
      |    "status": "PENDING",
      |    "transactionAmount": {
      |      "amount": 101,
      |      "currency": "USD"
      |    },
      |    "transactionId": "aa587c8c-0536-4408-8b58-8a8b6decad1a",
      |    "walletId": "16ddb9b8-e6be-417e-8092-b0a715d3e714"
      |  }, {
      |    "betId": "c5c6fdd5-b8f8-4d37-b7d4-0ebd80818615",
      |    "category": "BET_PLACEMENT",
      |    "createdAt": "2021-06-05T09:01:39.901482Z",
      |    "postTransactionBalance": {
      |      "amount": 1190,
      |      "currency": "USD"
      |    },
      |    "preTransactionBalance": {
      |      "amount": 1200,
      |      "currency": "USD"
      |    },
      |    "reservationId": "e6ef5d2e-9784-4462-8adb-eedf413c3ad1",
      |    "status": "PENDING",
      |    "transactionAmount": {
      |      "amount": 10,
      |      "currency": "USD"
      |    },
      |    "transactionId": "c8f4352e-3c61-4168-b00c-8c324206c028",
      |    "walletId": "16ddb9b8-e6be-417e-8092-b0a715d3e714"
      |  }, {
      |    "category": "DEPOSIT",
      |    "createdAt": "2021-06-05T09:01:39.901482Z",
      |    "paymentMethod": {
      |      "adminPunterId": "ed2954ab-2c4d-49bc-bbe2-6fe49db1d75b",
      |      "details": "Deposit by admin",
      |      "type": "BACKOFFICE_MANUAL_PAYMENT_METHOD"
      |    },
      |    "postTransactionBalance": {
      |    "amount": 1200,
      |    "currency": "USD"
      |  },
      |    "preTransactionBalance": {
      |      "amount": 0,
      |      "currency": "USD"
      |    },
      |    "status": "COMPLETED",
      |    "transactionAmount": {
      |      "amount": 1200,
      |      "currency": "USD"
      |    },
      |    "transactionId": "3d1dac85-87f6-4b17-b324-68bbe532e4fc",
      |    "walletId": "16ddb9b8-e6be-417e-8092-b0a715d3e714"
      |  }],
      |  "hasNextPage": false,
      |  "itemsPerPage": 20,
      |  "totalCount": 3
      |}
    """.stripMargin).toOption.get

  val ExpectedPunterTransactionsCsv =
    """
      |2021-06-05T09:01:45.928891Z,aa587c8c-0536-4408-8b58-8a8b6decad1a,PENDING,,BET_PLACEMENT,101.00 USD,1089.00 USD
      |2021-06-05T09:01:39.901482Z,c8f4352e-3c61-4168-b00c-8c324206c028,PENDING,,BET_PLACEMENT,10.00 USD,1190.00 USD
      |2021-06-05T09:01:39.901482Z,3d1dac85-87f6-4b17-b324-68bbe532e4fc,COMPLETED,"BACKOFFICE_MANUAL_PAYMENT_METHOD(Deposit by admin, ed2954ab-2c4d-49bc-bbe2-6fe49db1d75b)",DEPOSIT,1200.00 USD,1200.00 USD
    |""".stripMargin.stripPrefix("\n").replace("\n", "\r\n")

  val ThePunterId = PunterId("69790b82-6c65-4ed9-91eb-b4ba0b8542a8")

  private val stake = Stake.unsafe(DefaultCurrencyMoney(1000))
  val betRequest1 = BetRequest(
    marketId = MarketId(DataProvider.Oddin, "market123"),
    selectionId = "selection123",
    stake = stake,
    odds = Odds(2.0),
    acceptBetterOdds = true)

  val betData = BetData(
    punterId = ThePunterId,
    marketId = betRequest1.marketId,
    selectionId = betRequest1.selectionId,
    stake = stake,
    odds = betRequest1.odds)
}
