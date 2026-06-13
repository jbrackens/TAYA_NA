package phoenix.punters.idcomply.support

import java.time.Instant
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

import scala.util.Random

import com.github.javafaker.Faker
import io.scalaland.chimney.dsl._
import org.apache.commons.lang3.RandomUtils

import phoenix.punters.PunterDataGenerator
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.MaybeValidPassword
import phoenix.punters.domain.Confidence
import phoenix.punters.domain.DeviceFingerprint
import phoenix.punters.domain.SocialSecurityNumber.First5DigitsOfSSN
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.VisitorId
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenResult
import phoenix.punters.idcomply.domain.Events.KYCResultEventData
import phoenix.punters.idcomply.domain.Events.PunterAnsweredQuestions
import phoenix.punters.idcomply.domain.Events.PunterFailedPhotoVerification
import phoenix.punters.idcomply.domain.Events.PunterGotFailedKYCResponse
import phoenix.punters.idcomply.domain.Events.PunterGotSuccessfulKYCResponse
import phoenix.punters.idcomply.domain.Events.PunterPhotoVerificationTokenStatusWasChecked
import phoenix.punters.idcomply.domain.Events.PunterSignUpStarted
import phoenix.punters.idcomply.domain.Events.PunterWasAskedForPhotoVerification
import phoenix.punters.idcomply.domain.Events.PunterWasAskedQuestions
import phoenix.punters.idcomply.domain.Events.RegistrationEvent
import phoenix.punters.idcomply.domain.Events.SignUpEventData
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields
import phoenix.punters.idcomply.domain.Question
import phoenix.punters.idcomply.domain.RequestKYC.KYCError
import phoenix.punters.idcomply.domain.RequestKYC.KYCErrorKey
import phoenix.punters.idcomply.domain.RequestKYC.KYCMatch
import phoenix.punters.idcomply.domain.RequestKYC.KYCResult
import phoenix.punters.idcomply.domain.RequestKYC.RequestError
import phoenix.punters.idcomply.domain.UserFields._
import phoenix.punters.idcomply.domain._
import phoenix.punters.idcomply.infrastructure.ApiKey
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SignUpRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SignUpVerification
import phoenix.support.DataGenerator._
import phoenix.support.UnsafeValueObjectExtensions._

object RegistrationDataGenerator {

  private val faker = new Faker()

  def generateApiKey(): ApiKey =
    ApiKey(UUID.randomUUID().toString)

  def generateTransactionId(): TransactionId =
    TransactionId(UUID.randomUUID().toString)

  def generateFirstName(): FirstName =
    FirstName(faker.name().firstName())

  def generateLastName(): LastName =
    LastName(faker.name().lastName())

  def generateBuildingName(): BuildingName =
    BuildingName(faker.address().streetName())

  def generateCity(): City =
    City(faker.address().city())

  def generateState(): State =
    State(faker.address().state())

  def generateZipcode(): ZipCode =
    ZipCode(faker.address().zipCode())

  def generatePhoneNumber(): PhoneNumber =
    PhoneNumber(faker.phoneNumber().phoneNumber())

  def generateDateOfBirth(): (DateOfBirthDay, DateOfBirthMonth, DateOfBirthYear) = {
    val ms = RandomUtils.nextLong(0, 70L * 365 * 24 * 60 * 60 * 1000)
    val odt = OffsetDateTime.ofInstant(Instant.ofEpochMilli(ms), ZoneOffset.UTC)
    (DateOfBirthDay(odt.getDayOfMonth), DateOfBirthMonth(odt.getMonthValue), DateOfBirthYear(odt.getYear))
  }

  def generateDeviceFingerprint(): DeviceFingerprint = {
    DeviceFingerprint(
      VisitorId.unsafe(faker.regexify("[a-zA-Z0-9]{20}")),
      Confidence.unsafe(RandomUtils.nextFloat(0.0f, 1.0f)))
  }

  def generateLastFourDigitsOfSocialSecurityNumber(): LastFourDigitsOfSocialSecurityNumber =
    LastFourDigitsOfSocialSecurityNumber(faker.number().digits(4))

  def generateFirstFiveDigitsOfSocialSecurityNumber(): First5DigitsOfSSN =
    First5DigitsOfSSN.fromString(faker.number().digits(5)).unsafe()

  def generateSignUpVerification(): SignUpVerification =
    SignUpVerification(
      PunterDataGenerator.generateTwilioVerificationId(),
      PunterDataGenerator.generateVerificationCode())

  def generateSignUpRequest(): SignUpRequest = {
    SignUpRequest(
      name = randomName(),
      username = randomUsername(),
      email = randomEmail(),
      phoneNumber = randomMobilePhoneNumber(),
      password = MaybeValidPassword(randomValidPassword().value),
      address = randomAddress(),
      dateOfBirth = randomDateOfBirth(),
      gender = Some(randomGender()),
      ssn = Last4DigitsOfSSN(generateLastFourDigitsOfSocialSecurityNumber().value),
      referralCode = None,
      deviceFingerprint = Some(generateDeviceFingerprint()))
  }

  def generateUserFields(punterId: PunterId): UserFields = {
    val name = randomName()
    val address = randomAddress()
    val dateOfBirth = randomDateOfBirth()
    UserFields(
      userId = punterId,
      firstName = FirstName(name.firstName.value),
      lastName = LastName(name.lastName.value),
      buildingName = BuildingName(address.addressLine.value),
      city = City(address.city.value),
      state = State(address.state.value),
      zip = ZipCode(address.zipcode.value),
      country = Country(address.country.value),
      dobDay = DateOfBirthDay(dateOfBirth.day),
      dobMonth = DateOfBirthMonth(dateOfBirth.month),
      dobYear = DateOfBirthYear(dateOfBirth.year),
      ssn = LastFourDigitsOfSocialSecurityNumber(generateLastFourDigitsOfSocialSecurityNumber().value))
  }

  def generateFullSSN(): FullSSN = {
    val lastFourDigits =
      Last4DigitsOfSSN.fromString(faker.number().digits(4)).unsafe()
    val firstFiveDigits = generateFirstFiveDigitsOfSocialSecurityNumber()

    FullSSN.from(firstFiveDigits, lastFourDigits)
  }

  def generateIDPVTokenStatus(): IDPVTokenStatus =
    randomElement(IDPVTokenStatus.values)

  def generatePunterSignUpStarted(punterId: PunterId): PunterSignUpStarted =
    PunterSignUpStarted(punterId, randomOffsetDateTime(), generateSignUpRequest().transformInto[SignUpEventData])

  def generatePunterGotSuccessfulKYCResponse(punterId: PunterId): PunterGotSuccessfulKYCResponse =
    PunterGotSuccessfulKYCResponse(
      punterId,
      randomOffsetDateTime(),
      KYCResultEventData.fromKYCResult(KYC.generateKYCResult()))

  def generatePunterGotFailedKYCResponse(punterId: PunterId): PunterGotFailedKYCResponse =
    PunterGotFailedKYCResponse(punterId, randomOffsetDateTime(), KYC.generateKYCError())

  def generatePunterWasAskedQuestions(punterId: PunterId): PunterWasAskedQuestions =
    PunterWasAskedQuestions(punterId, randomOffsetDateTime(), generateTransactionId(), KBA.generateQuestions())

  def generatePunterAnsweredQuestions(punterId: PunterId): PunterAnsweredQuestions =
    PunterAnsweredQuestions(
      punterId,
      randomOffsetDateTime(),
      generateTransactionId(),
      KBA.generateAnswers(KBA.generateQuestions()))

  def generatePunterWasAskedForPhotoVerification(punterId: PunterId): PunterWasAskedForPhotoVerification =
    PunterWasAskedForPhotoVerification(punterId, randomOffsetDateTime(), IDPV.generateTokenId(), IDPV.generateOpenKey())

  def generatePunterFailedPhotoVerification(punterId: PunterId): PunterFailedPhotoVerification =
    PunterFailedPhotoVerification(punterId, randomOffsetDateTime())

  def generatePunterPhotoVerificationTokenStatusWasChecked(
      punterId: PunterId): PunterPhotoVerificationTokenStatusWasChecked =
    PunterPhotoVerificationTokenStatusWasChecked(punterId, randomOffsetDateTime(), generateIDPVTokenStatus())

  def generateRegistrationEvents(punterId: PunterId): Seq[RegistrationEvent] =
    Seq(
      generatePunterSignUpStarted(punterId),
      generatePunterGotSuccessfulKYCResponse(punterId),
      generatePunterGotFailedKYCResponse(punterId),
      generatePunterWasAskedQuestions(punterId),
      generatePunterAnsweredQuestions(punterId),
      generatePunterWasAskedForPhotoVerification(punterId),
      generatePunterFailedPhotoVerification(punterId),
      generatePunterPhotoVerificationTokenStatusWasChecked(punterId))

  object KYC {
    def generateFullMatch(): KYCMatch.FullMatch =
      KYCMatch.FullMatch(generateFirstFiveDigitsOfSocialSecurityNumber())

    def generateKYCResult(kycMatch: KYCMatch): KYCResult =
      KYCResult(kycMatch, generateTransactionId(), List.empty, List.empty)

    def generateKYCResult(): KYCResult =
      randomElement(
        List(
          generateKYCResult(KYCMatch.FailMatch),
          generateKYCResult(KYCMatch.PartialMatch),
          generateKYCResult(generateFullMatch())))

    def generateKYCError(): KYCError =
      KYCError.WrongRequest(RequestError(randomElement(KYCErrorKey.values), "message"))

  }

  object KBA {

    private val questions = List(
      Question(
        QuestionId("1"),
        QuestionText("In which county do you live?"),
        AnswerChoices(List("NEWPORT NEWS CITY", "GOSPER", "RIO GRANDE", "None of the above"))),
      Question(
        QuestionId("2"),
        QuestionText("In which zip code have you previously lived?"),
        AnswerChoices(List("36101", "33971", "35425", "None of the above"))),
      Question(
        QuestionId("3"),
        QuestionText("In which city have you previously lived?"),
        AnswerChoices(List("GLADSTONE", "BIRMINGHAM", "PEACHTREE CITY", "None of the above"))),
      Question(
        QuestionId("4"),
        QuestionText("What is your name?"),
        AnswerChoices(List("Bob", "Frank", "Alex", "None of the above"))),
      Question(
        QuestionId("5"),
        QuestionText("What is your surname?"),
        AnswerChoices(List("Black", "Jones", "Peterson", "None of the above"))))

    private def generateQuestion(): Question =
      questions(Random.nextInt(questions.size))

    def generateQuestions(): List[Question] =
      List.fill(3)(generateQuestion())

    def generateAnswers(questions: List[Question]): List[Answer] =
      questions.map { question =>
        val answer = question.choices.value(Random.nextInt(question.choices.value.size))
        Answer(question.questionId, answer)
      }
  }

  object IDPV {

    def generateTokenId(): TokenId =
      TokenId(UUID.randomUUID().toString)

    def generateOpenKey(): OpenKey =
      OpenKey(UUID.randomUUID().toString)

    def generateIDPVTokenResult(): CreateIDPVTokenResult =
      CreateIDPVTokenResult(
        generateTokenId(),
        generateOpenKey(),
        TokenCreationTime(randomOffsetDateTime()),
        TokenExpirationTime(randomOffsetDateTime()))

    def randomIdType = Random.shuffle(List("passport", "idCard", "drivingLicense", "residencePermit")).head

    def generateFullMatchIDPVTokenStatusResponse(): IDPVTokenStatusResponse.FullMatch = {
      val dob = randomOffsetDateTime()
      val expirationAt = randomOffsetDateTime()
      val issueAt = randomOffsetDateTime()

      IDPVTokenStatusResponse.FullMatch(
        randomOption(IDPVUserFields.FirstName(randomString())),
        IDPVUserFields.LastName(randomString()),
        randomOption(IDPVUserFields.GivenName(randomString())),
        randomOption(IDPVUserFields.FullName(randomString())),
        randomOption(IDPVUserFields.Address(randomString())),
        randomOption(IDPVUserFields.City(randomString())),
        randomOption(IDPVUserFields.Zip(randomString())),
        randomOption(IDPVUserFields.Country(randomCountry())),
        IDPVUserFields.IdNumber(randomString()),
        IDPVUserFields.IdType(randomIdType),
        IDPVUserFields.DobDay(dob.getDayOfMonth),
        IDPVUserFields.DobMonth(dob.getMonthValue),
        IDPVUserFields.DobYear(dob.getYear),
        IDPVUserFields.ExpirationDay(expirationAt.getDayOfMonth.toString),
        IDPVUserFields.ExpirationMonth(expirationAt.getMonthValue.toString),
        IDPVUserFields.ExpirationYear(expirationAt.getYear.toString),
        IDPVUserFields.IssueDay(issueAt.getDayOfMonth.toString),
        IDPVUserFields.IssueMonth(issueAt.getMonthValue.toString),
        IDPVUserFields.IssueYear(issueAt.getYear.toString),
        IDPVUserFields.SSN(randomNonZeroNumeric().take(9).mkString))
    }
  }
}
