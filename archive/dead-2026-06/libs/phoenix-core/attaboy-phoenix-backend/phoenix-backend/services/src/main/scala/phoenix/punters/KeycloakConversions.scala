package phoenix.punters

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._
import scala.util.Try

import cats.data.ValidatedNel
import cats.data._
import org.keycloak.representations.idm.CredentialRepresentation
import org.keycloak.representations.idm.UserRepresentation
import org.slf4j.LoggerFactory

import phoenix.core.ScalaObjectUtils._
import phoenix.core.validation.Validation._
import phoenix.http.core.IpAddress
import phoenix.keycloak.KeycloakUtils._
import phoenix.keycloak.{KeycloakPunterAttributes => Attributes}
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.SocialSecurityNumberOps.FullOrPartialSSNConverters
import phoenix.punters.domain.UserDetails
import phoenix.punters.domain._

object KeycloakUserConverter {

  private val log = LoggerFactory.getLogger(this.objectName)
  private val adminRoleName = "admin"

  def fromKeycloak(keycloakUser: UserRepresentation): Option[RegisteredUserKeycloak] =
    (for {
      userId <- UserId.fromString(keycloakUser.getId).toTryCombined
      username <- Username(keycloakUser.getUsername).leftMap(_.head).toEither.toTry
      email <- Email.fromString(keycloakUser.getEmail).leftMap(_.head).toEither.toTry
      isAdmin = hasAdminRole(keycloakUser)
    } yield RegisteredUserKeycloak(
      userId,
      UserDetailsKeycloak(userName = username, email = email, keycloakUser.isEmailVerified),
      isAdmin)).toOption

  def fromKeycloakWithLegacyFields(keycloakUser: UserRepresentation): Option[RegisteredUserKeycloakWithLegacyFields] =
    fromKeycloak(keycloakUser).map { userKeycloak =>
      val ssn1 = ssn(keycloakUser)
      val signIn = lastSignIn(keycloakUser)
      val numberVerified = isPhoneNumberVerified(keycloakUser)
      val twoFactorAuthEnabledOpt = twoFactorAuthEnabled(keycloakUser)
      val preferences = userPreferences(keycloakUser)
      val terms = termsAgreement(keycloakUser).toOption
      val signUp = signUpDate(keycloakUser).toOption
      val registrationVerified = isRegistrationVerified(keycloakUser)
      val accountVerified = verified(keycloakUser)
      log.info(
        s"fromKeycloakWithLegacyFields: ${userKeycloak.userId} got legacy $ssn1, $signIn, $numberVerified from keycloak")
      RegisteredUserKeycloakWithLegacyFields(
        userKeycloak,
        ssn1,
        signIn,
        numberVerified,
        preferences,
        terms,
        signUp,
        registrationVerified,
        accountVerified,
        twoFactorAuthEnabledOpt)
    }

  private def ssn(keycloakUser: UserRepresentation): Option[Last4DigitsOfSSN] = {
    keycloakUser.optionalStringAttribute(Attributes.SSN).flatMap(Last4DigitsOfSSN.fromString(_).toOption)
  }

  private def twoFactorAuthEnabled(keycloakUser: UserRepresentation): Option[Boolean] =
    keycloakUser.booleanAttributeOrDefault(Attributes.TwoFactorAuthEnabled, default = true)

  private def verified(keycloakUser: UserRepresentation): Option[Boolean] =
    keycloakUser.booleanAttributeOrDefault(Attributes.AccountVerified, default = false)

  private def userPreferences(keycloakUser: UserRepresentation): Option[UserPreferences] =
    for {
      announcements <- keycloakUser.booleanAttributeOrDefault(Attributes.Announcements, default = true)
      promotions <- keycloakUser.booleanAttributeOrDefault(Attributes.Promotions, default = true)
      subscriptionUpdates <- keycloakUser.booleanAttributeOrDefault(Attributes.SubscriptionUpdates, default = true)
      signInNotifications <- keycloakUser.booleanAttributeOrDefault(Attributes.SignInNotifications, default = true)
      autoAcceptBetterOdds <- keycloakUser.booleanAttributeOrDefault(Attributes.AutoAcceptBetterOdds, default = true)
    } yield UserPreferences(
      CommunicationPreferences(announcements, promotions, subscriptionUpdates, signInNotifications),
      BettingPreferences(autoAcceptBetterOdds))

  private def lastSignIn(keycloakUser: UserRepresentation): Option[LastSignInData] =
    for {
      lastSignInTimestamp <-
        keycloakUser.optionalDateTimeAttribute(Attributes.LastSignInTimestamp).toOption.flatten.map(SignInTimestamp)
      lastSignInIpAddress <- keycloakUser.optionalStringAttribute(Attributes.LastSignInIpAddress).map(IpAddress)
    } yield LastSignInData(lastSignInTimestamp, lastSignInIpAddress)

  private def signUpDate(keycloakUser: UserRepresentation): Try[OffsetDateTime] =
    keycloakUser.dateTimeAttribute(Attributes.SignUpDate)

  private def termsAgreement(user: UserRepresentation): Try[TermsAgreement] =
    for {
      termsAgreementVersion <- user.intAttribute(Attributes.TermsAcceptedVersionKey).map(TermsAcceptedVersion.apply)
      termsAcceptedAt <- user.dateTimeAttribute(Attributes.TermsAcceptedAt)
    } yield TermsAgreement(termsAgreementVersion, termsAcceptedAt)

  private def isRegistrationVerified(user: UserRepresentation): Option[Boolean] =
    user.booleanAttributeOrDefault(Attributes.IsRegistrationVerified, default = false)

  private def hasAdminRole(user: UserRepresentation): Boolean = {
    Option(user.getRealmRoles).exists(_.asScala.contains(adminRoleName))
  }

  private def isPhoneNumberVerified(user: UserRepresentation): Option[Boolean] =
    user.booleanAttributeOrDefault(Attributes.IsPhoneNumberVerified, default = false)
}

final case class KeycloakUser(value: UserRepresentation) {
  import KeycloakUser.passwordCredentials

  def withDetails(details: UserDetailsKeycloak): KeycloakUser = {
    value.setUsername(details.userName.value)
    value.setEmail(details.email.value.toLowerCase)
    value.setEmailVerified(details.isEmailVerified)
    this
  }

  def enabled(isEnabled: Boolean): KeycloakUser = {
    value.setEnabled(isEnabled)
    this
  }

  def emailVerified(isVerified: Boolean): KeycloakUser = {
    value.setEmailVerified(isVerified)
    this
  }

  def accountVerified(isVerified: Boolean): KeycloakUser = {
    value.singleAttribute(Attributes.AccountVerified, isVerified.toString)
    this
  }

  def phoneNumberVerified(isVerified: Boolean): KeycloakUser = {
    value.singleAttribute(Attributes.IsPhoneNumberVerified, isVerified.toString)
    this
  }

  def withPassword(password: String): KeycloakUser = {
    value.setCredentials(List(passwordCredentials(password)).asJava)
    this
  }

  def withLastSignInAt(signInData: LastSignInData): KeycloakUser = {
    value.singleAttribute(Attributes.LastSignInTimestamp, signInData.timestamp.value.toInstant.toEpochMilli.toString)
    value.singleAttribute(Attributes.LastSignInIpAddress, signInData.ipAddress.value)
    this
  }

  def includedInGroup(groupName: String): KeycloakUser = {
    value.setGroups(List(groupName).asJava)
    this
  }
}

object KeycloakUser {
  def apply(): KeycloakUser = KeycloakUser(new UserRepresentation())

  def passwordCredentials(password: String): CredentialRepresentation = {
    val credentials = new CredentialRepresentation()
    credentials.setTemporary(false)
    credentials.setType(CredentialRepresentation.PASSWORD)
    credentials.setValue(password)
    credentials
  }
}

final case class PunterIdNotTheSame(reason: String)

sealed trait KeycloakDbMergeValidationAcceptable {
  val reason: String
}
final case class UserNameNotTheSame(reason: String) extends KeycloakDbMergeValidationAcceptable
final case class EmailNotTheSame(reason: String) extends KeycloakDbMergeValidationAcceptable

object KeycloakDataConverter {
  type MatchError = String
  private val log = LoggerFactory.getLogger(getClass)

  def enrichKeycloakUser[ERR](
      kcUser: RegisteredUserKeycloak,
      puntersRepository: PuntersRepository,
      missingInPuntersRepository: => ERR)(implicit ec: ExecutionContext): EitherT[Future, ERR, RegisteredUser] =
    for {
      punter <- puntersRepository.findByPunterId(kcUser.userId.asPunterId).toRight[ERR](missingInPuntersRepository)
      registeredUser <- mergeAndLog[ERR](kcUser, punter, missingInPuntersRepository)
    } yield registeredUser

  def toRegisteredUser(kcUser: RegisteredUserKeycloak, dbUser: Punter): Either[MatchError, RegisteredUser] = {
    lazy val merged = {
      validateMergeIssues(kcUser, dbUser).leftMap(issues =>
        issues.map { mergeIssue =>
          log.warn(s"punterId:${dbUser.punterId} has different data in keycloak vs db: $mergeIssue")
        })
      RegisteredUser(
        userId = kcUser.userId,
        details = toUserDetails(dbUser, kcUser),
        verified = dbUser.settings.isAccountVerified,
        admin = kcUser.admin,
        lastSignIn = dbUser.settings.lastSignIn)
    }

    Either.cond(kcUser.userId.asPunterId == dbUser.punterId, merged, PunterIdNotTheSame).left.map { err =>
      val errorMessage = s"${err.getClass.getSimpleName}: ${kcUser.userId.asPunterId} <> ${dbUser.punterId}"
      log.error(errorMessage, new RuntimeException("keycloak-db punter merge error - different ids"))
      errorMessage
    }
  }

  def toKeycloakUser(user: RegisteredUser): RegisteredUserKeycloak =
    RegisteredUserKeycloak(user.userId, fromUserDetails(user.details), user.admin)

  def mergeAndLog[ERR](kcUser: RegisteredUserKeycloak, punter: Punter, missingInPuntersRepository: => ERR)(implicit
      ec: ExecutionContext) = {
    EitherT.fromEither[Future](KeycloakDataConverter.toRegisteredUser(kcUser, punter)).leftMap { err =>
      log.error(s"Keycloak-punter data mismatch: punterId=${punter.punterId}, error: $err")
      missingInPuntersRepository
    }
  }

  private def validateMergeIssues(
      kcUser: RegisteredUserKeycloak,
      dbUser: Punter): ValidatedNel[KeycloakDbMergeValidationAcceptable, Unit] = {
    val userName = Validated.condNel(
      kcUser.details.userName == dbUser.details.userName,
      (),
      UserNameNotTheSame(s"userName kcUser=${kcUser.details.userName}, db=${dbUser.details.userName} are not the same"))

    val email = Validated.condNel(
      kcUser.details.email == dbUser.details.email,
      (),
      EmailNotTheSame(s"${kcUser.details.email} ${dbUser.details.email}"))

    userName.combine(email)
  }

  private def toUserDetails(dbUser: Punter, kcUser: RegisteredUserKeycloak): UserDetails =
    UserDetails(
      userName = dbUser.details.userName,
      name = dbUser.details.name,
      email = dbUser.details.email,
      phoneNumber = dbUser.details.phoneNumber,
      address = dbUser.details.address,
      dateOfBirth = dbUser.details.dateOfBirth,
      gender = dbUser.details.gender,
      ssn = dbUser.ssn.toLast4Digits,
      twoFactorAuthEnabled = dbUser.settings.mfaEnabled,
      userPreferences = dbUser.settings.userPreferences,
      termsAgreement = dbUser.settings.termsAgreement,
      signUpDate = dbUser.settings.signUpDate,
      isRegistrationVerified = dbUser.settings.isRegistrationVerified,
      isPhoneNumberVerified = dbUser.details.isPhoneNumberVerified,
      kcUser.details.isEmailVerified)

  def fromUserDetails(ud: UserDetails): UserDetailsKeycloak =
    UserDetailsKeycloak(userName = ud.userName, email = ud.email, isEmailVerified = ud.isEmailVerified)
}
