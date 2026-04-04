package phoenix.punters.unit

import java.util.UUID

import scala.jdk.CollectionConverters._

import org.keycloak.representations.idm.UserRepresentation
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.TimeUtils.TimeUtilsLongOps
import phoenix.punters.KeycloakDataConverter
import phoenix.punters.KeycloakUser
import phoenix.punters.KeycloakUserConverter
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain._
import phoenix.support.UnsafeValueObjectExtensions.UnsafeUsernameOps
import phoenix.support.UnsafeValueObjectExtensions._

final class KeycloakConversionsSpec extends AnyWordSpecLike with Matchers {

  private def defaultRepresentation = {
    val user = new UserRepresentation()
    user.setId("72cbc6f2-f15a-436d-a600-f1b34f44d6c1")
    user.setUsername("john.doe")
    user.setEmail("john.doe@example.com")
    user.setEmailVerified(true)
    user.setRealmRoles(List("some-role").asJava)
    user
  }

  "should convert from valid keycloak representation" in {
    // given
    val keycloakRepresentation = defaultRepresentation

    // when
    val maybeUserKeycloak = KeycloakUserConverter.fromKeycloak(keycloakRepresentation)

    // then
    maybeUserKeycloak.get shouldBe RegisteredUserKeycloak(
      UserId(UUID.fromString("72cbc6f2-f15a-436d-a600-f1b34f44d6c1")),
      UserDetailsKeycloak(
        userName = Username.fromStringUnsafe("john.doe"),
        email = unsafeEmailAddress("john.doe@example.com"),
        isEmailVerified = true),
      admin = false)
  }

  "should convert from valid keycloak representation with admin role" in {
    // given
    val keycloakRepresentation = defaultRepresentation
    keycloakRepresentation.setRealmRoles(List("default-user-role", "admin").asJava)
    // when
    val maybeUserKeycloak = KeycloakUserConverter.fromKeycloak(keycloakRepresentation)

    // then
    maybeUserKeycloak.get.admin shouldBe true
  }

  "should convert from valid keycloak representation without any roles" in {
    // given
    val keycloakRepresentation = defaultRepresentation
    keycloakRepresentation.setRealmRoles(null)
    // when
    val maybeUserKeycloak = KeycloakUserConverter.fromKeycloak(keycloakRepresentation)

    // then
    maybeUserKeycloak.get.admin shouldBe false
  }

  "should convert to keycloak representation" in {
    // given
    val beforeConversion = KeycloakUser()
      .withDetails(KeycloakDataConverter.fromUserDetails(UserDetails(
        Username.fromStringUnsafe("john.doe"),
        PersonalName(
          title = Title("Mr").unsafe(),
          firstName = FirstName("John").unsafe(),
          lastName = LastName("Doe").unsafe()),
        unsafeEmailAddress("john.doe@example.com"),
        MobilePhoneNumber("+12666666666"),
        Address(
          addressLine = AddressLine("Raritan Road Unit F4B, 1255").unsafe(),
          city = City("Clark").unsafe(),
          state = State("NJ").unsafe(),
          zipcode = Zipcode("07066").unsafe(),
          country = Country("US").unsafe()),
        DateOfBirth(day = 23, month = 1, year = 1980),
        Some(Gender.Male),
        Last4DigitsOfSSN.fromString("2137").unsafe(),
        twoFactorAuthEnabled = true,
        UserPreferences(
          CommunicationPreferences(
            announcements = true,
            promotions = false,
            subscriptionUpdates = false,
            signInNotifications = true),
          BettingPreferences(autoAcceptBetterOdds = true)),
        termsAgreement = TermsAgreement(TermsAcceptedVersion(10), acceptedAt = 1610467327000L.toUtcOffsetDateTime),
        signUpDate = 1608817316000L.toUtcOffsetDateTime,
        isRegistrationVerified = false,
        isPhoneNumberVerified = true,
        isEmailVerified = true)))
      .withPassword("whatever")
      .enabled(true)
      .emailVerified(true)
      .accountVerified(true)

    // when
    val converted = beforeConversion.value

    // then
    converted.getUsername shouldBe "john.doe"
    converted.getEmail shouldBe "john.doe@example.com"
    converted.getCredentials.asScala.head.getValue shouldBe "whatever"
    converted.isEnabled shouldBe true
    converted.isEmailVerified shouldBe true
  }

  private def unsafeEmailAddress(value: String): Email =
    Email.fromString(value).getOrElse(throw new IllegalArgumentException(s"Invalid email address $value"))
}
