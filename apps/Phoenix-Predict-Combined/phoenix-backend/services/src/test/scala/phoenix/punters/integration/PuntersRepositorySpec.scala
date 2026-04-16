package phoenix.punters.integration

import java.time.OffsetDateTime

import scala.concurrent.Future

import cats.syntax.traverse._
import monocle.syntax.all._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.http.core.IpAddress
import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.generatePunter
import phoenix.punters.PunterDataGenerator.generatePunterSettings
import phoenix.punters.PunterDataGenerator.generatePunterWithPartialSSN
import phoenix.punters.PunterDataGenerator.generatePunterWithSSN
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.Email
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.LastName
import phoenix.punters.domain.LastSignInData
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PunterSearch
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors.PunterEmailAlreadyExists
import phoenix.punters.domain.PuntersRepositoryErrors.PunterIdAlreadyExists
import phoenix.punters.domain.PuntersRepositoryErrors.PunterIdNotFound
import phoenix.punters.domain.PuntersRepositoryErrors.PunterUsernameAlreadyExists
import phoenix.punters.domain.PuntersRepositoryErrors.SSNAlreadyExists
import phoenix.punters.domain.RegistrationOutcome
import phoenix.punters.domain.SearchConfidence
import phoenix.punters.domain.SelfExcludedPunterSearch
import phoenix.punters.domain.SignInTimestamp
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.Title
import phoenix.punters.exclusion.domain.NormalizedLastName
import phoenix.punters.infrastructure.SlickPuntersRepository
import phoenix.punters.support.InMemoryPuntersRepository
import phoenix.support.ActorSystemIntegrationSpec
import phoenix.support.DataGenerator.randomDateOfBirth
import phoenix.support.DataGenerator.randomName
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.TruncatedTables
import phoenix.support.UnsafeValueObjectExtensions._
import phoenix.support.UserGenerator.generateDateOfBirth
import phoenix.support.UserGenerator.generateFullSSN
import phoenix.support.UserGenerator.generateLastName
import phoenix.support.UserGenerator.generatePersonalDetails
import phoenix.time.FakeHardcodedClock
import phoenix.utils.cryptography.EncryptionPassword

final class PuntersRepositorySpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with ActorSystemIntegrationSpec
    with DatabaseIntegrationSpec
    with TruncatedTables {

  private val additionalSSNLookupPunterId = PunterId("7871242")
  private val additionalSSNLookupValue = Last4DigitsOfSSN("2421")
  private def additionalSSNLookup(punterId: PunterId): Future[Option[Last4DigitsOfSSN]] =
    Future.successful {
      if (punterId == additionalSSNLookupPunterId) Some(Last4DigitsOfSSN("2421"))
      else None
    }

  private val slickRepository = () => {
    truncateTables()
    new SlickPuntersRepository(dbConfig, EncryptionPassword("secret"), additionalSSNLookup)
  }

  private implicit val clock = new FakeHardcodedClock

  private val inMemoryRepository = () => new InMemoryPuntersRepository(additionalSSNLookup)

  "SlickPuntersRepository" should behave.like(puntersRepository(slickRepository))
  "InMemoryPuntersRepository" should behave.like(puntersRepository(inMemoryRepository))

  private def puntersRepository(emptyRepository: () => PuntersRepository): Unit = {
    "should not return punter details for non existing user" in {
      // given
      val objectUnderTest = emptyRepository()

      // when
      val punterId = generatePunterId()

      // then
      await(objectUnderTest.findByPunterId(punterId)) shouldBe None
    }

    "should be able to record and then retrieve punter" in {
      // given
      val objectUnderTest = emptyRepository()

      // when
      val lastSignInData =
        Some(LastSignInData(SignInTimestamp(OffsetDateTime.parse("2022-03-19T16:00Z")), IpAddress("1.2.3.4")))
      val punter = generatePunterWithSSN().focus(_.settings.lastSignIn).replace(lastSignInData)
      awaitRight(objectUnderTest.startPunterRegistration(punter, clock.currentOffsetDateTime()))

      // then
      val retrievedPunter = await(objectUnderTest.findByPunterId(punter.punterId))
      retrievedPunter shouldBe Some(punter)
      retrievedPunter.get.settings.lastSignIn should ===(lastSignInData)
    }

    "should be able to record and then retrieve punter with email lowercased" in {
      // given
      val objectUnderTest = emptyRepository()

      // when
      val punter = generatePunterWithSSN().focus(_.details.email.value).modify(_.toUpperCase)
      awaitRight(objectUnderTest.startPunterRegistration(punter, clock.currentOffsetDateTime()))

      // then
      val retrievedPunter = await(objectUnderTest.findByPunterId(punter.punterId)).get
      retrievedPunter.details.email.value shouldNot be(punter.details.email.value)
      retrievedPunter.details.email.value shouldBe punter.details.email.value.toLowerCase
    }

    "should be able to record, remove their SSN and then retrieve punter with additional ssn lookup" in { // TODO (PHXD-2996): remove when ssns are in sync
      // given
      val objectUnderTest = emptyRepository()

      // when
      val punter = generatePunterWithSSN(punterId = additionalSSNLookupPunterId)
      awaitRight(objectUnderTest.startPunterRegistration(punter, clock.currentOffsetDateTime()))

      // then
      await(objectUnderTest.deleteSSN(punter.punterId)) should ===(1)

      // and
      val retrievedPunter = await(objectUnderTest.findByPunterId(punter.punterId))
      retrievedPunter shouldBe Some(punter.copy(ssn = Left(additionalSSNLookupValue)))
    }

    "should not allow duplicated punter entries" in {
      // given
      val objectUnderTest = emptyRepository()
      val punterId = generatePunterId()

      // and
      awaitRight(
        objectUnderTest
          .startPunterRegistration(generatePunterWithPartialSSN(punterId = punterId), clock.currentOffsetDateTime()))

      // when
      val differentPunterSamePunterId = generatePunterWithPartialSSN(punterId = punterId)
      val recordPunterAttempt =
        awaitLeft(objectUnderTest.startPunterRegistration(differentPunterSamePunterId, clock.currentOffsetDateTime()))
      recordPunterAttempt shouldBe a[PunterIdAlreadyExists.type]
    }

    "should write and read last4digitsOfSsn separately from full ssn" in {
      // given
      val puntersRepository = emptyRepository()
      val punter = generatePunterWithPartialSSN()

      // when
      awaitRight(puntersRepository.startPunterRegistration(punter, clock.currentOffsetDateTime()))

      // then
      val retrievedPunter = await(puntersRepository.findByPunterId(punter.punterId))
      retrievedPunter should ===(Some(punter))
      retrievedPunter.get.ssn should ===(punter.ssn)
    }

    "should not allow duplicated usernames" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val firstPunter = generatePunterWithPartialSSN()
      awaitRight(objectUnderTest.startPunterRegistration(firstPunter, clock.currentOffsetDateTime()))

      // and
      val secondPunter = generatePunterWithPartialSSN()
      awaitRight(objectUnderTest.startPunterRegistration(secondPunter, clock.currentOffsetDateTime()))

      // then
      val recordPunterAttempt = awaitLeft(
        objectUnderTest.startPunterRegistration(
          Punter(
            generatePunterId(),
            details = generatePersonalDetails().copy(userName = firstPunter.details.userName),
            ssn = Left(generateFullSSN().last4Digits),
            generatePunterSettings()),
          clock.currentOffsetDateTime()))
      recordPunterAttempt shouldBe a[PunterUsernameAlreadyExists.type]

      // and
      val updateDetailsAttempt = awaitLeft(
        objectUnderTest.updateDetails(
          secondPunter.punterId,
          update = details => details.copy(userName = firstPunter.details.userName)))
      updateDetailsAttempt shouldBe a[PunterUsernameAlreadyExists.type]
    }

    "should not allow duplicated emails" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val firstPunter = generatePunterWithPartialSSN()
      awaitRight(objectUnderTest.startPunterRegistration(firstPunter, clock.currentOffsetDateTime()))

      // and
      val secondPunter = generatePunterWithPartialSSN()
      awaitRight(objectUnderTest.startPunterRegistration(secondPunter, clock.currentOffsetDateTime()))

      // then
      val recordPunterAttempt = awaitLeft(
        objectUnderTest.startPunterRegistration(
          Punter(
            generatePunterId(),
            details = generatePersonalDetails().copy(email = firstPunter.details.email),
            ssn = Left(generateFullSSN().last4Digits),
            settings = generatePunterSettings()),
          clock.currentOffsetDateTime()))
      recordPunterAttempt shouldBe a[PunterEmailAlreadyExists.type]

      // and
      val updateDetailsAttempt = awaitLeft(
        objectUnderTest
          .updateDetails(secondPunter.punterId, update = details => details.copy(email = firstPunter.details.email)))
      updateDetailsAttempt shouldBe a[PunterEmailAlreadyExists.type]

      // and
      val updateDetailsEmailCasedAttempt = awaitLeft(
        objectUnderTest.updateDetails(
          secondPunter.punterId,
          update = details => details.copy(email = Email(firstPunter.details.email.value.toUpperCase))))
      updateDetailsEmailCasedAttempt shouldBe a[PunterEmailAlreadyExists.type]

    }

    "should be able to update punter personal details" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val punterId = generatePunterId()
      val personalDetails = generatePersonalDetails()
      val punterSettings = generatePunterSettings()

      // and
      awaitRight(
        objectUnderTest.startPunterRegistration(
          Punter(punterId, personalDetails, ssn = Left(generateFullSSN().last4Digits), punterSettings),
          clock.currentOffsetDateTime()))

      // when
      val updatedPersonalDetails = generatePersonalDetails()
      awaitRight(objectUnderTest.updateDetails(punterId, _ => updatedPersonalDetails))

      // then
      val retrievedPunter = await(objectUnderTest.findByPunterId(punterId)).get
      retrievedPunter.details shouldBe updatedPersonalDetails
    }

    "should be able to update punter settings" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val punterId = generatePunterId()
      val personalDetails = generatePersonalDetails()
      val punterSettings = generatePunterSettings()

      // and
      awaitRight(
        objectUnderTest.startPunterRegistration(
          Punter(punterId, personalDetails, ssn = Left(generateFullSSN().last4Digits), punterSettings),
          clock.currentOffsetDateTime()))

      // when
      val updatedPunterSettings = generatePunterSettings()
      awaitRight(objectUnderTest.updateSettings(punterId, _ => updatedPunterSettings))

      // then
      val retrievedPunter = await(objectUnderTest.findByPunterId(punterId)).get
      retrievedPunter.settings shouldBe updatedPunterSettings
    }

    "should not be able to update punter personal details for non existing punter" in {
      // given
      val objectUnderTest = emptyRepository()

      // then
      val attempt = awaitLeft(objectUnderTest.updateDetails(generatePunterId(), _ => generatePersonalDetails()))
      attempt shouldBe a[PunterIdNotFound.type]
    }

    "should not be able to update ssn for non existing punter" in {
      // given
      val objectUnderTest = emptyRepository()

      // then
      val attempt = awaitLeft(objectUnderTest.setSSN(generatePunterId(), generateFullSSN()))
      attempt shouldBe a[PunterIdNotFound.type]
    }

    "should be able to set full punter ssn and override previous last4Digits of ssn" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val punterWithPartialSsn = generatePunterWithPartialSSN()
      val punterId = punterWithPartialSsn.punterId

      // and
      awaitRight(objectUnderTest.startPunterRegistration(punterWithPartialSsn, clock.currentOffsetDateTime()))

      // when
      val fullSSN = generateFullSSN()
      awaitRight(objectUnderTest.setSSN(punterId, fullSSN))

      // then
      val retrievedPunter = await(objectUnderTest.findByPunterId(punterId)).get
      retrievedPunter.ssn should ===(Right(fullSSN))
    }

    "should be able to change punter ssn" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val punter = generatePunterWithSSN()
      val punterId = punter.punterId

      // and
      awaitRight(objectUnderTest.startPunterRegistration(punter, clock.currentOffsetDateTime()))

      // when
      val ssn2 = generateFullSSN()
      awaitRight(objectUnderTest.setSSN(punterId, ssn2))

      // then
      val retrievedPunter = await(objectUnderTest.findByPunterId(punterId)).get
      retrievedPunter.ssn should ===(Right(ssn2))
    }

    "should not allow duplicated ssns" in {
      // given
      val objectUnderTest = emptyRepository()
      val ssn = generateFullSSN()

      // and
      awaitRight(
        objectUnderTest.startPunterRegistration(generatePunterWithSSN(ssn = ssn), clock.currentOffsetDateTime()))

      // when
      val differentPunterSameSSN = generatePunterWithSSN(ssn = ssn)
      val recordPunterAttempt =
        awaitLeft(objectUnderTest.startPunterRegistration(differentPunterSameSSN, clock.currentOffsetDateTime()))
      recordPunterAttempt shouldBe a[SSNAlreadyExists.type]

      // and
      val setSSNAttempt = awaitLeft(objectUnderTest.setSSN(generatePunterId(), ssn))
      setSSNAttempt shouldBe a[SSNAlreadyExists.type]
    }

    "should be able to delete punter data" in {
      // given
      val objectUnderTest = emptyRepository()
      val punterId = generatePunterId()

      // and
      awaitRight(
        objectUnderTest
          .startPunterRegistration(generatePunterWithSSN(punterId = punterId), clock.currentOffsetDateTime()))

      // when
      await(objectUnderTest.delete(punterId))

      // then
      val punterData = await(objectUnderTest.findByPunterId(punterId))
      punterData shouldBe None
    }

    "should only return confirmed punters" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val firstConfirmedPunter = generatePunterWithPartialSSN()

      awaitRight(objectUnderTest.startPunterRegistration(firstConfirmedPunter, clock.currentOffsetDateTime()))
      awaitRight(
        objectUnderTest.markRegistrationFinished(
          firstConfirmedPunter.punterId,
          RegistrationOutcome.Successful,
          clock.currentOffsetDateTime()))

      // and
      val secondConfirmedPunter = generatePunterWithSSN()
      awaitRight(objectUnderTest.startPunterRegistration(secondConfirmedPunter, clock.currentOffsetDateTime()))
      awaitRight(
        objectUnderTest.markRegistrationFinished(
          secondConfirmedPunter.punterId,
          RegistrationOutcome.Successful,
          clock.currentOffsetDateTime()))

      // and
      val registeredPunter = generatePunterWithPartialSSN()
      awaitRight(objectUnderTest.register(registeredPunter, clock.currentOffsetDateTime()))

      // and
      val notConfirmedPunter = generatePunterWithPartialSSN()
      awaitRight(objectUnderTest.startPunterRegistration(notConfirmedPunter, clock.currentOffsetDateTime()))

      // when
      val punters = awaitSource(objectUnderTest.getConfirmedPunters())

      // then
      punters shouldBe Seq(firstConfirmedPunter, secondConfirmedPunter, registeredPunter)
    }

    "should count punters with started registrations" in {
      // given
      val objectUnderTest = emptyRepository()

      // and a registered punter
      awaitRight(objectUnderTest.register(generatePunterWithPartialSSN(), clock.currentOffsetDateTime()))

      // and a punter with only a started registration
      awaitRight(objectUnderTest.startPunterRegistration(generatePunterWithPartialSSN(), clock.currentOffsetDateTime()))

      // and a punter with a started and finished registration
      val startedAndFinishedPunter = generatePunterWithSSN()
      awaitRight(objectUnderTest.startPunterRegistration(startedAndFinishedPunter, clock.currentOffsetDateTime()))
      awaitRight(
        objectUnderTest.markRegistrationFinished(
          startedAndFinishedPunter.punterId,
          RegistrationOutcome.Successful,
          clock.currentOffsetDateTime()))

      // when
      val count = await(objectUnderTest.countPuntersWithStartedRegistration())

      // then
      count shouldBe 3
    }

    "should find punter by full ssn" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val firstPunter = generatePunterWithSSN()
      awaitRight(objectUnderTest.register(firstPunter, clock.currentOffsetDateTime()))

      // and
      val secondPunter = generatePunterWithSSN()
      awaitRight(objectUnderTest.register(secondPunter, clock.currentOffsetDateTime()))

      // when
      val punterSearch =
        SelfExcludedPunterSearch(ssn = Some(firstPunter.ssn), generateLastName(), generateDateOfBirth())
      val searchResult = await(objectUnderTest.findExcludedPunters(punterSearch))

      // then
      searchResult shouldBe Some(firstPunter -> SearchConfidence.ExactMatch)
    }

    "should find punter by partial ssn and date of birth" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val firstPunter = generatePunterWithSSN()
      awaitRight(objectUnderTest.register(firstPunter, clock.currentOffsetDateTime()))

      // and
      val secondPunter = generatePunterWithSSN()
      awaitRight(objectUnderTest.register(secondPunter, clock.currentOffsetDateTime()))

      // when
      val punterSearch =
        SelfExcludedPunterSearch(ssn = Some(firstPunter.ssn), generateLastName(), firstPunter.details.dateOfBirth)
      val searchResult = await(objectUnderTest.findExcludedPunters(punterSearch))

      // then
      searchResult shouldBe Some(firstPunter -> SearchConfidence.ExactMatch)
    }

    "should find punter by last name (exact) and date of birth" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val firstPunter = generatePunterWithSSN()
      awaitRight(objectUnderTest.register(firstPunter, clock.currentOffsetDateTime()))

      // and
      val secondPunter = generatePunterWithSSN()
      awaitRight(objectUnderTest.register(secondPunter, clock.currentOffsetDateTime()))

      // when
      val punterSearch =
        SelfExcludedPunterSearch(
          ssn = None,
          name = NormalizedLastName(firstPunter.details.name.lastName.value),
          dateOfBirth = firstPunter.details.dateOfBirth)
      val searchResult = await(objectUnderTest.findExcludedPunters(punterSearch))

      // then
      searchResult shouldBe Some(firstPunter -> SearchConfidence.ExactMatch)
    }

    "should find punter by last name (close) and date of birth" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val personalDetailsPunter1 = generatePersonalDetails().copy(name =
        PersonalName(Title("Mr").unsafe(), FirstName("Willy").unsafe(), LastName("Wonka").unsafe()))
      val ssn1 = generateFullSSN()
      val punter1 = Punter(generatePunterId(), personalDetailsPunter1, Right(ssn1), generatePunterSettings())
      awaitRight(objectUnderTest.register(punter1, clock.currentOffsetDateTime()))

      // and
      val punter2 = generatePunterWithSSN()
      awaitRight(objectUnderTest.register(punter2, clock.currentOffsetDateTime()))

      // when
      val punterSearch =
        SelfExcludedPunterSearch(
          ssn = None,
          name = NormalizedLastName("Wonke"),
          dateOfBirth = personalDetailsPunter1.dateOfBirth)
      val searchResult = await(objectUnderTest.findExcludedPunters(punterSearch))

      // then
      searchResult shouldBe Some(punter1 -> SearchConfidence.CloseMatch)
    }

    "pending registrations will not show as a search result" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val ssn = generateFullSSN()
      val personalDetails = generatePersonalDetails()
      awaitRight(
        objectUnderTest.startPunterRegistration(
          Punter(generatePunterId(), personalDetails, Right(ssn), generatePunterSettings()),
          clock.currentOffsetDateTime()))

      // when
      val search = SelfExcludedPunterSearch(
        ssn = Some(Right(ssn)),
        name = NormalizedLastName(personalDetails.name.lastName.value),
        dateOfBirth = personalDetails.dateOfBirth)
      val searchResult = await(objectUnderTest.findExcludedPunters(search))

      // then
      searchResult shouldBe None
    }

    "when finding punters by filters (using `findPuntersByFilters`)" should {

      val searchWithoutFilters = PunterSearch(None, None, None, None, None, None)

      "not filter if no filters are used, returning a paginated result" in {
        // given
        val objectUnderTest = emptyRepository()

        // and
        val punters = List.fill(5)(generatePunter())
        awaitRight(punters.traverse(punter => objectUnderTest.register(punter, clock.currentOffsetDateTime())))

        // when
        val pagination = Pagination(currentPage = 2, itemsPerPage = 3)
        val result = await(objectUnderTest.findPuntersByFilters(searchWithoutFilters, pagination))

        // then
        val expectedPage = punters.sortBy(_.punterId.toString).drop(3).take(3)
        val expected = PaginatedResult(expectedPage, punters.size, pagination)
        result shouldBe expected
      }

      "filter by punterId" in {
        // given
        val objectUnderTest = emptyRepository()

        // and
        val punterId = generatePunterId()
        val punterOfGivenPunterId = generatePunter().copy(punterId = punterId)
        val otherPunters = List.fill(2)(generatePunter())
        val allPunters = otherPunters :+ punterOfGivenPunterId
        awaitRight(allPunters.traverse(punter => objectUnderTest.register(punter, clock.currentOffsetDateTime())))

        // when
        val pagination = Pagination(currentPage = 1, itemsPerPage = 5)
        val filterByPunterId = searchWithoutFilters.copy(punterId = Some(punterId))
        val result = await(objectUnderTest.findPuntersByFilters(filterByPunterId, pagination))

        // then
        val expected = PaginatedResult(List(punterOfGivenPunterId), totalCount = 1, paginationRequest = pagination)
        result shouldBe expected
      }

      "filter by first name" in {
        // given
        val objectUnderTest = emptyRepository()

        // and
        val firstName = randomName().firstName
        val puntersOfGivenFirstName = List.fill(3)(generatePunter().focus(_.details.name.firstName).replace(firstName))
        val otherPunters = List.fill(2)(generatePunter())
        val allPunters = otherPunters ++ puntersOfGivenFirstName
        awaitRight(allPunters.traverse(punter => objectUnderTest.register(punter, clock.currentOffsetDateTime())))

        // when
        val pagination = Pagination(currentPage = 1, itemsPerPage = 5)
        val filterByFirstName = searchWithoutFilters.copy(firstName = Some(firstName))
        val result = await(objectUnderTest.findPuntersByFilters(filterByFirstName, pagination))

        // then
        val expected = PaginatedResult(
          puntersOfGivenFirstName.sortBy(_.punterId.toString),
          totalCount = puntersOfGivenFirstName.size,
          paginationRequest = pagination)
        result shouldBe expected
      }

      "filter by last name" in {
        // given
        val objectUnderTest = emptyRepository()

        // and
        val lastName = randomName().lastName
        val puntersOfGivenLastName = List.fill(3)(generatePunter().focus(_.details.name.lastName).replace(lastName))
        val otherPunters = List.fill(2)(generatePunter())
        val allPunters = otherPunters ++ puntersOfGivenLastName
        awaitRight(allPunters.traverse(punter => objectUnderTest.register(punter, clock.currentOffsetDateTime())))

        // when
        val pagination = Pagination(currentPage = 1, itemsPerPage = 5)
        val filterByLastName = searchWithoutFilters.copy(lastName = Some(lastName))
        val result = await(objectUnderTest.findPuntersByFilters(filterByLastName, pagination))

        // then
        val expected = PaginatedResult(
          puntersOfGivenLastName.sortBy(_.punterId.toString),
          totalCount = puntersOfGivenLastName.size,
          paginationRequest = pagination)
        result shouldBe expected

      }

      "filter by date of birth" in {
        // given
        val objectUnderTest = emptyRepository()

        // and
        val dateOfBirth = randomDateOfBirth()
        val puntersOfGivenDOB = List.fill(3)(generatePunter().focus(_.details.dateOfBirth).replace(dateOfBirth))
        val otherPunters = List.fill(2)(generatePunter())
        val allPunters = otherPunters ++ puntersOfGivenDOB
        awaitRight(allPunters.traverse(punter => objectUnderTest.register(punter, clock.currentOffsetDateTime())))

        // when
        val pagination = Pagination(currentPage = 1, itemsPerPage = 5)
        val filterByDateOfBirth = searchWithoutFilters.copy(dateOfBirth = Some(dateOfBirth))
        val result = await(objectUnderTest.findPuntersByFilters(filterByDateOfBirth, pagination))

        // then
        val expected = PaginatedResult(
          puntersOfGivenDOB.sortBy(_.punterId.toString),
          totalCount = puntersOfGivenDOB.size,
          paginationRequest = pagination)
        result shouldBe expected
      }

      "filter by email" in {
        // given
        val objectUnderTest = emptyRepository()

        // and
        val punter1 = generatePunter()
        val email = punter1.details.email

        val otherPunters = List.fill(2)(generatePunter())
        val allPunters = otherPunters ++ List(punter1)
        awaitRight(allPunters.traverse(punter => objectUnderTest.register(punter, clock.currentOffsetDateTime())))

        // when
        val pagination = Pagination(currentPage = 1, itemsPerPage = 5)
        val filterByEmail = searchWithoutFilters.copy(email = Some(email))
        val result = await(objectUnderTest.findPuntersByFilters(filterByEmail, pagination))

        // then
        val expected =
          PaginatedResult(List(punter1).sortBy(_.punterId.toString), totalCount = 1, paginationRequest = pagination)
        result shouldBe expected
      }

      "filter by username" in {
        // given
        val objectUnderTest = emptyRepository()

        // and
        val punter1 = generatePunter()
        val username = punter1.details.userName

        val otherPunters = List.fill(2)(generatePunter())
        val allPunters = otherPunters ++ List(punter1)
        awaitRight(allPunters.traverse(punter => objectUnderTest.register(punter, clock.currentOffsetDateTime())))

        // when
        val pagination = Pagination(currentPage = 1, itemsPerPage = 5)
        val filterByEmail = PunterSearch(username = Some(username))
        val result = await(objectUnderTest.findPuntersByFilters(filterByEmail, pagination))

        // then
        val expected =
          PaginatedResult(List(punter1).sortBy(_.punterId.toString), totalCount = 1, paginationRequest = pagination)
        result shouldBe expected
      }

      "filter by two filters at once (date of birth and last name)" in {
        // given
        val objectUnderTest = emptyRepository()

        // and
        val dateOfBirth = randomDateOfBirth()
        val lastName = randomName().lastName
        val onlyDOBPunters = List.fill(3)(generatePunter().focus(_.details.dateOfBirth).replace(dateOfBirth))
        val onlyLastNamePunters = List.fill(3)(generatePunter().focus(_.details.name.lastName).replace(lastName))
        val bothDOBAndLastNamePunters = List.fill(3)(
          generatePunter()
            .focus(_.details.dateOfBirth)
            .replace(dateOfBirth)
            .focus(_.details.name.lastName)
            .replace(lastName))
        val otherPunters = List.fill(2)(generatePunter())
        val allPunters = otherPunters ++ onlyDOBPunters ++ onlyLastNamePunters ++ bothDOBAndLastNamePunters
        awaitRight(allPunters.traverse(punter => objectUnderTest.register(punter, clock.currentOffsetDateTime())))

        // when
        val pagination = Pagination(currentPage = 1, itemsPerPage = 5)
        val filterByDOBAndLastName =
          searchWithoutFilters.copy(dateOfBirth = Some(dateOfBirth), lastName = Some(lastName))
        val result = await(objectUnderTest.findPuntersByFilters(filterByDOBAndLastName, pagination))

        // then
        val expected = PaginatedResult(
          bothDOBAndLastNamePunters.sortBy(_.punterId.toString),
          totalCount = onlyDOBPunters.size,
          paginationRequest = pagination)
        result shouldBe expected
      }

      "filter by uppercase last name" in {
        // given
        val objectUnderTest = emptyRepository()

        // and
        val lastName = randomName().lastName
        val puntersWithEquivalentLastName =
          List(
            generatePunter().focus(_.details.name.lastName.value).replace(lastName.value.toUpperCase),
            generatePunter().focus(_.details.name.lastName.value).replace(lastName.value.toLowerCase),
            generatePunter().focus(_.details.name.lastName.value).replace(lastName.value))
        val otherPunters = List.fill(2)(generatePunter())
        val allPunters = otherPunters ++ puntersWithEquivalentLastName
        awaitRight(allPunters.traverse(punter => objectUnderTest.register(punter, clock.currentOffsetDateTime())))

        // when
        val pagination = Pagination(currentPage = 1, itemsPerPage = 5)
        val filterByLastName = searchWithoutFilters.copy(lastName = Some(lastName))
        val result = await(objectUnderTest.findPuntersByFilters(filterByLastName, pagination))

        // then
        val expected = PaginatedResult(
          puntersWithEquivalentLastName.sortBy(_.punterId.toString),
          totalCount = puntersWithEquivalentLastName.size,
          paginationRequest = pagination)
        result shouldBe expected

      }

      "filter by two uppercase filters at once (first name and last name)" in {
        // given
        val objectUnderTest = emptyRepository()

        // and
        val firstName: FirstName = randomName().firstName
        val lastName: LastName = randomName().lastName
        val onlyFirstNamePunters =
          List.fill(3)(generatePunter().focus(_.details.name.firstName.value).replace(firstName.value.toUpperCase()))
        val onlyLastNamePunters =
          List.fill(3)(generatePunter().focus(_.details.name.lastName.value).replace(lastName.value.toUpperCase()))
        val bothFirstAndLastNamePunters = List.fill(3)(
          generatePunter()
            .focus(_.details.name.firstName)
            .replace(firstName)
            .focus(_.details.name.lastName)
            .replace(lastName))
        val otherPunters = List.fill(2)(generatePunter())
        val allPunters = otherPunters ++ onlyFirstNamePunters ++ onlyLastNamePunters ++ bothFirstAndLastNamePunters
        awaitRight(allPunters.traverse(punter => objectUnderTest.register(punter, clock.currentOffsetDateTime())))

        // when
        val pagination = Pagination(currentPage = 1, itemsPerPage = 5)
        val filterByFirstAndLastName =
          searchWithoutFilters.copy(firstName = Some(firstName), lastName = Some(lastName))
        val result = await(objectUnderTest.findPuntersByFilters(filterByFirstAndLastName, pagination))

        // then
        val expected = PaginatedResult(
          bothFirstAndLastNamePunters.sortBy(_.punterId.toString),
          totalCount = onlyFirstNamePunters.size,
          paginationRequest = pagination)
        result shouldBe expected
      }

      "return date of registration for punter" in {
        // given
        val objectUnderTest = emptyRepository()

        val punter = generatePunter()
        val registrationTime = clock.currentOffsetDateTime()
        awaitRight(objectUnderTest.register(punter, registrationTime))

        await(objectUnderTest.getRegisteredAt(punter.punterId)) should ===(Some(registrationTime))
        await(objectUnderTest.getRegisteredAt(generatePunterId())) should ===(None)
      }
    }
  }
}
