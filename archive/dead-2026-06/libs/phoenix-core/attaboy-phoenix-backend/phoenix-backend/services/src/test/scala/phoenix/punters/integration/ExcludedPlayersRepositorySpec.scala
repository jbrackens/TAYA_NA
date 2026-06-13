package phoenix.punters.integration

import java.time.LocalDate
import java.time.OffsetDateTime

import cats.syntax.either._
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpec

import phoenix.core.Clock
import phoenix.punters.domain.SocialSecurityNumber.FullOrPartialSSN
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.exclusion.domain.Address
import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.exclusion.domain.Exclusion
import phoenix.punters.exclusion.domain.ExclusionCandidate
import phoenix.punters.exclusion.domain.ExclusionMatch.CloseMatch
import phoenix.punters.exclusion.domain.ExclusionMatch.ExactMatch
import phoenix.punters.exclusion.domain.ExclusionMatch.NotMatched
import phoenix.punters.exclusion.domain.ExclusionStatus
import phoenix.punters.exclusion.domain.ExclusionType
import phoenix.punters.exclusion.domain.Name
import phoenix.punters.exclusion.domain.NormalizedLastName
import phoenix.punters.exclusion.domain.PersonalDetails
import phoenix.punters.exclusion.infrastructure.SlickExcludedPlayersRepository
import phoenix.punters.exclusion.support.InMemoryExcludedPlayersRepository
import phoenix.support.DatabaseIntegrationSpec
import phoenix.support.FutureSupport
import phoenix.support.ProvidedExecutionContext
import phoenix.support.TruncatedTables
import phoenix.support.UnsafeValueObjectExtensions._

final class ExcludedPlayersRepositorySpec
    extends AnyWordSpec
    with Matchers
    with FutureSupport
    with DatabaseIntegrationSpec
    with ProvidedExecutionContext
    with TruncatedTables {

  private val inMemoryRepository = () => new InMemoryExcludedPlayersRepository
  private val slickRepository = () => {
    truncateTables()
    new SlickExcludedPlayersRepository(dbConfig, Clock.utcClock)
  }

  "InMemoryExcludedPlayersRepository" should behave.like(excludedPlayersRepository(inMemoryRepository))
  "SlickExcludedPlayersRepository" should behave.like(excludedPlayersRepository(slickRepository))

  private def excludedPlayersRepository(emptyRepository: () => ExcludedPlayersRepository): Unit = {
    "should not match if there's no excluded users with given ssn" in {
      // given
      val objectUnderTest = emptyRepository()

      // when
      val exclusionMatch = await(
        objectUnderTest.isExcluded(
          ExclusionCandidate(
            FullSSN.fromString("123454321").unsafe(),
            PersonalDetails(lastName = NormalizedLastName("ANDERS"), dateOfBirth = LocalDate.parse("1950-01-01")))))

      // then
      exclusionMatch shouldBe NotMatched
    }

    "should not match if exclusion is no longer active" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val inactiveExclusion = exclusionEntry(
        name = Name(firstName = "TERESA", middleName = None, lastName = "ANDERS"),
        ssn = Some(FullSSN.fromString("123454321").unsafe().asRight),
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = exclusionRemoved)

      await(objectUnderTest.upsert(inactiveExclusion))

      // when
      val exclusionMatch =
        await(
          objectUnderTest.isExcluded(
            ExclusionCandidate(
              FullSSN.fromString("123454321").unsafe(),
              PersonalDetails(lastName = NormalizedLastName("ANDERS"), dateOfBirth = LocalDate.parse("1950-01-01")))))

      // then
      exclusionMatch shouldBe NotMatched
    }

    "should exact match excluded players by full ssn" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val excludedPlayer = exclusionEntry(
        name = Name(firstName = "TERESA", middleName = None, lastName = "ANDERS"),
        ssn = Some(FullSSN.fromString("123454321").unsafe().asRight),
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = activeExclusion)

      await(objectUnderTest.upsert(excludedPlayer))

      // when
      val exclusionMatch =
        await(
          objectUnderTest.isExcluded(
            ExclusionCandidate(
              FullSSN.fromString("123454321").unsafe(),
              PersonalDetails(lastName = NormalizedLastName("ANDERS"), dateOfBirth = LocalDate.parse("1950-01-01")))))

      // then
      exclusionMatch shouldBe ExactMatch
    }

    "should exact match excluded players by last 4 digits of ssn and date of birth" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val excludedPlayer = exclusionEntry(
        name = Name(firstName = "TERESA", middleName = None, lastName = "ANDERS"),
        ssn = Some(Last4DigitsOfSSN.fromString("4321").unsafe().asLeft),
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = activeExclusion)

      await(objectUnderTest.upsert(excludedPlayer))

      // when
      val exclusionMatch =
        await(
          objectUnderTest.isExcluded(
            ExclusionCandidate(
              FullSSN.fromString("123454321").unsafe(),
              PersonalDetails(
                lastName = NormalizedLastName("NO_LONGER_ANDERS"),
                dateOfBirth = LocalDate.parse("1950-01-01")))))

      // then
      exclusionMatch shouldBe ExactMatch
    }

    "should exact match excluded players by date of birth and last name" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val excludedPlayer = exclusionEntry(
        name = Name(firstName = "TERESA", middleName = None, lastName = "ANDERS"),
        ssn = None,
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = activeExclusion)

      await(objectUnderTest.upsert(excludedPlayer))

      // when
      val exclusionMatch =
        await(
          objectUnderTest.isExcluded(
            ExclusionCandidate(
              FullSSN.fromString("123454321").unsafe(),
              PersonalDetails(lastName = NormalizedLastName("ANDERS"), dateOfBirth = LocalDate.parse("1950-01-01")))))

      // then
      exclusionMatch shouldBe ExactMatch
    }

    "should exact match excluded players by date of birth and last name case insensitive" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val excludedPlayer = exclusionEntry(
        name = Name(firstName = "TERESA", middleName = None, lastName = "ANDERS"),
        ssn = None,
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = activeExclusion)

      await(objectUnderTest.upsert(excludedPlayer))

      // when
      val exclusionMatch =
        await(
          objectUnderTest.isExcluded(
            ExclusionCandidate(
              FullSSN.fromString("123454321").unsafe(),
              PersonalDetails(lastName = NormalizedLastName("Anders"), dateOfBirth = LocalDate.parse("1950-01-01")))))

      // then
      exclusionMatch shouldBe ExactMatch
    }

    "should close match excluded players by date of birth and approximately by last name (levenshtein distance < 2)" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val excludedPlayer = exclusionEntry(
        name = Name(firstName = "TERESA", middleName = None, lastName = "ANDERS"),
        ssn = None,
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = activeExclusion)

      await(objectUnderTest.upsert(excludedPlayer))

      // when
      val exclusionMatch =
        await(
          objectUnderTest.isExcluded(
            ExclusionCandidate(
              FullSSN.fromString("123454321").unsafe(),
              PersonalDetails(lastName = NormalizedLastName("ANDERZ"), dateOfBirth = LocalDate.parse("1950-01-01")))))

      // then
      exclusionMatch shouldBe CloseMatch
    }

    "should not match when date of birth does not match" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val excludedPlayer = exclusionEntry(
        name = Name(firstName = "TERESA", middleName = None, lastName = "ANDERS"),
        ssn = None,
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = activeExclusion)

      await(objectUnderTest.upsert(excludedPlayer))

      // when
      val exclusionMatch =
        await(
          objectUnderTest.isExcluded(
            ExclusionCandidate(
              FullSSN.fromString("123454321").unsafe(),
              PersonalDetails(lastName = NormalizedLastName("ANDERS"), dateOfBirth = LocalDate.parse("1950-01-02")))))

      // then
      exclusionMatch shouldBe NotMatched
    }

    "should not match when date of birth matches, but levenshtein(lastName) >= 2" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val excludedPlayer = exclusionEntry(
        name = Name(firstName = "TERESA", middleName = None, lastName = "ANDERS"),
        ssn = None,
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = activeExclusion)

      await(objectUnderTest.upsert(excludedPlayer))

      // when
      val exclusionMatch =
        await(
          objectUnderTest.isExcluded(
            ExclusionCandidate(
              FullSSN.fromString("123454321").unsafe(),
              PersonalDetails(lastName = NormalizedLastName("AMDERZ"), dateOfBirth = LocalDate.parse("1950-01-01")))))

      // then
      exclusionMatch shouldBe NotMatched
    }

    "should allow removing exclusions" in {
      // given
      val objectUnderTest = emptyRepository()

      // and
      val excludedPlayer = exclusionEntry(
        name = Name(firstName = "TERESA", middleName = None, lastName = "ANDERS"),
        ssn = Some(FullSSN.fromString("123454321").unsafe().asRight),
        dateOfBirth = LocalDate.parse("1950-01-01"),
        exclusion = activeExclusion)

      await(objectUnderTest.upsert(excludedPlayer))

      // when
      val noLongerExcluded = excludedPlayer.copy(exclusion = exclusionRemoved)

      await(objectUnderTest.upsert(noLongerExcluded))

      // then
      val exclusionMatch =
        await(
          objectUnderTest.isExcluded(
            ExclusionCandidate(
              FullSSN.fromString("123454321").unsafe(),
              PersonalDetails(lastName = NormalizedLastName("ANDERS"), dateOfBirth = LocalDate.parse("1950-01-01")))))

      exclusionMatch shouldBe NotMatched
    }
  }

  private def exclusionEntry(
      name: Name,
      ssn: Option[FullOrPartialSSN],
      dateOfBirth: LocalDate,
      exclusion: Exclusion,
      address: Address = anAddress): ExcludedPlayer = ExcludedPlayer(name, address, ssn, dateOfBirth, exclusion)

  private lazy val anAddress = Address(
    street1 = "123 SOME ROAD",
    street2 = None,
    city = "TRENTON",
    state = Some("NJ"),
    country = "US",
    zipcode = "08625")

  private lazy val activeExclusion = Exclusion(
    exclusionType = ExclusionType.Internet,
    status = ExclusionStatus.Active,
    submittedDate = OffsetDateTime.parse("2012-10-01T12:35:01.0-04:00"),
    confirmedDate = Some(LocalDate.parse("2012-10-01")),
    modifiedDate = None,
    removalDate = None)

  private lazy val exclusionRemoved = Exclusion(
    exclusionType = ExclusionType.Internet,
    status = ExclusionStatus.Removed,
    submittedDate = OffsetDateTime.parse("2012-10-01T12:35:01.0-04:00"),
    confirmedDate = Some(LocalDate.parse("2012-10-01")),
    modifiedDate = Some(LocalDate.parse("2013-11-01")),
    removalDate = Some(LocalDate.parse("2013-11-01")))
}
