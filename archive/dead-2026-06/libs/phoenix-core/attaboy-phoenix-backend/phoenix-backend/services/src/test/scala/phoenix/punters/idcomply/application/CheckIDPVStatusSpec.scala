package phoenix.punters.idcomply.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import monocle.syntax.all._
import org.scalatest.GivenWhenThen
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.boundedcontexts.punter.MemorizedTestPuntersContext
import phoenix.notes.support.InMemoryNoteRepository
import phoenix.punters.PunterDataGenerator.generatePunter
import phoenix.punters.PunterDataGenerator.generatePunterWithPartialSSN
import phoenix.punters.PunterDataGenerator.generatePunterWithSSN
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.DocumentNumber
import phoenix.punters.domain.IdDocument
import phoenix.punters.domain.IdDocumentType
import phoenix.punters.domain.LastName
import phoenix.punters.domain.Punter
import phoenix.punters.domain.RegistrationOutcome
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SuspensionEntity
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.punters.idcomply.domain.Events.PunterWasAskedForPhotoVerification
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields.DobDay
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields.DobMonth
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields.DobYear
import phoenix.punters.idcomply.domain.IdComplyService
import phoenix.punters.idcomply.domain.OpenKey
import phoenix.punters.idcomply.domain.TokenId
import phoenix.punters.idcomply.support.IdComplyServiceMock
import phoenix.punters.idcomply.support.InMemoryRegistrationEventRepository
import phoenix.punters.idcomply.support.RegistrationDataGenerator.IDPV.generateFullMatchIDPVTokenStatusResponse
import phoenix.punters.idcomply.support.RegistrationDataGenerator.generateFullSSN
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.support.FutureSupport
import phoenix.time.FakeHardcodedClock
import phoenix.utils.RandomUUIDGenerator

class CheckIDPVStatusSpec extends AnyWordSpec with Matchers with FutureSupport with GivenWhenThen {
  implicit val clock = new FakeHardcodedClock()
  implicit val ec: ExecutionContext = scala.concurrent.ExecutionContext.Implicits.global
  val twentyOneYearsAgo = clock.currentOffsetDateTime().minusYears(21).toLocalDate

  def checkIdpvStatusBuilder(
      puntersRepository: InMemoryPuntersRepository = new InMemoryPuntersRepository(),
      puntersContext: MemorizedTestPuntersContext = new MemorizedTestPuntersContext(),
      registrationEventRepository: InMemoryRegistrationEventRepository = new InMemoryRegistrationEventRepository(),
      idComplyService: IdComplyService = IdComplyServiceMock()): CheckIDPVStatus = {
    new CheckIDPVStatus(
      puntersBoundedContext = puntersContext,
      registrationEventRepository = registrationEventRepository,
      puntersRepository = puntersRepository,
      idComplyService = idComplyService,
      notesRepository = new InMemoryNoteRepository(),
      excludedPlayersRepository = new InMemoryExcludedPlayersRepository,
      uuidGenerator = RandomUUIDGenerator,
      clock = clock)
  }

  "it should check if details match" in {
    Given("punter record with last 4-digits of SSN")
    val fullSSN = generateFullSSN()
    val existingRegisteredUser = generatePunterWithPartialSSN(ssn = fullSSN)
    val document = IdDocument(IdDocumentType.Passport, DocumentNumber("123456789"))
    And("corrected data from IDVP")

    val correctedUserDetails = correctedUserDetailsFrom(existingRegisteredUser, fullSSN, document)

    When("checking if details match")
    val idpv = checkIdpvStatusBuilder()
    val out = idpv.checkIfDetailsMatch(existingRegisteredUser, correctedUserDetails)
    val either = await(out.value)

    Then("details should match")
    either shouldBe Right(())
  }

  "it should return specific errors for details match" in {
    //given
    val existingPunter = generatePunterWithSSN(ssn = FullSSN("111114444"))
    val document = IdDocument(IdDocumentType.Passport, DocumentNumber("123456789"))
    val correctedUserDetails = correctedUserDetailsFrom(generatePunterWithSSN(), ssn = FullSSN("999995555"), document)

    //when
    val out = ComparePunterData.checkDetailsValidate(existingPunter, correctedUserDetails).toEither

    //then
    out.isLeft shouldBe true
    val errors = out.left.toOption.get.toList.mkString(",")
    errors should include("date of birth is different")
    errors should include("lastName is different")
    errors.toLowerCase should include(existingPunter.details.name.lastName.normalized.toOption.get.value)
    errors.toLowerCase should include(correctedUserDetails.lastName.normalized.toOption.get.value)
    errors should include("ssn is different")
  }

  "it should normalise last names before comparison" in {
    Given("punter record with last 4-digits of SSN")
    val fullSSN = generateFullSSN()
    val existingRegisteredUser = generatePunterWithPartialSSN(ssn = fullSSN)
    val document = IdDocument(IdDocumentType.Passport, DocumentNumber("123456789"))

    And("corrected data from IDVP")
    val correctedUserDetails = correctedUserDetailsFrom(existingRegisteredUser, fullSSN, document).copy(lastName =
      LastName("  " + existingRegisteredUser.details.name.lastName.value.toUpperCase + "   ").toOption.get)

    When("checking if details match")
    val idpv = checkIdpvStatusBuilder()
    val out = idpv.checkIfDetailsMatch(existingRegisteredUser, correctedUserDetails)
    val either = await(out.value)

    Then("details should match")
    either shouldBe Right(())
  }

  "it should store punter id document after successful match" in {
    val puntersRepository = new InMemoryPuntersRepository()
    val registrationEventRepository = new InMemoryRegistrationEventRepository()

    Given("punter record with last 4-digits of SSN")
    val fullSSN = generateFullSSN()
    val existingRegisteredUser = generatePunterWithPartialSSN(ssn = fullSSN)
    await(
      registrationEventRepository.save(
        PunterWasAskedForPhotoVerification(
          existingRegisteredUser.punterId,
          clock.currentOffsetDateTime(),
          TokenId("test"),
          OpenKey("test"))))

    And("full match response for punter on record with id document details")
    val fullMatchResponse = generateFullMatchIDPVTokenStatusResponse().copy(
      lastName = IDPVUserFields.LastName(existingRegisteredUser.details.name.lastName.value),
      ssn = IDPVUserFields.SSN(fullSSN.value),
      dobDay = IDPVUserFields.DobDay(existingRegisteredUser.details.dateOfBirth.day),
      dobMonth = IDPVUserFields.DobMonth(existingRegisteredUser.details.dateOfBirth.month),
      dobYear = IDPVUserFields.DobYear(existingRegisteredUser.details.dateOfBirth.year))
    val document = IdDocument(
      IdTypeToDocumentTypeMapper.idDocumentType(fullMatchResponse.idType).toOption.get,
      DocumentNumber(fullMatchResponse.idNumber.value))

    When("checking if details match")
    awaitRight(puntersRepository.register(existingRegisteredUser, clock.currentOffsetDateTime()))
    val idComplyService = IdComplyServiceMock(getIDPVTokenStatusFn = _ => Future.successful(fullMatchResponse))
    val idpv = checkIdpvStatusBuilder(
      puntersRepository = puntersRepository,
      registrationEventRepository = registrationEventRepository,
      idComplyService = idComplyService)

    awaitRight(idpv.checkIDPVStatus(existingRegisteredUser.punterId))

    Then("details should match")
    val punterAfterUpdate = await(puntersRepository.findByPunterId(existingRegisteredUser.punterId)).get
    punterAfterUpdate.details.document should ===(Some(document))
  }

  private def correctedUserDetailsFrom(existingRegisteredUser: Punter, ssn: FullSSN, document: IdDocument) = {
    CorrectedUserDetails(
      firstName = Some(existingRegisteredUser.details.name.firstName),
      lastName = existingRegisteredUser.details.name.lastName,
      ssn = ssn,
      dateOfBirth = existingRegisteredUser.details.dateOfBirth,
      address = Some(existingRegisteredUser.details.address.addressLine),
      city = Some(existingRegisteredUser.details.address.city),
      zipcode = Some(existingRegisteredUser.details.address.zipcode),
      country = Some(existingRegisteredUser.details.address.country),
      document = document)
  }

  "it should record failed registration" in {

    Given("punter record in puntersRepository")

    val punterId = PunterId("8aef47ea-196a-42db-9572-9cd2df895403")
    val existingPunter = generatePunter().copy(punterId = punterId)

    val puntersRepository = new InMemoryPuntersRepository()
    val puntersContext = new MemorizedTestPuntersContext()
    val idpv: CheckIDPVStatus = checkIdpvStatusBuilder(puntersRepository, puntersContext)

    puntersRepository.startPunterRegistration(existingPunter, clock.currentOffsetDateTime())

    val fullSSN = generateFullSSN()

    And("existing user with DOB+1 day")
    val existingRegisteredUser = existingPunter.copy(
      details = existingPunter.details.copy(dateOfBirth = DateOfBirth.unsafeFrom(twentyOneYearsAgo.plusDays(1))),
      ssn = Right(fullSSN))

    And("corrected data from IDPV with different DOB")
    val correctedUserDetails = CorrectedUserDetails(
      firstName = Some(existingRegisteredUser.details.name.firstName),
      lastName = existingRegisteredUser.details.name.lastName,
      ssn = fullSSN,
      dateOfBirth = DateOfBirth.unsafeFrom(twentyOneYearsAgo),
      address = Some(existingRegisteredUser.details.address.addressLine),
      city = Some(existingRegisteredUser.details.address.city),
      zipcode = Some(existingRegisteredUser.details.address.zipcode),
      country = Some(existingRegisteredUser.details.address.country),
      document = IdDocument(IdDocumentType.Passport, DocumentNumber("123456789")))

    When("checking correctness")
    val out = idpv.checkCorrectnessAndRecord(punterId, existingRegisteredUser, correctedUserDetails)
    val error = awaitLeft(out)

    Then("registration check should fail")
    error shouldBe CheckIDPVStatusError.PunterRegistrationFailed
    And("punter should be suspended")
    val punterRecord = puntersContext.suspensions.get.filter(_._1 == punterId).head
    punterRecord._2 shouldBe SuspensionEntity.RegistrationIssue.RegistrationDataMismatch

    And("punter registration should be marked as failed")
    puntersRepository.registrationConfirmations(punterId).outcome should ===(RegistrationOutcome.Failed)

  }

  "it should find incorrect data from IDPV search and not update personal details" in {
    Given("punterId and IDPV full match")
    val punterId = PunterId("18b1edfc-4db6-4699-8977-932ef974eb07")
    val dateOfBirth = DateOfBirth.unsafeFrom(twentyOneYearsAgo)
    val ssn = generateFullSSN()
    val existingPunter =
      generatePunterWithPartialSSN(punterId = punterId, ssn = ssn).focus(_.details.dateOfBirth).replace(dateOfBirth)

    val idpvFullMatch = generateFullMatchIDPVTokenStatusResponse().copy(
      lastName = IDPVUserFields.LastName(existingPunter.details.name.lastName.value),
      ssn = IDPVUserFields.SSN(ssn.value),
      dobDay = DobDay(dateOfBirth.day + 1),
      dobMonth = DobMonth(dateOfBirth.month),
      dobYear = DobYear(dateOfBirth.year))

    When("checking full match")
    val puntersRepository = new InMemoryPuntersRepository()
    val puntersContext = new MemorizedTestPuntersContext()
    val idpv: CheckIDPVStatus = checkIdpvStatusBuilder(puntersRepository, puntersContext)
    puntersRepository.startPunterRegistration(existingPunter, clock.currentOffsetDateTime())

    val out = idpv.handleFullMatch(punterId, idpvFullMatch)
    val either = await(out.value)

    Then("it should fail")
    either shouldBe Left(CheckIDPVStatusError.PunterRegistrationFailed)

    And("punter details that are different should not be corrected")
    await(puntersRepository.findByPunterId(punterId).value).get.details.dateOfBirth shouldBe dateOfBirth

    And("punter should be suspended")
    val punterRecord = puntersContext.suspensions.get.filter(_._1 == punterId).head
    punterRecord._2 shouldBe SuspensionEntity.RegistrationIssue.RegistrationDataMismatch
  }
}
