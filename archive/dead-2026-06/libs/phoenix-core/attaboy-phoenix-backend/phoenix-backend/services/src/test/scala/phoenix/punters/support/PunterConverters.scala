package phoenix.punters.support

import phoenix.punters.KeycloakDataConverter
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.LastSignInData
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PunterPersonalDetails
import phoenix.punters.domain.PunterSettings
import phoenix.punters.domain.RegisteredUser
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.SocialSecurityNumber.FullOrPartialSSN
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.UserDetails
import phoenix.punters.domain.UserDetailsKeycloak

object PunterConverters {

  def createPunter(
      punterId: PunterId,
      userDetails: UserDetails,
      ssn: FullOrPartialSSN,
      lastSignIn: Option[LastSignInData],
      isAccountVerified: Boolean): Punter = {
    val personalDetails = createPersonalDetails(userDetails)
    val settings = createPunterSettings(userDetails, lastSignIn, isAccountVerified)
    Punter(punterId, personalDetails, ssn, settings)
  }

  def createPunter(user: RegisteredUser, ssn: Option[FullSSN]): Punter =
    createPunter(user.userId.asPunterId, user.details, ssn.toRight(user.details.ssn), user.lastSignIn, user.verified)

  def createPunter(user: RegisteredUser): Punter =
    createPunter(user.userId.asPunterId, user.details, Left(user.details.ssn), user.lastSignIn, user.verified)

  def createPunterSettings(
      details: UserDetails,
      lastSignIn: Option[LastSignInData],
      isAccountVerified: Boolean): PunterSettings =
    PunterSettings(
      lastSignIn,
      details.userPreferences,
      details.termsAgreement,
      details.signUpDate,
      details.isRegistrationVerified,
      isAccountVerified,
      details.twoFactorAuthEnabled)

  def createPersonalDetails(details: UserDetails): PunterPersonalDetails =
    PunterPersonalDetails(
      details.userName,
      details.name,
      details.email,
      details.phoneNumber,
      details.address,
      details.dateOfBirth,
      details.gender,
      isTestAccount = false,
      document = None,
      details.isPhoneNumberVerified)

  implicit class RegisteredUserOps(user: RegisteredUser) {
    def toKeycloakUser(): RegisteredUserKeycloak = KeycloakDataConverter.toKeycloakUser(user)
    def toPunter(fullSSN: Option[FullSSN] = None): Punter = createPunter(user, fullSSN)
  }

  implicit class RegisteredUserDetailsOps(userDetails: UserDetails) {
    def toKeycloakDetails(): UserDetailsKeycloak = KeycloakDataConverter.fromUserDetails(userDetails)
  }
}
