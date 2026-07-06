package phoenix.punters.domain

import java.time.OffsetDateTime

import phoenix.http.core.IpAddress
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN

final case class RegisteredUser(
    userId: UserId,
    details: UserDetails,
    verified: Boolean,
    admin: Boolean,
    lastSignIn: Option[LastSignInData]) {
  def withDetails(f: UserDetails => UserDetails): RegisteredUser =
    copy(details = f(details))
}

final case class UserDetails(
    userName: Username,
    name: PersonalName,
    email: Email,
    phoneNumber: MobilePhoneNumber,
    address: Address,
    dateOfBirth: DateOfBirth,
    gender: Option[Gender],
    ssn: Last4DigitsOfSSN,
    twoFactorAuthEnabled: Boolean,
    userPreferences: UserPreferences,
    termsAgreement: TermsAgreement,
    signUpDate: OffsetDateTime,
    isRegistrationVerified: Boolean,
    isPhoneNumberVerified: Boolean,
    isEmailVerified: Boolean)

final case class RegisteredUserKeycloak(userId: UserId, details: UserDetailsKeycloak, admin: Boolean) {
  def withDetails(f: UserDetailsKeycloak => UserDetailsKeycloak): RegisteredUserKeycloak =
    copy(details = f(details))
}

final case class UserDetailsKeycloak(userName: Username, email: Email, isEmailVerified: Boolean)

final case class RegisteredUserAndPunter(registeredUser: RegisteredUser, punter: Punter)

final case class RegisteredUserKeycloakWithLegacyFields(
    registeredUserKeycloak: RegisteredUserKeycloak,
    last4DigitsOfSSN: Option[Last4DigitsOfSSN],
    lastSignIn: Option[LastSignInData],
    isPhoneNumberVerified: Option[Boolean],
    userPreferences: Option[UserPreferences],
    termsAgreement: Option[TermsAgreement],
    signUpDate: Option[OffsetDateTime],
    isRegistrationVerified: Option[Boolean],
    isAccountVerified: Option[Boolean],
    twoFactorAuthEnabled: Option[Boolean])

final case class LastSignInData(timestamp: SignInTimestamp, ipAddress: IpAddress)

final case class SignInTimestamp(value: OffsetDateTime)
