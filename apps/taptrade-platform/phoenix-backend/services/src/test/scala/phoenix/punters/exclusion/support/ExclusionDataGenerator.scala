package phoenix.punters.exclusion.support

import java.time.LocalDate
import java.time.OffsetDateTime

import phoenix.punters.PunterDataGenerator.Api.generatePunterId
import phoenix.punters.PunterDataGenerator.generateSelfExclusionDuration
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.exclusion
import phoenix.punters.exclusion.domain.ExcludedPlayer
import phoenix.punters.exclusion.domain.Exclusion
import phoenix.punters.exclusion.domain.ExclusionStatus
import phoenix.punters.exclusion.domain.ExclusionType
import phoenix.punters.exclusion.domain.Name
import phoenix.punters.exclusion.domain.SelfExcludedPunter
import phoenix.support.DataGenerator.randomCountry
import phoenix.support.DataGenerator.randomElement
import phoenix.support.DataGenerator.randomEnumValue
import phoenix.support.DataGenerator.randomOffsetDateTime
import phoenix.support.DataGenerator.randomOption
import phoenix.support.DataGenerator.randomString
import phoenix.support.UnsafeValueObjectExtensions._

object ExclusionDataGenerator {
  def generateSelfExcludedPunter(): SelfExcludedPunter =
    SelfExcludedPunter(generatePunterId(), generateSelfExclusionDuration(), randomOffsetDateTime())

  def generateName(): Name =
    Name(
      firstName = randomString(length = 4),
      middleName = randomOption(randomString(length = 5)),
      lastName = randomString(length = 4))

  def generateExclusionAddress(): exclusion.domain.Address =
    exclusion.domain.Address(
      street1 = randomString(),
      street2 = randomOption(randomString()),
      city = randomString(),
      state = randomOption(randomString()),
      country = randomCountry(),
      zipcode = randomString())

  def generateExclusion(status: ExclusionStatus = randomEnumValue[ExclusionStatus]()): Exclusion =
    Exclusion(
      exclusionType = randomEnumValue[ExclusionType](),
      status = status,
      submittedDate = OffsetDateTime.parse("2013-10-31T12:35:01.0-04:00"),
      confirmedDate = Some(LocalDate.parse("2013-10-31")),
      modifiedDate = Some(LocalDate.parse("2013-10-31")),
      removalDate = None)

  def generateExcludedPlayer(status: ExclusionStatus = randomEnumValue[ExclusionStatus]()): ExcludedPlayer =
    ExcludedPlayer(
      name = generateName(),
      address = generateExclusionAddress(),
      ssn = randomOption(
        randomElement(List(Left(Last4DigitsOfSSN("1234")), Right(FullSSN.fromString("123456789").unsafe())))),
      dateOfBirth = randomOffsetDateTime().toLocalDate,
      exclusion = generateExclusion(status))
}
