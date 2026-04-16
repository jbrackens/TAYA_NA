package phoenix.punters.domain

import java.time.LocalDate
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import java.util.Locale
import java.util.UUID

import scala.collection.immutable.IndexedSeq

import cats.data.NonEmptyList
import cats.data.Validated
import enumeratum.EnumEntry._
import enumeratum._
import org.apache.commons.validator.routines.EmailValidator
import org.passay._

import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.Validation.ValidationOps
import phoenix.core.validation.ValidationException
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.MaybeValidPassword
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.SocialSecurityNumberOps.FullOrPartialSSNConverters
import phoenix.utils.cryptography.UnencryptedText
import phoenix.wallets.domain.ResponsibilityCheckStatus
import phoenix.wallets.domain.ResponsibilityCheckStatus.hasToAcceptResponsibilityCheck

final case class DUPI private (value: String)

object DUPI {
  def apply(lastName: LastName, dob: DateOfBirth, last4DigitsOfSSN: Last4DigitsOfSSN): DUPI = {
    val lastNameFormatted =
      lastName.value.toLowerCase().replaceAll("[^A-Za-z]", "").concat("xxxxxxxxxxxxxxxxxxxx").take(20)
    val eegDateFormatter = DateTimeFormatter.ofPattern("ddMMYYYY")
    val dobFormatted = dob.toLocalDate.format(eegDateFormatter)
    val ssnFormatted = last4DigitsOfSSN.value
    new DUPI(lastNameFormatted + dobFormatted + ssnFormatted)
  }
}

final case class DateOfBirth(day: Int, month: Int, year: Int) {
  def toOffsetDateTime: OffsetDateTime = OffsetDateTime.of(year, month, day, 0, 0, 0, 0, ZoneOffset.UTC)
  def toLocalDate: LocalDate = toOffsetDateTime.toLocalDate
}
object DateOfBirth {
  def from(day: Int, month: Int, year: Int): Validation[DateOfBirth] = {
    Validated
      .catchNonFatal(LocalDate.of(year, month, day))
      .ensure(new IllegalArgumentException("Invalid year"))(_.getYear > 1900)
      .map(_ => DateOfBirth(day, month, year))
      .leftMap(error =>
        ValidationException(s"[Day = $day, month = $month, year = $year] is not a valid date", Some(error)))
      .toValidatedNel
  }

  def from(localDate: LocalDate): Validation[DateOfBirth] =
    from(localDate.getDayOfMonth, localDate.getMonth.getValue, localDate.getYear)

  def unsafeFrom(localDate: LocalDate): DateOfBirth =
    DateOfBirth(day = localDate.getDayOfMonth, month = localDate.getMonth.getValue, year = localDate.getYear)
}

final case class AddressLine private (value: String)
object AddressLine {
  def apply(raw: String): Validation[AddressLine] =
    Validated.condNel(raw.nonEmpty, new AddressLine(raw), ValidationException(s"Invalid AddressLine: $raw"))
  def stub(): AddressLine = new AddressLine("")
}

final case class City private (value: String)
object City {
  def apply(raw: String): Validation[City] =
    Validated.condNel(raw.nonEmpty, new City(raw), ValidationException(s"Invalid City: $raw"))
  def stub(): City = new City("")
}

final case class State private (value: String)
object State {
  def apply(raw: String): Validation[State] =
    Validated.condNel(raw.nonEmpty, new State(raw), ValidationException(s"Invalid State: $raw"))
  def stub(): State = new State("")
}

final case class Zipcode private (value: String)
object Zipcode {
  def apply(raw: String): Validation[Zipcode] =
    Validated.condNel(raw.nonEmpty, new Zipcode(raw), ValidationException(s"Invalid Zipcode: $raw"))
  def stub(): Zipcode = new Zipcode("")
}

final case class Country private (value: String)
object Country {
  def apply(raw: String): Validation[Country] =
    Validated.condNel(codes.contains(raw), new Country(raw), ValidationException(s"Invalid Country: $raw"))
  def stub(): Country = new Country("")

  private val codes: Set[String] = Locale.getISOCountries().toSet
}

final case class Address(addressLine: AddressLine, city: City, state: State, zipcode: Zipcode, country: Country)

final case class UserId(value: UUID) {
  def asPunterId: PunterId = PunterId.fromUuid(value)
}
object UserId {
  def fromString(value: String): Validation[UserId] =
    Validated
      .catchNonFatal(UserId(UUID.fromString(value)))
      .leftMap(error => ValidationException(s"Invalid value, expected java UUID, got $value", Some(error)))
      .toValidatedNel
}

final case class Username private (value: String)
object Username {
  def apply(raw: String): Validation[Username] =
    Validated.condNel(raw.nonEmpty, new Username(raw), ValidationException(s"Invalid username: $raw"))
}

final case class ValidPassword(value: String)
object ValidPassword {
  private lazy val validator: PasswordValidator = new PasswordValidator(
    new LengthRule(8, 32),
    new CharacterRule(EnglishCharacterData.UpperCase, 1),
    new CharacterRule(EnglishCharacterData.LowerCase, 1),
    new CharacterRule(EnglishCharacterData.Digit, 1),
    new CharacterRule(EnglishCharacterData.Special, 1))

  def fromString(value: String): Validation[ValidPassword] =
    Validated.condNel(
      validator.validate(new PasswordData(value)).isValid,
      ValidPassword(value),
      ValidationException(
        s"Password should be at least 8 characters, contain upper and lower cases, digits and symbols"))

  def from(maybeValidPassword: MaybeValidPassword): Validation[ValidPassword] =
    fromString(maybeValidPassword.value)

  def generateRandomPassword(): ValidPassword = {
    val len = 12
    val rand = new scala.util.Random(System.nanoTime)
    ValidPassword(rand.alphanumeric.take(len).mkString)
  }
}

final case class DeviceFingerprint(visitorId: VisitorId, confidence: Confidence)
object DeviceFingerprint {
  val empty: DeviceFingerprint = DeviceFingerprint(VisitorId.unsafe("null"), Confidence.unsafe(0.0f))
}
final case class VisitorId private (value: String)
object VisitorId {
  def apply(value: String): Validation[VisitorId] =
    Validated.condNel(value.nonEmpty, new VisitorId(value), ValidationException(s"Invalid visitorId: $value"))

  def unsafe(value: String): VisitorId = new VisitorId(value)
}
final case class Confidence private (value: Float)
object Confidence {
  def apply(value: Float): Validation[Confidence] =
    Validated.condNel(
      0 <= value && value <= 1.0,
      new Confidence(value),
      ValidationException(s"Confidence out of range: $value"))

  def unsafe(value: Float): Confidence = new Confidence(value)
}

final case class Email private (value: String) {
  override def equals(obj: Any): Boolean =
    obj match {
      case Email(anotherValue) => value.toLowerCase == anotherValue.toLowerCase
      case _                   => false
    }
  override def hashCode(): Int = super.hashCode()
}
object Email {
  private lazy val validator: EmailValidator = EmailValidator.getInstance()

  def fromString(value: String): Validation[Email] =
    Validated.condNel(
      validator.isValid(value),
      Email(value),
      ValidationException(s"Expected valid email address, got $value"))
}
final case class MobilePhoneNumber(value: String)
final case class PersonalName(title: Title, firstName: FirstName, lastName: LastName)
final case class Title private (value: String)
object Title {
  def apply(raw: String): Validation[Title] =
    Validated.condNel(raw.nonEmpty, new Title(raw), ValidationException(s"Invalid title: $raw"))
}
final case class FirstName private (value: String)
object FirstName {
  def apply(raw: String): Validation[FirstName] =
    Validated.condNel(raw.nonEmpty, new FirstName(raw), ValidationException(s"Invalid first name: $raw"))
}
final case class LastName private (value: String) {
  lazy val normalized = LastName(value.trim.toLowerCase)
}
object LastName {
  def apply(raw: String): Validation[LastName] =
    Validated.condNel(raw.nonEmpty, new LastName(raw), ValidationException(s"Invalid last name: $raw"))
}
object SocialSecurityNumber {
  type FullOrPartialSSN = Either[Last4DigitsOfSSN, FullSSN]

  final case class FullSSN private (value: String) {
    def first5Digits: First5DigitsOfSSN = new First5DigitsOfSSN(value.take(5))
    def last4Digits: Last4DigitsOfSSN = new Last4DigitsOfSSN(value.drop(5))
  }
  object FullSSN {
    def fromString(value: String): Validation[FullSSN] =
      Validated.condNel(
        value.length == 9 && value.forall(_.isDigit),
        FullSSN(value),
        ValidationException(s"Expected 9 digit number, got $value"))

    def fromRawStringUnsafe(value: String): FullSSN =
      fromString(value).toTryCombined.get

    def from(firstFive: First5DigitsOfSSN, lastFour: Last4DigitsOfSSN): FullSSN =
      new FullSSN(firstFive.value + lastFour.value)
  }

  final case class First5DigitsOfSSN(value: String)
  object First5DigitsOfSSN {
    def fromString(value: String): Validation[First5DigitsOfSSN] =
      Validated.condNel(
        value.length == 5 && value.forall(_.isDigit),
        First5DigitsOfSSN(value),
        ValidationException(s"Expected 5 digit number, got $value"))
  }

  final case class Last4DigitsOfSSN(value: String) {
    lazy val maskedForDisplay: String = s"xxxxx$value"
  }
  object Last4DigitsOfSSN {
    def fromString(value: String): Validation[Last4DigitsOfSSN] =
      Validated.condNel(
        value.length == 4 && value.forall(_.isDigit),
        Last4DigitsOfSSN(value),
        ValidationException(s"Expected 4 digit number, got $value"))
  }
}
object SocialSecurityNumberOps {
  implicit class FullOrPartialSSNConverters(ssn: Either[Last4DigitsOfSSN, FullSSN]) {
    def toLast4Digits: Last4DigitsOfSSN = ssn.fold(last4 => last4, ssn => ssn.last4Digits)
  }
}

final case class TermsAgreement(version: TermsAcceptedVersion, acceptedAt: OffsetDateTime)
final case class TermsAcceptedVersion(value: Int) {
  def isNotCurrent(currentTerms: CurrentTermsVersion): Boolean =
    value != currentTerms.value
}
object TermsAcceptedVersion {
  def fromCurrent(currentTerms: CurrentTermsVersion): TermsAcceptedVersion = TermsAcceptedVersion(currentTerms.value)
}

sealed trait Gender extends EnumEntry with UpperSnakecase
object Gender extends Enum[Gender] {
  override def values: IndexedSeq[Gender] = findValues

  def fromString(value: String): Validation[Gender] =
    Validated
      .catchNonFatal(Gender.withNameInsensitive(value))
      .leftMap(error =>
        NonEmptyList.one(
          ValidationException(s"Invalid gender value, expected ${values.mkString(", ")} got $value", Some(error))))

  final case object Male extends Gender
  final case object Female extends Gender
  final case object Other extends Gender
}

final case class UserPreferences(
    communicationPreferences: CommunicationPreferences,
    bettingPreferences: BettingPreferences)

object UserPreferences {
  def default: UserPreferences = {
    UserPreferences(
      CommunicationPreferences(
        announcements = false,
        promotions = false,
        subscriptionUpdates = false,
        signInNotifications = true),
      BettingPreferences(autoAcceptBetterOdds = false))
  }
}

final case class CommunicationPreferences(
    announcements: Boolean,
    promotions: Boolean,
    subscriptionUpdates: Boolean,
    signInNotifications: Boolean)
final case class BettingPreferences(autoAcceptBetterOdds: Boolean)

final case class UserPersonalDetails(
    name: PersonalName,
    address: Address,
    email: Email,
    phoneNumber: MobilePhoneNumber,
    dateOfBirth: DateOfBirth)

final case class UserProfile(
    userId: UserId,
    username: Username,
    name: PersonalName,
    address: Address,
    email: Email,
    phoneNumber: MobilePhoneNumber,
    dateOfBirth: DateOfBirth,
    gender: Option[Gender],
    twoFactorAuthEnabled: Boolean,
    depositLimits: CurrentAndNextLimits[DepositLimitAmount],
    stakeLimits: CurrentAndNextLimits[StakeLimitAmount],
    sessionLimits: CurrentAndNextLimits[SessionDuration],
    communicationPreferences: CommunicationPreferences,
    bettingPreferences: BettingPreferences,
    status: PunterStatus,
    coolOff: Option[CoolOffStatus],
    terms: TermsAgreement,
    hasToAcceptTerms: Boolean,
    signUpDate: OffsetDateTime,
    lastSignIn: Option[SignInTimestamp],
    hasToAcceptResponsibilityCheck: Boolean,
    ssn: SocialSecurityNumber.Last4DigitsOfSSN,
    verifiedAt: Option[OffsetDateTime],
    isTestAccount: Boolean)

object UserProfile {

  def from(
      punterProfile: PunterProfile,
      punter: Punter,
      authUser: RegisteredUserKeycloak,
      hasToAcceptTerms: Boolean,
      responsibilityCheckStatus: ResponsibilityCheckStatus): UserProfile = {
    val userId = authUser.userId
    val username = authUser.details.userName
    val name = punter.details.name
    val email = authUser.details.email
    val phone = punter.details.phoneNumber
    val address = punter.details.address
    val dateOfBirth = punter.details.dateOfBirth
    val gender = punter.details.gender
    val twoFactorAuthEnabled = punter.settings.mfaEnabled
    val depositLimits = punterProfile.depositLimits
    val stakeLimits = punterProfile.stakeLimits
    val sessionLimits = punterProfile.sessionLimits
    val communicationPreferences = punter.settings.userPreferences.communicationPreferences
    val bettingPreferences = punter.settings.userPreferences.bettingPreferences
    val status = punterProfile.status
    val coolOff = punterProfile.exclusionStatus
    val terms = punter.settings.termsAgreement
    val signUpDate = punter.settings.signUpDate
    val lastSignInData = punter.settings.lastSignIn
    val ssn = punter.ssn.toLast4Digits
    val verifiedAt = punterProfile.verifiedAt

    UserProfile(
      userId,
      username,
      name,
      address,
      email,
      phone,
      dateOfBirth,
      gender,
      twoFactorAuthEnabled,
      depositLimits,
      stakeLimits,
      sessionLimits,
      communicationPreferences,
      bettingPreferences,
      status,
      coolOff,
      terms,
      hasToAcceptTerms = hasToAcceptTerms,
      signUpDate = signUpDate,
      lastSignIn = lastSignInData.map(_.timestamp),
      hasToAcceptResponsibilityCheck = hasToAcceptResponsibilityCheck(responsibilityCheckStatus),
      ssn = ssn,
      verifiedAt = verifiedAt,
      isTestAccount = punterProfile.isTestAccount)
  }
}

sealed trait IdDocumentType extends EnumEntry with UpperSnakecase
object IdDocumentType extends Enum[IdDocumentType] {

  override def values: IndexedSeq[IdDocumentType] = findValues

  final case object Passport extends IdDocumentType
  final case object IdCard extends IdDocumentType
  final case object DrivingLicense extends IdDocumentType
  final case object ResidencePermit extends IdDocumentType
  final case object Other extends IdDocumentType
}

case class DocumentNumber private (value: String)
object DocumentNumber {
  def fromString(value: String): Validation[DocumentNumber] =
    Validated.condNel(value.nonEmpty, DocumentNumber(value), ValidationException("Document number is empty"))
  def fromUnencryptedText(unencryptedText: UnencryptedText): Validation[DocumentNumber] =
    fromString(unencryptedText.value)
}
case class IdDocument(documentType: IdDocumentType, number: DocumentNumber)
