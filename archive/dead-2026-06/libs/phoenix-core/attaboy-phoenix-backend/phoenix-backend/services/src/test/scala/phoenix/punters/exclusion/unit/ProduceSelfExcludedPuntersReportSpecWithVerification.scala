package phoenix.punters.exclusion.unit

import java.util.UUID
import java.util.concurrent.Executors

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration._
import scala.util.Random

import cats.data.OptionT
import cats.syntax.traverse._
import monocle.syntax.all._
import org.scalatest.GivenWhenThen
import org.scalatest.LoneElement
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.TimeUtils._
import phoenix.punters.PunterDataGenerator.generateRegisteredUser
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.IdDocument
import phoenix.punters.domain.IdDocumentType
import phoenix.punters.domain.Punter
import phoenix.punters.domain.RegisteredUser
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.UserId
import phoenix.punters.exclusion.application.ProduceSelfExcludedPuntersReport
import phoenix.punters.exclusion.domain.DocumentNumber
import phoenix.punters.exclusion.domain.DocumentType
import phoenix.punters.exclusion.domain.LicenseId
import phoenix.punters.exclusion.domain.SelfExcludedPunterReportData
import phoenix.punters.exclusion.domain.SelfExcludedPuntersReport
import phoenix.punters.exclusion.domain.SkinId
import phoenix.punters.exclusion.support.ExclusionDataGenerator.generateSelfExcludedPunter
import phoenix.punters.exclusion.support.InMemorySelfExcludedPuntersRepository
import phoenix.punters.exclusion.support.MemorizingSelfExcludedPunterReportPublisher
import phoenix.punters.idcomply.support.RegistrationDataGenerator.generateFullSSN
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.punters.support.PunterConverters.RegisteredUserOps
import phoenix.punters.support.TestAuthenticationRepository
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock

final class ProduceSelfExcludedPuntersReportSpecWithVerification
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with LoneElement
    with GivenWhenThen {

  private implicit val ec: ExecutionContext = ExecutionContext.fromExecutor(Executors.newSingleThreadExecutor())

  "it should produce an empty report when no users have been self-excluded" in {
    implicit val clock = new FakeHardcodedClock()
    val authenticationRepository = new TestAuthenticationRepository()
    val puntersRepository = new InMemoryPuntersRepository()
    val selfExcludedPuntersRepository = new InMemorySelfExcludedPuntersRepository()
    val selfExcludedPunterReportPublisher = new MemorizingSelfExcludedPunterReportPublisher()
    val licenseId = LicenseId("fake_license_id")
    val skinId = SkinId("some_skin_id")

    val useCase = new ProduceSelfExcludedPuntersReport(
      authenticationRepository,
      puntersRepository,
      selfExcludedPuntersRepository,
      selfExcludedPunterReportPublisher,
      clock,
      licenseId,
      skinId)

    awaitRight(useCase.produceReport())

    selfExcludedPunterReportPublisher.reports.loneElement shouldBe SelfExcludedPuntersReport(
      reportGeneratedAt = clock.currentOffsetDateTime().toLocalDate,
      licenseId,
      puntersData = List.empty)
  }

  "it should produce a report with punters that have been self excluded over the last 7 days" in {
    implicit val clock = new FakeHardcodedClock()
    val sevenDaysAgo = clock.currentOffsetDateTime().atBeginningOfDay() - 7.days

    Given("An environment with punters both inside and outside the 7 day query range")
    val excludedUsersOutsideRange = List(
      generateSelfExcludedPunter().copy(excludedAt = sevenDaysAgo - 1.second),
      generateSelfExcludedPunter().copy(excludedAt = sevenDaysAgo - 2.days))
    val excludedUsersInsideRange = List(
      generateSelfExcludedPunter().copy(excludedAt = sevenDaysAgo + 1.second),
      generateSelfExcludedPunter().copy(excludedAt = sevenDaysAgo + 1.day),
      generateSelfExcludedPunter().copy(excludedAt = sevenDaysAgo + 3.days))

    Given("The punters have all the necessary data to fulfill the report")
    val registeredUserData: Map[PunterId, RegisteredUser] = excludedUsersInsideRange
      .map(_.punterId)
      .map(punterId => punterId -> generateRegisteredUser().copy(userId = UserId(UUID.fromString(punterId.value))))
      .toMap
    val ssns = excludedUsersInsideRange.map(_.punterId).map(punterId => punterId -> generateFullSSN()).toMap

    val authenticationRepository = new TestAuthenticationRepository() {
      override def findUser(userId: AuthenticationRepository.UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
        userId match {
          case UserLookupId.ByPunterId(id) =>
            Future.successful(registeredUserData.get(id).map(_.toKeycloakUser()))
          case _ => Future.successful(None)
        }
      }
    }
    val puntersRepository = new InMemoryPuntersRepository() {
      override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] =
        OptionT.fromOption(
          registeredUserData
            .get(punterId)
            .map(
              _.toPunter(ssns.get(punterId))
                .focus(_.details.document)
                .replace(Some(IdDocument(IdDocumentType.Passport, domain.DocumentNumber("123456789"))))))
    }
    val selfExcludedPuntersRepository = new InMemorySelfExcludedPuntersRepository()
    val selfExcludedPunterReportPublisher = new MemorizingSelfExcludedPunterReportPublisher()

    await(
      Random
        .shuffle(excludedUsersOutsideRange ++ excludedUsersInsideRange)
        .traverse(selfExcludedPuntersRepository.upsert))

    val licenseId = LicenseId("fake_license_id")
    val skinId = SkinId("some_skin_id")

    When("The report is produced")
    val useCase = new ProduceSelfExcludedPuntersReport(
      authenticationRepository,
      puntersRepository,
      selfExcludedPuntersRepository,
      selfExcludedPunterReportPublisher,
      clock,
      licenseId,
      skinId)
    awaitRight(useCase.produceReport())

    Then("The expected report should have been published")
    val expectedReport = SelfExcludedPuntersReport(
      reportGeneratedAt = clock.currentOffsetDateTime().toLocalDate,
      licenseId,
      puntersData = excludedUsersInsideRange.sortBy(_.excludedAt).map { selfExcludedPunter =>
        {
          val registeredUser = registeredUserData(selfExcludedPunter.punterId)
          val ssn = ssns(selfExcludedPunter.punterId)

          SelfExcludedPunterReportData(
            selfExcludedPunter.punterId,
            skinId,
            registeredUser.details.name,
            registeredUser.details.address,
            ssn,
            registeredUser.details.dateOfBirth,
            selfExcludedPunter.excludedAt,
            selfExcludedPunter.exclusionDuration,
            registeredUser.lastSignIn.get,
            documentType = DocumentType("PASSPORT"),
            documentNumber = DocumentNumber("123456789"))
        }
      })

    selfExcludedPunterReportPublisher.reports.loneElement should ===(expectedReport)
  }

  "it should use SSN as an id document when it's not present in punter details" in {
    implicit val clock = new FakeHardcodedClock()
    val sevenDaysAgo = clock.currentOffsetDateTime().atBeginningOfDay() - 7.days

    Given("An environment with punter withput an id document")
    val fullSSN = generateFullSSN()
    val excludedPunter = generateSelfExcludedPunter().copy(excludedAt = sevenDaysAgo + 1.day)
    val registeredUser = generateRegisteredUser().copy(userId = UserId(UUID.fromString(excludedPunter.punterId.value)))
    val punter = registeredUser.toPunter(Some(fullSSN)).focus(_.details.document).replace(None)

    Given("The punter doesn't have a defined document")
    val authenticationRepository = new TestAuthenticationRepository() {
      override def findUser(userId: AuthenticationRepository.UserLookupId): Future[Option[RegisteredUserKeycloak]] =
        Future.successful(Some(registeredUser.toKeycloakUser()))
    }
    val puntersRepository = new InMemoryPuntersRepository() {
      override def findByPunterId(punterId: PunterId): OptionT[Future, Punter] = OptionT.some(punter)
    }

    val selfExcludedPuntersRepository = new InMemorySelfExcludedPuntersRepository()
    val selfExcludedPunterReportPublisher = new MemorizingSelfExcludedPunterReportPublisher()

    await(selfExcludedPuntersRepository.upsert(excludedPunter))

    val licenseId = LicenseId("fake_license_id")
    val skinId = SkinId("some_skin_id")

    When("The report is produced")
    val useCase = new ProduceSelfExcludedPuntersReport(
      authenticationRepository,
      puntersRepository,
      selfExcludedPuntersRepository,
      selfExcludedPunterReportPublisher,
      clock,
      licenseId,
      skinId)
    awaitRight(useCase.produceReport())

    Then("The expected report should have been published")
    val expectedReport = SelfExcludedPuntersReport(
      reportGeneratedAt = clock.currentOffsetDateTime().toLocalDate,
      licenseId,
      puntersData = List(
        SelfExcludedPunterReportData(
          excludedPunter.punterId,
          skinId,
          registeredUser.details.name,
          registeredUser.details.address,
          fullSSN,
          registeredUser.details.dateOfBirth,
          excludedPunter.excludedAt,
          excludedPunter.exclusionDuration,
          registeredUser.lastSignIn.get,
          documentType = DocumentType("SSN"),
          documentNumber = DocumentNumber(fullSSN.value))))

    selfExcludedPunterReportPublisher.reports.loneElement should ===(expectedReport)
  }
}
