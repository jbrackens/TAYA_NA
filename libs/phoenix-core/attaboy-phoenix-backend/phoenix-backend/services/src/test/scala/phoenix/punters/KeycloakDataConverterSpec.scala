package phoenix.punters

import cats.data.ValidatedNel
import org.scalatest.EitherValues
import org.scalatest.PrivateMethodTester
import org.scalatest.matchers.must.Matchers.include
import org.scalatest.matchers.should.Matchers.convertToAnyShouldWrapper
import org.scalatest.wordspec.AnyWordSpec

import phoenix.punters.PunterDataGenerator.generatePunterWithSSN
import phoenix.punters.PunterDataGenerator.generateRegisteredUserKeycloak
import phoenix.punters.domain.Email
import phoenix.punters.domain.SocialSecurityNumberOps.FullOrPartialSSNConverters

class KeycloakDataConverterSpec extends AnyWordSpec with EitherValues with PrivateMethodTester {
  "should converter kc user and punter to registered user" in {
    //given
    val kcUser = generateRegisteredUserKeycloak()
    val dbUser = generatePunterWithSSN(
      punterId = kcUser.userId.asPunterId,
      maybeEmail = Some(Email(kcUser.details.email.value.toUpperCase)),
      maybeUsername = Some(kcUser.details.userName))
    //when
    val registeredUserCond = KeycloakDataConverter.toRegisteredUser(kcUser, dbUser)

    //then
    registeredUserCond.isRight shouldBe true
    val registeredUser = registeredUserCond.value
    registeredUser.userId shouldBe kcUser.userId
    val details = registeredUser.details
    details.userName shouldBe kcUser.details.userName
    details.userName shouldBe dbUser.details.userName
    details.name shouldBe dbUser.details.name
    details.email shouldBe dbUser.details.email
    details.email shouldBe kcUser.details.email
    details.phoneNumber shouldBe dbUser.details.phoneNumber
    details.address shouldBe dbUser.details.address
    details.dateOfBirth shouldBe dbUser.details.dateOfBirth
    details.gender shouldBe dbUser.details.gender
    details.ssn shouldBe dbUser.ssn.toLast4Digits
    details.twoFactorAuthEnabled shouldBe dbUser.settings.mfaEnabled
    details.userPreferences shouldBe dbUser.settings.userPreferences
    details.termsAgreement shouldBe dbUser.settings.termsAgreement
    details.signUpDate shouldBe dbUser.settings.signUpDate
    details.isRegistrationVerified shouldBe dbUser.settings.isRegistrationVerified
    details.isPhoneNumberVerified shouldBe dbUser.details.isPhoneNumberVerified
  }

  "should report error when punterId is not matching" in {
    //given
    val kcUser = generateRegisteredUserKeycloak()
    val dbUser =
      generatePunterWithSSN(maybeEmail = Some(kcUser.details.email), maybeUsername = Some(kcUser.details.userName))
    //when
    val registeredUserCond = KeycloakDataConverter.toRegisteredUser(kcUser, dbUser)
    //then
    registeredUserCond.isLeft shouldBe true
    registeredUserCond.left.value should include(PunterIdNotTheSame.toString())
  }

  "should report issue when username or email is not matching" in {
    //given
    val kcUser = generateRegisteredUserKeycloak()
    val dbUser = generatePunterWithSSN()
    //when
    val validateMergeIssues =
      PrivateMethod[ValidatedNel[KeycloakDbMergeValidationAcceptable, Unit]](Symbol("validateMergeIssues"))
    val out = KeycloakDataConverter.invokePrivate(validateMergeIssues(kcUser, dbUser))

    //then
    out.isInvalid shouldBe true
    val matchError = out.toEither.left.value.toList.mkString(", ")
    matchError should include(EmailNotTheSame.toString())
    matchError should include(UserNameNotTheSame.toString())
  }
}
